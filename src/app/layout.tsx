import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Der Dicke Franz System",
  description: "Internes Bar-Management: Inventar, Checklisten, Schulung & Berichte.",
};

export const viewport: Viewport = {
  themeColor: "#120d0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Applies the saved density preference before first paint so the toggle
// doesn't cause a visible flash from comfortable -> compact on load.
const setDensityBeforePaint = `
try {
  var d = localStorage.getItem("ddf-density");
  if (d === "compact") document.documentElement.setAttribute("data-density", "compact");
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setDensityBeforePaint }} />
      </head>
      <body className="min-h-full flex flex-col bg-ink text-parchment">{children}</body>
    </html>
  );
}
