import { useColorScheme } from "@mui/material/styles";
import * as React from "react";
import { useEffect } from "react";
import type { StoryContext } from "@storybook/react-vite";

export const TextLight = "Mode: Light";
export const TextDark = "Mode: Dark";
export const TextSystem = "Mode: System";

type ThemeMode = typeof TextLight | typeof TextDark | typeof TextSystem;

interface Globals {
  themeMode?: ThemeMode;
}
interface ThemeSwapperProps {
  context: StoryContext & {
    globals: Globals;
  };
  children: React.ReactNode;
}

const ThemeSwapper = ({ context, children }: ThemeSwapperProps) => {
  const { mode, systemMode, setMode } = useColorScheme();

  const selectedThemeMode = context.globals.themeMode ?? TextSystem;

  useEffect(() => {
    const targetMode =
      selectedThemeMode === TextLight
        ? "light"
        : selectedThemeMode === TextDark
          ? "dark"
          : "system";

    if (mode !== targetMode) {
      setMode(targetMode);
    }
  }, [selectedThemeMode, mode, systemMode, setMode]);

  const resolvedMode = mode === "system" ? systemMode : mode;

  return (
    <div
      style={{
        backgroundColor: resolvedMode === "light" ? "#ffffff" : "#161820",
      }}
    >
      {children}
    </div>
  );
};

export { ThemeSwapper };
