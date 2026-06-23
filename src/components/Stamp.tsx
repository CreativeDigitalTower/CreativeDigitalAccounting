import { clsx } from "clsx";

const STATUS_LABELS: Record<string, string> = {
  draft: "ЧЕРНОВА",
  sent: "ИЗПРАТЕНА",
  paid: "ПЛАТЕНА",
  overdue: "ПРОСРОЧЕНА",
  cancelled: "АНУЛИРАНА",
};

export function Stamp({ status }: { status: string }) {
  return (
    <span className={clsx("stamp", `stamp-${status}`)}>
      {STATUS_LABELS[status] ?? status.toUpperCase()}
    </span>
  );
}
