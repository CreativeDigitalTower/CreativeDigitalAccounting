import { BlobBackground } from "@/components/Backgrounds";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";
import { MessengerBubble } from "@/components/marketing/MessengerBubble";
import { CookieConsent } from "@/components/marketing/CookieConsent";
import { VisitTracker } from "@/components/VisitTracker";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <VisitTracker area="public" />
      <BlobBackground />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <MarketingNavbar />
        <main style={{ flex: 1 }}>{children}</main>
        <MarketingFooter />
      </div>
      <MessengerBubble />
      <CookieConsent />
    </div>
  );
}
