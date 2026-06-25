import { requireFeature } from "@/lib/session";
import { DeclarationForm } from "@/components/app/DeclarationForm";

export default async function NewDeclarationPage() {
  await requireFeature("declarations");
  return <DeclarationForm />;
}
