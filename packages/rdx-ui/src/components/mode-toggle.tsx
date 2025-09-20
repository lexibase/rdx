"use client";

import { SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@rdx/ui/components/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      aria-label="Mode Toggle"
    >
      <SunMoon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">colorTheme</span>
    </Button>
  );
}
