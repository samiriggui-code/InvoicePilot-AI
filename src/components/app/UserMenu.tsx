import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { KeenIcon } from "@/components/keenicons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lockSession, logoutUser } from "@/fns/auth";
import { listMemberships, switchOrganization, type MembershipItem } from "@/fns/cabinet";
import { getNotificationCounts } from "@/fns/notifications";
import { resolveUserAvatar } from "@/lib/media";
import { planLabel, type WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";

export function UserMenu({
  workspace,
  className,
  collapsed = false,
  dropdownSide = "bottom",
}: {
  workspace: WorkspaceContext;
  className?: string;
  collapsed?: boolean;
  dropdownSide?: "top" | "bottom";
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const listFn = useServerFn(listMemberships);
  const switchFn = useServerFn(switchOrganization);
  const countsFn = useServerFn(getNotificationCounts);
  const plan = workspace.subscription?.plan;
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [unread, setUnread] = useState(0);
  const initials = (workspace.user.name || workspace.user.email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarSrc = resolveUserAvatar({
    email: workspace.user.email,
    avatarKey: workspace.user.avatarKey,
  });

  useEffect(() => {
    void (async () => {
      try {
        setMemberships(await listFn());
      } catch {
        setMemberships([]);
      }
    })();
  }, [listFn, workspace.organization.id]);

  useEffect(() => {
    void (async () => {
      try {
        const c = await countsFn();
        setUnread(c.unread + c.alerts);
      } catch {
        setUnread(0);
      }
    })();
  }, [countsFn, workspace.organization.id, workspace.user.id]);

  async function handleLogout() {
    await logoutUser();
    await navigate({ to: "/login" });
  }

  async function handleLock() {
    await lockSession();
    await navigate({ to: "/session-locked" });
  }

  async function handleSwitch(organizationId: string) {
    if (organizationId === workspace.organization.id) return;
    const res = await switchFn({ data: { organizationId } });
    if (res.success) {
      await router.invalidate();
      window.location.href = "/dashboard";
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center rounded-lg border border-transparent text-left transition-colors hover:border-border/80 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed ? "size-10 justify-center p-0" : "w-full gap-2.5 px-2 py-2",
          className,
        )}
        title={collapsed ? workspace.user.name : undefined}
      >
        <span className="relative shrink-0">
          <Avatar className="size-8">
            <AvatarImage src={avatarSrc} alt={workspace.user.name} />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {unread > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-destructive" />
          ) : null}
        </span>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{workspace.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {workspace.organization.tradeName ?? workspace.organization.legalName}
              </p>
            </div>
            <KeenIcon icon="down" className="text-sm text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={dropdownSide} className="w-72" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={avatarSrc} alt={workspace.user.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">{workspace.user.name}</p>
              <p className="text-xs text-muted-foreground">{workspace.user.email}</p>
              {plan && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {planLabel(plan)}
                  {workspace.subscription?.status === "TRIALING" ? " · Essai" : ""}
                  {" · "}
                  {workspace.organization.role}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        {memberships.length > 1 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Dossiers cabinet
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.organizationId}
                  onClick={() => void handleSwitch(m.organizationId)}
                  className="gap-2"
                >
                  <KeenIcon icon="briefcase" className="text-base" />
                  <span className="min-w-0 flex-1 truncate">{m.tradeName ?? m.legalName}</span>
                  {m.isActive ? <KeenIcon icon="check" className="text-base text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/profile">
              <KeenIcon icon="user" className="text-base" />
              Mon profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <KeenIcon icon="setting-2" className="text-base" />
              Mes paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/billing">
              <KeenIcon icon="credit-cart" className="text-base" />
              Mon abonnement
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/team">
              <KeenIcon icon="people" className="text-base" />
              Mon équipe
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/" target="_blank" rel="noreferrer">
            <KeenIcon icon="exit-right" className="text-base" />
            Site marketing
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleLock()}>
          <KeenIcon icon="lock" className="text-base" />
          Verrouiller la session
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => void handleLogout()}
        >
          <KeenIcon icon="entrance-right" className="text-base" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
