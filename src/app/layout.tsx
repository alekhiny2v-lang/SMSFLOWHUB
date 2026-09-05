import type { Metadata } from "next";
import type { ReactNode } from "react";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMSFlow Panel",
  description: "Professional SMS activation panel powered by SMSFlow",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-fg antialiased min-h-screen">
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
