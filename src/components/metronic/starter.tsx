import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface StarterProps {
  image: ReactNode;
  title: string;
  subTitle: ReactNode;
  engage: {
    path: string;
    label: string;
    className?: string;
  };
}

/** Empty state carte — Metronic `partials/common/starter`. */
export function Starter({ image, title, subTitle, engage }: StarterProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2.5 py-8">
        <div className="flex justify-center p-8 py-9">{image}</div>
        <div className="flex flex-col gap-5 lg:gap-7">
          <div className="flex flex-col gap-3 text-center">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-foreground">{subTitle}</p>
          </div>
          <div className="mb-5 flex justify-center">
            <Button className={engage.className} asChild>
              <Link to={engage.path}>{engage.label}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
