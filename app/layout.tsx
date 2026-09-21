import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nosy.ai",
  description: "A private resume-based job agent."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
