import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  parseLogoDataUrl, isSupportedLogo, sanitizeSvg, resolveCompanyLogo, validateLogoFile,
  MAX_LOGO_BYTES,
} from "@/lib/companyLogo";

const read = (p: string) => fs.readFileSync(p, "utf-8");
const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");

// Малки валидни data URL-и (съдържанието е без значение за растерните формати — валидира се форматът).
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const SVG_CLEAN = `data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#1E9E6A"/></svg>')}`;
const SVG_MALICIOUS = `data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/><a href="javascript:evil()">x</a></svg>')}`;

describe("parseLogoDataUrl / isSupportedLogo (§2 валидация)", () => {
  it("разпознава PNG/JPG/SVG data URL", () => {
    expect(parseLogoDataUrl(PNG)?.mime).toBe("image/png");
    expect(parseLogoDataUrl(JPG)?.mime).toBe("image/jpeg");
    expect(parseLogoDataUrl(SVG_CLEAN)?.isSvg).toBe(true);
  });
  it("отхвърля непразни невалидни стойности (не-data URL, http, боклук)", () => {
    expect(parseLogoDataUrl("https://evil.example/logo.png")).toBeNull();
    expect(parseLogoDataUrl("not-an-image")).toBeNull();
    expect(parseLogoDataUrl("")).toBeNull();
    expect(parseLogoDataUrl(null)).toBeNull();
  });
  it("отхвърля неподдържан MIME (напр. PDF)", () => {
    expect(parseLogoDataUrl("data:application/pdf;base64,AAAA")).toBeNull();
  });
  it("isSupportedLogo е true за валидно лого в рамките на лимита", () => {
    expect(isSupportedLogo(PNG)).toBe(true);
    expect(isSupportedLogo("data:application/pdf;base64,AAAA")).toBe(false);
  });
});

describe("resolveCompanyLogo — единен резолвер (§4/§5/§13)", () => {
  it("PNG/JPG се връщат непроменени (растер)", () => {
    expect(resolveCompanyLogo(PNG)).toBe(PNG);
    expect(resolveCompanyLogo(JPG)).toBe(JPG);
  });
  it("валиден SVG се връща като (санитизиран) svg+xml data URL", () => {
    const out = resolveCompanyLogo(SVG_CLEAN);
    expect(out).toMatch(/^data:image\/svg\+xml;base64,/);
  });
  it("повредено/невалидно лого → null (fallback към името на фирмата, §5)", () => {
    expect(resolveCompanyLogo("data:image/png;base64,")).toBeNull();
    expect(resolveCompanyLogo("garbage")).toBeNull();
    expect(resolveCompanyLogo(null)).toBeNull();
  });
  it("фактура без лого → null (§15 №15)", () => {
    expect(resolveCompanyLogo(undefined)).toBeNull();
  });
  it("прекалено голямо лого (> 500 KB) → null", () => {
    const huge = "data:image/png;base64," + "A".repeat(Math.ceil((MAX_LOGO_BYTES + 50000) * 4 / 3));
    expect(parseLogoDataUrl(huge)!.approxBytes).toBeGreaterThan(MAX_LOGO_BYTES);
    expect(resolveCompanyLogo(huge)).toBeNull();
  });
  it("обратна съвместимост: стар валиден растер data URL продължава да работи (№17)", () => {
    expect(resolveCompanyLogo(PNG)).toBe(PNG);
  });
});

describe("sanitizeSvg — безопасна обработка на SVG (§10 №18 сигурност)", () => {
  it("премахва <script>, on*= handlers, <foreignObject> и javascript: URL-и", () => {
    const cleaned = sanitizeSvg(Buffer.from(SVG_MALICIOUS.split(",")[1], "base64").toString("utf-8"));
    expect(cleaned).not.toMatch(/<script/i);
    expect(cleaned).not.toMatch(/onload\s*=/i);
    expect(cleaned).not.toMatch(/javascript:/i);
    expect(cleaned).toMatch(/<rect/i); // легитимното съдържание остава
  });
  it("резолверът санитизира и зловредния SVG (без script в изхода)", () => {
    const out = resolveCompanyLogo(SVG_MALICIOUS)!;
    const decoded = Buffer.from(out.split(",")[1], "base64").toString("utf-8");
    expect(decoded).not.toMatch(/<script/i);
    expect(decoded).not.toMatch(/onload=/i);
  });
});

