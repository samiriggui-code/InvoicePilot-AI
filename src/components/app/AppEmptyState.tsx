import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type EmptyAction = {
  label: string;
  to: string;
  variant?: "default" | "outline" | "secondary";
};

export function AppEmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  illustrationSrc,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: EmptyAction[];
  /** Optional Metronic illustration under `/media/illustrations` */
  illustrationSrc?: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        {illustrationSrc ? (
          <EmptyMedia className="mb-2 bg-transparent">
            <img
              src={illustrationSrc}
              alt=""
              className="h-28 w-auto max-w-[220px] object-contain dark:opacity-90"
            />
          </EmptyMedia>
        ) : (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions.length > 0 ? (
        <EmptyContent className="flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.to + action.label}
              asChild
              variant={action.variant ?? "default"}
              size="sm"
            >
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ))}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
