import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VerifAI",
  description: "AI-powered interview prep chat for VLSI verification engineers"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
