import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Unbounded } from "next/font/google";

import {
  PwaInstallPrompt,
  PwaInstallProvider,
} from "@/components/pwa-install-prompt";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "800"],
});

export const metadata: Metadata = {
  title: "HipsApp",
  description:
    "Gestión de asistencias, membresías, clases y playlists para Hipsdance.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HipsApp",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaInstallProvider>
          {children}
          <PwaInstallPrompt />
        </PwaInstallProvider>
      </body>
    </html>
  );
}
