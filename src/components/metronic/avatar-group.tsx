import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toAbsoluteUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export type AvatarItem = {
  path?: string;
  filename?: string;
  fallback?: string;
  variant?: string;
};

export type Avatars = AvatarItem[];

type AvatarGroupProps = {
  size?: string;
  group: AvatarItem[];
  more?: { variant?: string; number?: number | string; label?: string };
  className?: string;
};

/** Groupe d’avatars — Metronic `partials/common/avatar-group` (sans motion). */
export function AvatarGroup({ size, group, more, className }: AvatarGroupProps) {
  const avatarSize = size ?? "size-7";

  return (
    <div className={cn("flex -space-x-2", className)}>
      {group.map((each, index) => (
        <Avatar key={index} className={cn(avatarSize)}>
          {each.filename || each.path ? (
            <AvatarImage
              src={toAbsoluteUrl(each.path || `/media/avatars/${each.filename}`)}
              alt=""
              className={cn("border border-background hover:z-10", each.variant)}
            />
          ) : null}
          {each.fallback ? (
            <AvatarFallback
              className={cn(
                "relative border border-background text-[11px] hover:z-10",
                avatarSize,
                each.variant,
              )}
            >
              {each.fallback}
            </AvatarFallback>
          ) : null}
        </Avatar>
      ))}
      {more ? (
        <span
          className={cn(
            "relative flex shrink-0 cursor-default items-center justify-center rounded-full border border-background text-[11px] font-semibold leading-none hover:z-10",
            avatarSize,
            more.variant,
          )}
        >
          +{more.number ?? more.label}
        </span>
      ) : null}
    </div>
  );
}
