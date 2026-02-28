import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Workflow Builder",
  description: "Visual drag-and-drop workflow builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="night">
      <body>{children}</body>
    </html>
  );
}
