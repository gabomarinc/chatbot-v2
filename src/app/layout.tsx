import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kônsul Agentes de IA",
  description: "Crea y gestiona tus agentes de IA",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kônsul",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-v2.jpeg?v=2",
    apple: "/favicon-v2.jpeg?v=2",
  },
  openGraph: {
    title: "Kônsul - Agentes de IA",
    description: "Crea y gestiona tus agentes de IA profesionalmente",
    url: "https://agentes.konsul.digital",
    siteName: "Kônsul",
    images: [
      {
        url: "/favicon-v2.jpeg?v=2",
        width: 800,
        height: 800,
        alt: "Kônsul Logo",
      },
    ],
    locale: "es_PA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kônsul - Agentes de IA",
    description: "Crea y gestiona tus agentes de IA profesionalmente",
    images: ["/favicon-v2.jpeg?v=2"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#21AC96",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
