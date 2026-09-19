import { describe, it, expect } from "vitest";
import { paymentReminderDefaults, paymentReminderEmail } from "@/lib/email/messages";
import { resolveCompanyReplyTo } from "@/lib/email/replyTo";

// ─────────────── §27 Ръчно напомняне за плащане ───────────────
describe("paymentReminderDefaults — status/due-date aware body (§5/§6)", () => {
  const base = { number: "0000000042", total: "1 200,00 €", company: "ACME ООД", locale: "bg" as const };

  it("overdue: споменава падеж и че плащането не е отчетено (не агресивно)", () => {
    const { subject, message } = paymentReminderDefaults({ ...base, clientName: "Иван", dueDate: "01.01.2026", status: "overdue" });
    expect(subject).toBe("Напомняне за плащане по фактура № 0000000042");
    expect(message).toContain("Здравейте, Иван,");
    expect(message).toContain("все още не е отчетено като получено");
    expect(message).toContain("01.01.2026");
    expect(message).toContain("Сума за плащане: 1 200,00 €");
    expect(message).toContain("Поздрави,");
    expect(message).toContain("ACME ООД");
  });

  it("upcoming: не твърди просрочено, а предстоящо плащане", () => {
    const { message } = paymentReminderDefaults({ ...base, clientName: "Иван", dueDate: "31.12.2030", status: "upcoming" });
    expect(message).toContain("предстоящото плащане");
    expect(message).not.toContain("все още не е отчетено");
  });

  it("no due date: неутрален текст, без ред за падеж", () => {
    const { message } = paymentReminderDefaults({ ...base, clientName: null, dueDate: null, status: "none" });
    expect(message).toContain("Напомняме Ви за плащането по фактура № 0000000042");
    expect(message).not.toContain("Падеж:");
  });

  it("без име на клиент → неутрален поздрав", () => {
    const { message } = paymentReminderDefaults({ ...base, clientName: null, dueDate: null, status: "none" });
    expect(message.startsWith("Здравейте,\n")).toBe(true);
  });
});

describe("paymentReminderEmail — безопасен HTML в брандирания шаблон (§7/§24)", () => {
  it("escape на потребителско съобщение (без raw HTML инжекция)", () => {
    const m = paymentReminderEmail({
      company: "ACME", number: "42", total: "10 €", dueDate: "01.01.2026",
      subject: "Тема", message: "Ред 1\nРед 2\n\n<script>alert(1)</script>",
      viewUrl: "https://x/d/tok", locale: "bg",
    });
    expect(m.category).toBe("reminder");
    expect(m.subject).toBe("Тема");
    expect(m.html).not.toContain("<script>alert(1)</script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).toContain("Ред 1<br>Ред 2");
    expect(m.html).toContain("https://x/d/tok");
  });
});

// ─────────────── §28 Reply-To резолвиране ───────────────
describe("resolveCompanyReplyTo — приоритет и валидация (§12/§14)", () => {
  it("приоритет: correspondenceEmail пред email пред owner", () => {
    expect(resolveCompanyReplyTo({ correspondenceEmail: "a@x.bg", email: "b@x.bg", ownerEmail: "c@x.bg" })).toBe("a@x.bg");
    expect(resolveCompanyReplyTo({ correspondenceEmail: null, email: "b@x.bg", ownerEmail: "c@x.bg" })).toBe("b@x.bg");
    expect(resolveCompanyReplyTo({ correspondenceEmail: "", email: null, ownerEmail: "c@x.bg" })).toBe("c@x.bg");
  });

  it("пропуска невалидни адреси и пада към следващия валиден", () => {
    expect(resolveCompanyReplyTo({ correspondenceEmail: "not-an-email", email: "b@x.bg" })).toBe("b@x.bg");
  });

  it("всички празни/невалидни → null (извикващият пада към глобалния CDA Reply-To)", () => {
    expect(resolveCompanyReplyTo({ correspondenceEmail: "x", email: "", ownerEmail: null })).toBeNull();
    expect(resolveCompanyReplyTo({})).toBeNull();
  });

  it("нормализира регистъра", () => {
    expect(resolveCompanyReplyTo({ correspondenceEmail: "Office@X.BG" })).toBe("office@x.bg");
  });
});

// ─────────────── §29 Регресия ───────────────
describe("регресия: send.ts запазва замяната {{UNSUB}} + глобален fallback", () => {
  it("deliver ползва replyTo || REPLY_TO (backward compatible)", () => {
    const fs = require("node:fs");
    const src = fs.readFileSync("src/lib/email/send.ts", "utf-8");
    expect(src).toContain("replyTo: replyTo || REPLY_TO");
    expect(src).toContain("from: FROM");
  });
});
