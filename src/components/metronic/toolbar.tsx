import type { ReactNode } from "react";

const Toolbar = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-5 pb-7 lg:items-end">
      {children}
    </div>
  );
};

const ToolbarActions = ({ children }: { children: ReactNode }) => {
  return <div className="flex items-center gap-2.5">{children}</div>;
};

const ToolbarPageTitle = ({ text }: { text: string }) => {
  return <h1 className="text-xl font-medium leading-none text-foreground">{text}</h1>;
};

const ToolbarDescription = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
      {children}
    </div>
  );
};

const ToolbarHeading = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-col justify-center gap-2">{children}</div>;
};

export { Toolbar, ToolbarActions, ToolbarPageTitle, ToolbarHeading, ToolbarDescription };
