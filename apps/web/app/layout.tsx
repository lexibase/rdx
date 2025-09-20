import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import "@rdx/ui/globals.css";

import { ThemeProvider } from "@rdx/ui/providers/theme-provider";

import { Navbar } from "@/components/layout/Navbar";
import { VersionProvider } from "@/contexts/version-docs";
import config from "@/rdx.config";

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  icons: {
    icon: config.favicon,
  },
  title: config.title,
  description: config.description,
  authors: [{ name: config.author, url: config.navbar.actions?.github?.url }],
  keywords: [
    "duhnunes",
    "RDX",
    "documentation",
    "documento",
    "padrão",
    "pt-br",
    "ptbr",
    "nextjs",
    "mdx",
    "rdx",
  ],
  robots: "index, follow",
  openGraph: {
    title: config.title,
    description: config.description,
    url: config.url,
    images: [
      {
        url: "/icons/favicon-96x96.png",
        width: 1200,
        height: 630,
        alt: "RDX Open Graph Image TEMPORARY",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: config.title,
    description: config.description,
    images: ["/icons/favicon-96x96.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <head>
        {/* FAVICON */}
        <link
          href="/icons/favicon-96x96.png"
          rel="icon"
          sizes="96x96"
          type="image/png"
        />
        <link href="/icons/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href={config.favicon} rel="shortcut icon" />
        <meta content={config.title} name="apple-mobile-web-app-title" />
        <link href="/site.webmanifest" rel="manifest" />

        {/* MOBILE BAR COLOR */}
        <meta name="theme-color" content="#0a0a0a" />
      </head>
      <body className={`${bebas.variable} ${spaceMono.variable} antialiased`}>
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme={config.theme?.defaultTheme ?? "system"}
        >
          <VersionProvider>
            <div className="flex flex-col h-screen">
              <Navbar />
              {children}
            </div>
          </VersionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
