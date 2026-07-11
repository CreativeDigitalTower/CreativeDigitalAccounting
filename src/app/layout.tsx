import type { Metadata } from "next";
import "./globals.css";
import { MetaPixel } from "@/components/MetaPixel";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { I18nProvider } from "@/components/i18n/I18nProvider";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://creativedigitalaccounting.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Creative Digital Accounting — Софтуер за фактуриране и счетоводство",
    template: "%s · Creative Digital Accounting",
  },
  description:
    "Уеб софтуер за фактуриране, складова наличност, разходи и финансови анализи за малки и средни фирми в България. Безплатен план. Двойно EUR/BGN обозначаване и готовност за еврото.",
  keywords: [
    "софтуер за фактуриране", "програма за фактури", "онлайн фактури", "счетоводен софтуер",
    "складов софтуер", "фактуриране България", "проформа фактура", "ДДС", "ЕИК", "VIES",
    "евро BGN", "SaaS счетоводство", "финансови анализи", "Creative Digital Accounting",
  ],
  authors: [{ name: "Creative Digital Tower", url: "https://creativedigitaltower.com" }],
  creator: "Creative Digital Tower",
  alternates: { canonical: APP_URL },
  openGraph: {
    type: "website",
    locale: "bg_BG",
    url: APP_URL,
    siteName: "Creative Digital Accounting",
    title: "Creative Digital Accounting — Софтуер за фактуриране и счетоводство",
    description:
      "Фактуриране, склад, разходи и финансови анализи за малки и средни фирми в България. Безплатен план.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Creative Digital Accounting",
    description: "Умна бизнес платформа за фактуриране и финансово управление.",
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const metaPixelId = process.env.META_PIXEL_ID;
  const locale = await getLocale();
  const messages = getMessages(locale);
  return (
    <html lang={locale}>
      <body>
        {metaPixelId && <MetaPixel pixelId={metaPixelId} />}
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
