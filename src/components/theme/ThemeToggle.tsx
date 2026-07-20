import { KeenIcon } from "@/components/keenicons";
import { Button } from "@/components/ui/button";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9"
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <KeenIcon icon="moon" className="text-base" />
      ) : (
        <KeenIcon icon="sun" className="text-base" />
      )}
    </Button>
  );
}
