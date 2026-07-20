import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export interface EngageProps {
  title: string;
  description: string;
  image: ReactElement;
  more: {
    url: string;
    title: string;
    external?: boolean;
  };
}

/** Carte engagement — Metronic `partials/common/engage`. */
export function Engage({ title, description, image, more }: EngageProps) {
  return (
    <Card>
      <CardContent className="px-8 py-7 lg:pe-10">
        <div className="flex flex-wrap items-center gap-6 md:flex-nowrap md:gap-10">
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-xl font-medium text-foreground">{title}</h2>
            <p className="mb-2.5 text-sm leading-relaxed text-foreground">{description}</p>
          </div>
          {image}
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        {more.external ? (
          <Button variant="link" className="h-auto p-0 underline-offset-4" asChild>
            <a href={more.url} target="_blank" rel="noreferrer">
              {more.title}
            </a>
          </Button>
        ) : (
          <Button variant="link" className="h-auto p-0 underline-offset-4" asChild>
            <Link to={more.url}>{more.title}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
