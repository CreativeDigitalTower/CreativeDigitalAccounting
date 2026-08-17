import { describe, it, expect } from "vitest";
import {
  WORKFLOW_ORDER, PRODUCTION_STATUSES, canTransition, nextStatuses, productionCut,
} from "@/lib/fashion/production";

describe("Fashion Production — workflow (§14)", () => {
  it("основният поток е cut→sewing→finishing→qc→ready", () => {
    expect(WORKFLOW_ORDER).toEqual(["cut", "sewing", "finishing", "qc", "ready"]);
    expect(PRODUCTION_STATUSES).toContain("on_hold");
    expect(PRODUCTION_STATUSES).toContain("rework");
    expect(PRODUCTION_STATUSES).toContain("cancelled");
  });

  it("поток напред само с една стъпка", () => {
    expect(canTransition("cut", "sewing")).toBe(true);
    expect(canTransition("sewing", "finishing")).toBe(true);
    expect(canTransition("qc", "ready")).toBe(true);
    expect(canTransition("cut", "finishing")).toBe(false); // прескачане
    expect(canTransition("sewing", "cut")).toBe(false);     // назад
  });

  it("on_hold / cancelled от активен статус; cancelled е терминален", () => {
    expect(canTransition("sewing", "on_hold")).toBe(true);
    expect(canTransition("on_hold", "sewing")).toBe(true);
    expect(canTransition("finishing", "cancelled")).toBe(true);
    expect(canTransition("cancelled", "sewing")).toBe(false);
    expect(canTransition("cancelled", "on_hold")).toBe(false);
  });

  it("rework: от finishing/qc/ready → rework → sewing/finishing/qc", () => {
    expect(canTransition("qc", "rework")).toBe(true);
    expect(canTransition("ready", "rework")).toBe(true);
    expect(canTransition("cut", "rework")).toBe(false);
    expect(canTransition("rework", "sewing")).toBe(true);
    expect(canTransition("rework", "ready")).toBe(false);
  });

  it("не се позволява преход към себе си", () => {
    expect(canTransition("sewing", "sewing")).toBe(false);
  });

  it("nextStatuses връща допустимите за UI", () => {
    const ns = nextStatuses("cut");
    expect(ns).toContain("sewing");
    expect(ns).toContain("on_hold");
    expect(ns).toContain("cancelled");
    expect(ns).not.toContain("ready");
  });

  it("productionCut = Σ скроени по размер", () => {
    expect(productionCut([{ size: "S", cutQuantity: 15 }, { size: "M", cutQuantity: 20 }])).toBe(35);
    expect(productionCut([])).toBe(0);
  });
});
