import { Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Layout centré — Metronic `layouts/error/layout`. */
export function ErrorLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-[95vh] grow flex-col items-center justify-center px-4 py-10">
      {children ?? <Outlet />}
    </div>
  );
}
