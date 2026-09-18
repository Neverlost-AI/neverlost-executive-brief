import type { Metadata } from "next";
import "./demo.css";

export const metadata: Metadata = {
  title: "Neverlost Command Center Demo",
  description: "A public synthetic-data portfolio demo of the Neverlost Executive Brief workflow.",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
