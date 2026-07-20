import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import * as LucideIcons from "lucide-react";

type IconPlaceholderProps = LucideProps & {
  lucide?: string;
  tabler?: string;
  hugeicons?: string;
  phosphor?: string;
  remixicon?: string;
};

/**
 * ReUI registry demos reference a multi-library icon placeholder.
 * InvoicePilot uses lucide only — resolve the `lucide` name when present.
 */
export function IconPlaceholder({ lucide, className, ...props }: IconPlaceholderProps) {
  const icons = LucideIcons as unknown as Record<string, ComponentType<LucideProps>>;
  const Icon = (lucide && icons[lucide]) || LucideIcons.Circle;

  return <Icon className={className} {...props} />;
}
