import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const urbanist = localFont({
  src: [
    { path: "../../public/fonts/urbanist-regular.ttf", weight: "400 500", style: "normal" },
    { path: "../../public/fonts/urbanist-bold.ttf", weight: "600 800", style: "normal" },
  ],
  variable: "--font-urbanist",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Substition — a little clarity, a lot more control",
  description:
    "Your subscriptions, beautifully in order. A private, local-first subscription manager with offline support and an optional on-device assistant.",
  applicationName: "Substition",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Substition" },
  formatDetection: { telephone: false },
  icons: { icon: "/brand/icon-192.png", apple: "/brand/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9faf7" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" },
  ],
};
const themeScript = `(function(){try{var t=localStorage.getItem('substition-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.removeAttribute('media');m.content=d?'#101512':'#f9faf7';});var m=document.querySelector('link[rel="manifest"]');if(m)m.href=d?'/manifest-dark.webmanifest':'/manifest.webmanifest';}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={urbanist.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
