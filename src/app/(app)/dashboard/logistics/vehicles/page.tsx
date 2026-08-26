import { redirect } from "next/navigation";

// Обединено с „Автопарк" (§1/§17). Старият route пренасочва към canonical /fleet, за да
// не дава 404 за bookmarks/links. Vehicle досието остава на /logistics/vehicles/[id].
export default function Page() {
  redirect("/dashboard/logistics/fleet");
}
