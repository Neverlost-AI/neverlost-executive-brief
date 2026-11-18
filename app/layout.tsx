import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neverlost Command Center",
  description: "Governed continuous-memory operator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
