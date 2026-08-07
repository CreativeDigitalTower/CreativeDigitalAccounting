import { describe, it, expect } from "vitest";
import { personalizationOfferEmail, buildPersonalizationHtml } from "@/lib/email/messages";

describe("personalizationOfferEmail", () => {
  it("има subject, параграфи и mailto CTA", () => {
    const o = personalizationOfferEmail("bg");
    expect(o.subject).toContain("Creative Digital Accounting");
    expect(o.paragraphs.length).toBeGreaterThan(5);
    expect(o.buttonLabel).toBeTruthy();
    expect(o.mailtoUrl.startsWith("mailto:support@creativedigitalaccounting.com")).toBe(true);
    expect(o.mailtoUrl).toContain("subject=");
    expect(o.partnership).toBeTruthy();
  });
  it("локализира на английски", () => {
    const o = personalizationOfferEmail("en");
    expect(o.buttonLabel.toLowerCase()).toContain("idea");
  });
});

describe("buildPersonalizationHtml", () => {
  const { subject, html } = buildPersonalizationHtml("bg");
  it("връща HTML със subject и партньорско изречение", () => {
    expect(subject).toBeTruthy();
    expect(html).toContain("<html");
    expect(html).toContain("mailto:support@creativedigitalaccounting.com");
  });
  it("CTA бутонът НЕ е click-wrapped (за да работи mailto)", () => {
    // Wrap-регексът в send слоя изисква target=\"_blank\" + padding:13px — тук ги няма.
    expect(html).not.toContain('target="_blank" style="display:inline-block;padding:13px');
    expect(html).toContain("padding:14px 34px"); // нашият mailto бутон
  });
  it("съдържа маркер за unsubscribe (пикселът се добавя в send слоя)", () => {
    expect(html).toContain("{{UNSUB}}");
  });
});
