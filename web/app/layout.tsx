import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./styles/shell.css";
import "./styles/views.css";
import "./styles/panels.css";

export const metadata: Metadata = {
  title: "SmartPlanner · 个人日程",
  description: "不只是记下来，而是把今天排明白。一个会提醒、会避坑、会帮你重新排期的个人日程本。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
