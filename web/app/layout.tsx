import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "SmartPlanner · 个人日程",
  description: "一个会提醒、会避坑、会帮你重新排期的个人日程本。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c2f27",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
