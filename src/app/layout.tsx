import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hush — Private conversations. Fair pricing.",
  description: "Pay once. Chat freely for 24 hours. No subscriptions or memberships."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
