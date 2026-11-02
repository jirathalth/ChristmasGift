import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ibm-plex-sans-thai" });

export const metadata: Metadata = {
  title: { default: "Secret Santa", template: "%s | Secret Santa" },
  description: "จัดกิจกรรมจับฉลากของขวัญอย่างเป็นส่วนตัว",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={ibmPlexSansThai.variable}><body>{children}</body></html>;
}
