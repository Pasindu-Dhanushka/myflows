import type { Metadata } from "next";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizFlows",
  description: "The enterprise workflow platform that scales"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
