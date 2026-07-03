import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Game Tracker",
  description: "Personal game journey tracker with retro-futuristic vibes",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <Sidebar />
        <main className="w-full max-w-full overflow-x-hidden pb-24 md:ml-64 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
