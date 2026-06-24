import { requirePaidPlan } from "@/lib/session";
import { ProtocolForm } from "@/components/app/ProtocolForm";

export default async function NewProtocolPage() {
  await requirePaidPlan(); // ППП само за платени абонаменти
  return <ProtocolForm />;
}
