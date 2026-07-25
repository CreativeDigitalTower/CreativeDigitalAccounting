import { describe, it, expect } from "vitest";
import { computeClientTracking, computeSendingAnalytics, formatDuration, computeClientRankings } from "@/lib/trackingAnalytics";

const H = 3600000, D = 86400000;
const base = new Date("2026-07-01T10:00:00Z").getTime();
const at = (offsetMs: number) => new Date(base + offsetMs).toISOString();

describe("computeClientTracking", () => {
  it("средно време до отваряне и плащане + open rate", () => {
    const docs = [
      { events: [{ type: "sent", at: at(0) }, { type: "email_opened", at: at(2 * H) }, { type: "paid", at: at(3 * D) }], status: "paid" },
      { events: [{ type: "sent", at: at(0) }], status: "sent" }, // изпратен, неотворен
    ];
    const r = computeClientTracking(docs);
    expect(r.sentCount).toBe(2);
    expect(r.openRate).toBe(50);
    expect(r.avgOpenMs).toBe(2 * H);
    expect(r.avgPayMs).toBe(3 * D);
    expect(r.lastOpen).not.toBeNull();
  });
  it("без изпращания → нули/null", () => {
    const r = computeClientTracking([{ events: [], status: "draft" }]);
    expect(r.sentCount).toBe(0);
    expect(r.openRate).toBeNull();
    expect(r.avgOpenMs).toBeNull();
  });
});

describe("computeSendingAnalytics", () => {
  it("брои изпратени/отворени/неотворени", () => {
    const docs = [
      { events: [{ type: "sent", at: at(0) }, { type: "viewed", at: at(H) }] },
      { events: [{ type: "sent", at: at(0) }] },
      { events: [] }, // никога не е изпращан
    ];
    const r = computeSendingAnalytics(docs);
    expect(r.sent).toBe(2);
    expect(r.opened).toBe(1);
    expect(r.unopened).toBe(1);
  });
});

describe("formatDuration", () => {
  const labels = { hours: (n: number) => `${n}ч`, days: (n: number) => `${n}д`, na: "—" };
  it("часове под 48ч", () => { expect(formatDuration(2 * H, labels)).toBe("2ч"); });
  it("дни над 48ч", () => { expect(formatDuration(3 * D, labels)).toBe("3д"); });
  it("null → na", () => { expect(formatDuration(null, labels)).toBe("—"); });
});

describe("computeClientRankings", () => {
  const H = 3600000, D = 86400000;
  const b = new Date("2026-07-01T10:00:00Z").getTime();
  const at2 = (o: number) => new Date(b + o).toISOString();
  it("класира най-бързо плащащи, никога неотварящи и просрочия", () => {
    const docs = [
      { clientId: "fast", clientName: "Бърз", events: [{ type: "sent", at: at2(0) }, { type: "email_opened", at: at2(H) }, { type: "paid", at: at2(D) }], status: "paid" },
      { clientId: "slow", clientName: "Бавен", events: [{ type: "sent", at: at2(0) }, { type: "viewed", at: at2(H) }, { type: "paid", at: at2(10 * D) }], status: "paid" },
      { clientId: "ghost", clientName: "Мълчалив", events: [{ type: "sent", at: at2(0) }], status: "sent" },
      { clientId: "late", clientName: "Закъснял", events: [{ type: "sent", at: at2(0) }], status: "sent", dueDate: "2000-01-01" },
    ];
    const r = computeClientRankings(docs);
    expect(r.fastestPaying[0].clientId).toBe("fast");
    expect(r.neverOpen.map((x) => x.clientId)).toContain("ghost");
    expect(r.neverOpen.map((x) => x.clientId)).toContain("late");
    expect(r.mostOverdue[0].clientId).toBe("late");
  });
  it("пропуска документи без клиент", () => {
    const r = computeClientRankings([{ clientId: null, clientName: null, events: [{ type: "sent", at: at2(0) }] }]);
    expect(r.neverOpen.length).toBe(0);
  });
});
