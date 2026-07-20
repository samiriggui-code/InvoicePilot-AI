import { forwardRef } from "react";

import { cn } from "@/lib/utils";

import type { KeeniconsProps } from "./types";

/** Icône Metronic KeenIcons (`ki-filled` / `ki-outline` / …). */
export const KeenIcon = forwardRef<HTMLElement, KeeniconsProps>(
  ({ icon, style = "filled", className = "", ...props }, ref) => {
    return <i ref={ref} {...props} className={cn(`ki-${style}`, `ki-${icon}`, className)} />;
  },
);

KeenIcon.displayName = "KeenIcon";
