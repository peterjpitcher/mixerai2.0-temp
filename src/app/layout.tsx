import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toast";
import { ToastProvider } from "@/components/toast-provider";
import RootLayoutWrapper from "@/components/layout/root-layout-wrapper";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MixerAI 2.0 | AI-Powered Content Creation",
  description: "Generate high-quality marketing content with Azure OpenAI for your brand",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="/api-fallback.js" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <RootLayoutWrapper>{children}</RootLayoutWrapper>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
