import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Digital Accounting — Умна бизнес платформа",
  description:
    "Фактуриране, склад и финансови анализи за малки и средни фирми в България.",
  keywords: "фактуриране, счетоводство, склад, България, ЕИК, VIES, ДДС",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  );
}
