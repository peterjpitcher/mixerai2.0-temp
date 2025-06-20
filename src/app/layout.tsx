import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import RootLayoutWrapper from "@/components/layout/root-layout-wrapper";
import { Toaster as SonnerToaster } from "@/components/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppProviders } from "@/providers/app-providers";

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
      </head>
      <body className={inter.className}>
        <AppProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ErrorBoundary>
              <RootLayoutWrapper>{children}</RootLayoutWrapper>
            </ErrorBoundary>
            <SonnerToaster />
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}
