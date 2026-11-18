"use client";

import { useMemo, type ReactNode } from "react";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export function MuiProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(
    () => createTheme({
      palette: {
        mode: "light",
        primary: { main: "#2563eb" },
        secondary: { main: "#475569" },
        background: { default: "#f6f7f9", paper: "#ffffff" },
        text: { primary: "#111827", secondary: "#64748b" },
      },
      shape: { borderRadius: 10 },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Noto Sans SC", sans-serif',
        button: { textTransform: "none", fontWeight: 600 },
      },
      components: {
        MuiButton: { defaultProps: { disableElevation: true } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        MuiCard: { styleOverrides: { root: { boxShadow: "none" } } },
        MuiDialog: { styleOverrides: { paper: { borderRadius: 12 } } },
        MuiTab: { styleOverrides: { root: { textTransform: "none", minHeight: 40 } } },
        MuiTextField: { defaultProps: { size: "small" } },
        MuiChip: { defaultProps: { size: "small" } },
      },
    }),
    [],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
