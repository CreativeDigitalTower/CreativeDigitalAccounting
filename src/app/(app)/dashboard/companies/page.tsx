import { requireCompany, getEffectiveContext } from "@/lib/session";
import { getMyCompanies, getContextCompanies, countPaidOwnedCompanies } from "@/lib/myCompanies";
import { MyCompaniesClient } from "@/components/app/MyCompaniesClient";

// „Моите фирми" — управление на няколко собствени фирми от един профил.
// При Super Admin technical access работи в контекста на ЦЕЛЕВАТА фирма/група,
// а не с личните фирми на Super Admin.
export default async function MyCompaniesPage() {
  await requireCompany(); // guards (служители → портал, счет. къщи → /firm)
  const ctx = await getEffectiveContext();

  const companies = ctx.impersonating
    ? await getContextCompanies({ contextUserId: ctx.contextUserId, targetCompanyId: ctx.companyId })
    : await getMyCompanies(ctx.actorUserId);
  const paidCount = ctx.impersonating ? 0 : await countPaidOwnedCompanies(ctx.actorUserId);

  return (
    <MyCompaniesClient
      companies={companies}
      activeId={ctx.companyId}
      paidCount={paidCount}
      impersonating={ctx.impersonating}
      targetCompanyName={ctx.targetCompanyName}
    />
  );
}
