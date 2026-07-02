import { requireEmployee } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calcPayroll } from "@/lib/payroll";
import { EmployeePortal } from "@/components/app/EmployeePortal";

export default async function PortalPage() {
  const { employee } = await requireEmployee();

  const [leaves, files, bonuses] = await Promise.all([
    prisma.employeeLeave.findMany({
      where: { employeeId: employee.id },
      select: { id: true, type: true, startDate: true, endDate: true, days: true, note: true, status: true, requestedByEmployee: true, reviewNote: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.employeeFile.findMany({
      where: { employeeId: employee.id },
      select: { id: true, name: true, docType: true, size: true, uploadedAt: true },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.employeeBonus.findMany({ where: { employeeId: employee.id }, select: { amount: true } }),
  ]);

  const gross = employee.salary ?? 0;
  const pay = calcPayroll(gross);

  // Стаж във фирмата (месеци) + приблизително общо получено (нето × месеци + бонуси)
  const hired = employee.hiredAt ? new Date(employee.hiredAt) : null;
  const now = new Date();
  const monthsWorked = hired ? Math.max(0, (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth())) : 0;
  const bonusTotal = bonuses.reduce((s, b) => s + b.amount, 0);
  const totalNetEstimate = pay.net * monthsWorked + bonusTotal;
  const totalInsurancesEstimate = pay.insurancesTotal * monthsWorked;

  const entitlement = employee.paidLeaveDays ?? 20;
  const usedPaid = leaves.filter((l) => l.type === "leave" && l.status === "approved").reduce((s, l) => s + (l.days ?? 0), 0);

  return (
    <EmployeePortal
      profile={{
        name: employee.name, position: employee.position, department: employee.department,
        hiredAt: employee.hiredAt ? employee.hiredAt.toISOString() : null, monthsWorked,
        paymentMethod: employee.paymentMethod, iban: employee.iban, bankName: employee.bankName,
      }}
      pay={pay}
      annual={{ gross: gross * 12, net: pay.net * 12 }}
      totals={{ net: totalNetEstimate, insurances: totalInsurancesEstimate, bonuses: bonusTotal }}
      leave={{ entitlement, usedPaid, remaining: entitlement - usedPaid }}
      leaves={leaves.map((l) => ({ ...l, startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString() }))}
      files={files.map((f) => ({ ...f, uploadedAt: f.uploadedAt.toISOString() }))}
    />
  );
}
