import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";

import { HexagonBadge } from "@/components/ui/hexagon-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BadgeProps = {
  size: string;
  badge: ReactNode;
  fill: string;
  stroke: string;
};

type CardRoleProps = {
  badge: BadgeProps;
  title: string;
  subTitle: string;
  description: string;
  team: string;
  href?: string;
};

/** Carte rôle — Metronic `partials/cards/card-role`. */
export function CardRole({
  badge,
  title,
  subTitle,
  description,
  team,
  href = "/team/permissions",
}: CardRoleProps) {
  return (
    <Card className="flex flex-col gap-5 p-5 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2.5">
          <HexagonBadge {...badge} />
          <div className="flex flex-col">
            <Link
              to={href}
              className="mb-px text-base font-medium text-foreground hover:text-primary"
            >
              {title}
            </Link>
            <span className="text-sm text-muted-foreground">{subTitle}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/team/permissions">Voir les permissions</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/team">Voir les membres</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <span className="text-sm text-foreground">{team}</span>
    </Card>
  );
}