describe("validateLogoFile — качване (§8 №1-5)", () => {
  it("приема PNG/JPG/JPEG/SVG", () => {
    expect(validateLogoFile({ type: "image/png", name: "a.png", size: 1000 })).toBeNull();
    expect(validateLogoFile({ type: "image/jpeg", name: "a.jpg", size: 1000 })).toBeNull();
    expect(validateLogoFile({ type: "image/svg+xml", name: "a.svg", size: 1000 })).toBeNull();
  });
  it("приема по разширение дори при липсващ MIME", () => {
    expect(validateLogoFile({ type: "", name: "logo.PNG", size: 1000 })).toBeNull();
  });
  it("връща logoFormat за неподдържан тип", () => {
    expect(validateLogoFile({ type: "application/pdf", name: "a.pdf", size: 1000 })).toBe("logoFormat");
  });
  it("връща logoTooLarge над 500 KB", () => {
    expect(validateLogoFile({ type: "image/png", name: "a.png", size: MAX_LOGO_BYTES + 1 })).toBe("logoTooLarge");
  });
});

// ─── Source-level гаранции (поведение, живеещо в компоненти/рутове) ───
describe("Интеграционни гаранции (§4/§5/§6/§10/§12)", () => {
  const invoice = read("src/components/app/InvoiceDocument.tsx");
  const offer = read("src/components/app/OfferDocument.tsx");
  const pdf = read("src/components/app/DownloadButtons.tsx");
  const docPage = read("src/app/(app)/dashboard/documents/[id]/page.tsx");
  const companyRoute = read("src/app/api/company/route.ts");
  const modal = read("src/components/app/LogoPreviewModal.tsx");
  const settings = read("src/app/(app)/dashboard/settings/page.tsx");

  it("фактурата и офертата минават през единния резолвер (№13)", () => {
    expect(invoice).toContain("resolveCompanyLogo");
    expect(offer).toContain("resolveCompanyLogo");
  });
  it("PDF подготвя изображенията и растеризира SVG преди html2canvas (№14/№16)", () => {
    expect(pdf).toContain("prepareImagesForCapture");
    expect(pdf).toContain("isSvg");            // открива SVG източник
    expect(pdf).toContain("drawImage");        // растеризира в canvas
    expect(pdf).toContain("toDataURL(\"image/png\")");
    expect(pdf).toContain("restore()"); // възстановяване на оригиналните src
  });
  it("логото във фактурата НЕ зависи от плана (достъпно и за Free) (§2/§B)", () => {
    expect(docPage).toContain("showLogo = !!doc.company.logoUrl");
    expect(docPage).not.toContain('plan !== "free"');
  });
  it("company PUT е company-scoped (multi-tenant, §10 №18/№19)", () => {
    expect(companyRoute).toContain("requireCompany");
    expect(companyRoute).toMatch(/update\(\{\s*[\s\S]*where:\s*\{\s*id:\s*companyId\s*\}/);
    // няма доверие към подаден в тялото companyId за таргет на ъпдейта
    expect(companyRoute).not.toMatch(/where:\s*\{\s*id:\s*(body|data|d)\.companyId/);
  });
  it("preview модалът се затваря с Escape и X (§6 №10/№11)", () => {
    expect(modal).toMatch(/Escape/);
    expect(modal).toContain("onClose");
    expect(modal).toMatch(/object-fit|objectFit/);
  });
  it("качването валидира и не изтрива старото лого при грешка (§9 №6)", () => {
    expect(settings).toContain("validateLogoFile");
    // при грешка се връщаме рано, преди какъвто и да е set() на logoUrl
    expect(settings).toMatch(/if \(err\) \{[\s\S]*return;/);
  });
});

describe("i18n — лого ключове във всички 6 езика (§8)", () => {
  for (const l of ["bg", "en", "ru", "ro", "tr", "el"]) {
    it(`${l} има logoFormat/logoUploadFailed/logoPreview`, () => {
      const j = JSON.parse(read(`src/locales/${l}/account.json`));
      for (const k of ["logoFormat", "logoUploadFailed", "logoPreview", "logoTooLarge"]) {
        expect(j.settings[k], `${l}.settings.${k}`).toBeTruthy();
      }
    });
  }
});
