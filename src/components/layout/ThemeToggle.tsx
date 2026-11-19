"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip } from "@/components/ui/Tooltip";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Tooltip label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-panel2 hover:text-fg"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </Tooltip>
  );
}
