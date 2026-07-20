import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

type CardContextType = {
  variant: "default" | "accent";
};

const CardContext = React.createContext<CardContextType>({ variant: "default" });

function useCardContext() {
  return React.useContext(CardContext);
}

const cardVariants = cva("flex flex-col items-stretch rounded-xl text-card-foreground", {
  variants: {
    variant: {
      default: "border border-border bg-card shadow-xs",
      accent: "bg-muted p-1 shadow-xs",
    },
  },
  defaultVariants: { variant: "default" },
});

const cardHeaderVariants = cva(
  [
    "flex flex-col gap-1.5 border-b border-border px-5 py-4",
    "has-[[data-slot=card-toolbar]]:min-h-14 has-[[data-slot=card-toolbar]]:flex-row",
    "has-[[data-slot=card-toolbar]]:flex-wrap has-[[data-slot=card-toolbar]]:items-center",
    "has-[[data-slot=card-toolbar]]:justify-between has-[[data-slot=card-toolbar]]:gap-2.5",
    "has-[[data-slot=card-toolbar]]:py-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "",
        accent: "border-b-0",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const cardContentVariants = cva("grow p-5", {
  variants: {
    variant: {
      default: "",
      accent: "rounded-t-xl bg-card [&:last-child]:rounded-b-xl",
    },
  },
  defaultVariants: { variant: "default" },
});

const cardTableVariants = cva(
  "grid min-w-0 grow overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
  {
    variants: {
      variant: {
        default: "",
        accent: "rounded-xl bg-card",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const cardFooterVariants = cva("flex min-h-14 items-center px-5", {
  variants: {
    variant: {
      default: "border-t border-border",
      accent: "mt-[2px] rounded-b-xl bg-card",
    },
  },
  defaultVariants: { variant: "default" },
});

function Card({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return (
    <CardContext.Provider value={{ variant: variant || "default" }}>
      <div data-slot="card" className={cn(cardVariants({ variant }), className)} {...props} />
    </CardContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-header"
      className={cn(cardHeaderVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-content"
      className={cn(cardContentVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardTable({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-table"
      className={cn(cardTableVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { variant } = useCardContext();
  return (
    <div
      data-slot="card-footer"
      className={cn(cardFooterVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeading({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-heading" className={cn("space-y-1", className)} {...props} />;
}

function CardToolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-toolbar"
      className={cn("flex items-center gap-2.5", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
};
