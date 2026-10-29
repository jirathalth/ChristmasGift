import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Secret Santa", template: "%s | Secret Santa" },
  description: "จัดกิจกรรมจับฉลากของขวัญอย่างเป็นส่วนตัว",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
