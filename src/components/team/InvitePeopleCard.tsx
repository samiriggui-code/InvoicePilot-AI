import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cancelTeamInvite,
  inviteTeamMember,
  listTeamMembers,
  resendTeamInvite,
  type TeamInviteRow,
} from "@/fns/team";
import { INVITABLE_ROLES, MEMBER_ROLE_LABELS } from "@/lib/team-roles";
import type { MemberRole } from "@/lib/types";

/** Invitation e-mail — Metronic invite-people + Mailpit. */
export function InvitePeopleCard({
  canManage,
  refreshKey,
  onInvited,
}: {
  canManage: boolean;
  refreshKey?: number;
  onInvited?: () => void;
}) {
  const invite = useServerFn(inviteTeamMember);
  const list = useServerFn(listTeamMembers);
  const cancel = useServerFn(cancelTeamInvite);
  const resend = useServerFn(resendTeamInvite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("COLLABORATOR");
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [invites, setInvites] = useState<TeamInviteRow[]>([]);

  async function loadInvites() {
    const data = await list();
    setInvites(data.invites);
  }

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inviter des collègues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seuls le propriétaire et les administrateurs peuvent inviter des membres. L’e-mail part
            via Mailpit en local (SMTP 1025).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inviter des collègues</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="flex flex-wrap items-baseline gap-2.5 lg:flex-nowrap">
          <Label className="w-full max-w-32">E-mail</Label>
          <Input
            type="email"
            placeholder="colleague@entreprise.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="grow"
          />
        </div>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <Label className="w-full max-w-32">Rôle</Label>
          <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
            <SelectTrigger className="max-w-xs grow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVITABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {MEMBER_ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {invites.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Invitations en attente</p>
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {MEMBER_ROLE_LABELS[inv.role]} · expire{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="warning-light" size="sm">
                      En attente
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Renvoyer l’e-mail"
                      disabled={resendingId === inv.id}
                      onClick={() => {
                        void (async () => {
                          setResendingId(inv.id);
                          const res = await resend({ data: { inviteId: inv.id } });
                          setResendingId(null);
                          if (!res.success) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success(res.message);
                          void loadInvites();
                        })();
                      }}
                    >
                      {resendingId === inv.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        void (async () => {
                          const res = await cancel({ data: { inviteId: inv.id } });
                          if (!res.success) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Invitation annulée");
                          void loadInvites();
                        })();
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="justify-center">
        <Button
          disabled={loading || !email.trim()}
          onClick={() => {
            void (async () => {
              setLoading(true);
              const res = await invite({ data: { email, role } });
              setLoading(false);
              if (!res.success) {
                toast.error(res.error);
                return;
              }
              if ("mailSent" in res && res.mailSent === false) {
                toast.warning(res.message);
              } else {
                toast.success(res.message);
              }
              setEmail("");
              void loadInvites();
              onInvited?.();
            })();
          }}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SquarePlus className="size-4" />
          )}
          Inviter
        </Button>
      </CardFooter>
    </Card>
  );
}
