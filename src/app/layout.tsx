import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QTE Sales Quoting",
  description: "Machine sales quotes, sales orders, and production orders for Quality Track Equipment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-mist font-sans text-navy antialiased">{children}</body>
    </html>
  );
}
