import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ChatWidget from "@/components/ChatWidget";

export const metadata: Metadata = {
  title: "THINK-AI People Hub",
  description: "Internal HR tool — powered by Claude",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="main-content">{children}</main>
        <ChatWidget />
      </body>
    </html>
  );
}
