import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI 控件与界面术语图鉴",
  description: "可搜索、可操作的 Windows、Android 与跨平台 UI 控件和完整界面术语图鉴。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
