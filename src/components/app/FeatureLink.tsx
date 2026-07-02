import Link from "next/link";
import { planHasFeature, minPlanForFeature, planLabel, type PlanId } from "@/lib/constants";

/**
 * Рендерира връзка към функция, която е заключена за текущия план.
 * Ако е достъпна — нормален бутон/връзка. Ако не — негативен, заключен бутон с катинар,
 * който води към страницата за абонамент.
 */
export function FeatureLink({
  plan, feature, href, children, className = "btn btn-ghost",
}: { plan: PlanId; feature: string; href: string; children: React.ReactNode; className?: string }) {
  const unlocked = planHasFeature(plan, feature);
  if (unlocked) {
    return <Link href={href} className={className}>{children}</Link>;
  }
  const min = minPlanForFeature(feature);
  return (
    <Link
      href="/dashboard/subscription"
      className={className}
      title={`Достъпно в план „${planLabel(min)}" и по-висок`}
      style={{ opacity: 0.5, filter: "grayscale(.6)", position: "relative" }}
    >
      <span aria-hidden="true" style={{ marginRight: 6, display:"inline-flex",verticalAlign:"-2px" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>{children}
    </Link>
  );
}

/** Заключена филтър-табче (за tab навигации). */
export function FeatureTab({
  plan, feature, href, children, active = false,
}: { plan: PlanId; feature: string; href: string; children: React.ReactNode; active?: boolean }) {
  const unlocked = planHasFeature(plan, feature);
  if (unlocked) {
    return <Link href={href} className={`filter-tab${active ? " active" : ""}`}>{children}</Link>;
  }
  const min = minPlanForFeature(feature);
  return (
    <Link href="/dashboard/subscription" className="filter-tab" title={`Достъпно в план „${planLabel(min)}" и по-висок`} style={{ opacity: 0.5, filter: "grayscale(.6)" }}>
      <span style={{display:"inline-flex",alignItems:"center",gap:6}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:"-2px"}}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> {children}</span>
    </Link>
  );
}
