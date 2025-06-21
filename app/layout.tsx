import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoSendr - AI-Powered Job Outreach Automation",
  description:
    "Automate your job outreach with AI-powered email campaigns. Send personalized emails at scale with intelligent templates and contact management.",
  keywords: [
    "job outreach",
    "email automation",
    "AI email",
    "job applications",
    "email campaigns",
    "personalized emails",
    "recruitment outreach",
    "bulk email",
    "job search automation",
  ],
  authors: [{ name: "AutoSendr Team" }],
  creator: "AutoSendr",
  publisher: "AutoSendr",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AutoSendr - AI-Powered Job Outreach Automation",
    description:
      "Automate your job outreach with AI-powered email campaigns. Send personalized emails at scale with intelligent templates and contact management.",
    url: "/",
    siteName: "AutoSendr",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/placeholder-logo.png",
        width: 1200,
        height: 630,
        alt: "AutoSendr - AI-Powered Job Outreach Automation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoSendr - AI-Powered Job Outreach Automation",
    description:
      "Automate your job outreach with AI-powered email campaigns. Send personalized emails at scale.",
    images: ["/placeholder-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className={`${inter.className} h-full antialiased`}>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-full">{children}</div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
