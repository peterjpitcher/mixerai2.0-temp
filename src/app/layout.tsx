import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import { Toaster } from "@/components/toast"; // Radix Toaster, to be removed
// import { ToastProvider } from "@/components/toast-provider"; // Radix Provider, to be removed
import { ThemeProvider } from "@/components/theme-provider";
import RootLayoutWrapper from "@/components/layout/root-layout-wrapper";
import { Toaster as SonnerToaster } from "@/components/sonner"; // Keep Sonner

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MixerAI 2.0 | AI-Powered Content Creation",
  description: "Generate high-quality marketing content with Azure OpenAI for your brand",
};

/**
 * Root layout for the application.
 * Sets up HTML structure, global styles, theme provider, and toast notifications.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        {/* API fallback script removed to adhere to no-fallback policy */}
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* <ToastProvider> */}{/* Removed Radix ToastProvider */}
            <RootLayoutWrapper>{children}</RootLayoutWrapper>
            {/* <Toaster /> */}{/* Removed Radix Toaster */}
            <SonnerToaster /> {/* Keep Sonner Toaster */}
          {/* </ToastProvider> */}{/* Removed Radix ToastProvider */}
        </ThemeProvider>
      </body>
    </html>
  );
}
