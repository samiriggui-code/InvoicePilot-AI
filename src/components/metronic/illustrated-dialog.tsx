import type { ComponentProps, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { media, toAbsoluteUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type IllustratedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Illustration Metronic (ex. 21 welcome, 23 deactivated) */
  illustration: number;
  title: string;
  description: ReactNode;
  children: ReactNode;
  hideCloseButton?: boolean;
  className?: string;
  onPointerDownOutside?: ComponentProps<typeof DialogContent>["onPointerDownOutside"];
  onEscapeKeyDown?: ComponentProps<typeof DialogContent>["onEscapeKeyDown"];
};

/**
 * Shell dialog illu + titre + CTA — Metronic welcome / account-deactivated.
 */
export function IllustratedDialog({
  open,
  onOpenChange,
  illustration,
  title,
  description,
  children,
  hideCloseButton,
  className,
  onPointerDownOutside,
  onEscapeKeyDown,
}: IllustratedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={hideCloseButton}
        className={cn("max-h-[95vh] max-w-[500px] gap-0 overflow-y-auto sm:rounded-xl", className)}
        onPointerDownOutside={onPointerDownOutside}
        onEscapeKeyDown={onEscapeKeyDown}
      >
        <DialogHeader className="sr-only border-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {typeof description === "string" ? description : title}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center px-2 pb-10 pt-8 text-center">
          <div className="mb-9">
            <img
              src={toAbsoluteUrl(media.illustration(illustration))}
              alt=""
              className="mx-auto max-h-[150px] dark:hidden"
            />
            <img
              src={toAbsoluteUrl(media.illustration(illustration, true))}
              alt=""
              className="mx-auto hidden max-h-[150px] dark:block"
            />
          </div>
          <h3 className="mb-3 text-lg font-semibold tracking-tight">{title}</h3>
          <div className="mb-7 max-w-sm text-sm text-muted-foreground">{description}</div>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
