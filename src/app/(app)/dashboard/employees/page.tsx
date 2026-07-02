import { requireFeature } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EmployeesPanel } from "@/components/app/EmployeesPanel";

export default async function EmployeesPage() {
  const { companyId } = await requireFeature("employees");
  const rows = await prisma.employee.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  const employees = rows.map((e) => ({
    id: e.id, name: e.name, position: e.position, phone: e.phone, email: e.email,
    address: e.address, salary: e.salary, hiredAt: e.hiredAt?.toISOString() ?? null,
    paidLeaveDays: e.paidLeaveDays, notes: e.notes, active: e.active,
    department: e.department, contractType: e.contractType, paymentMethod: e.paymentMethod, iban: e.iban, bankName: e.bankName,
    userId: e.userId,
  }));
  return <EmployeesPanel initial={employees} />;
}
