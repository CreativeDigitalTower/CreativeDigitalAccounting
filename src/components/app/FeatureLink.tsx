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
      <span aria-hidden="true" style={{ marginRight: 6 }}>🔒</span>{children}
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
      🔒 {children}
    </Link>
  );
}
