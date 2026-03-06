import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://webinen.com"),
  title: {
    default: "Webinen — Design & Development Studio",
    template: "%s | Webinen",
  },
  description:
    "Webinen is a design & development studio crafting clean, purposeful digital products. We build beautiful, high-performance web experiences. Coming soon.",
  keywords: [
    "web design",
    "web development",
    "digital studio",
    "UI/UX design",
    "frontend development",
    "Next.js",
    "React",
    "Webinen",
    "Serhat Çelik",
  ],
  authors: [{ name: "Serhat Çelik", url: "https://serhat.webinen.com" }],
  creator: "Serhat Çelik",
  publisher: "Webinen",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Webinen — Design & Development Studio",
    description:
      "Crafting clean, purposeful digital products. Our new website is on the way.",
    url: "https://webinen.com",
    siteName: "Webinen",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Webinen — Design & Development Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webinen — Design & Development Studio",
    description:
      "Crafting clean, purposeful digital products. Our new website is on the way.",
    creator: "@webinen",
    images: ["/og-image.png"],
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
  alternates: {
    canonical: "https://webinen.com",
  },
  category: "technology",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
