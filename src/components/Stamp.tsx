import { clsx } from "clsx";

const STATUS_LABELS: Record<string, string> = {
  draft: "ЧЕРНОВА",
  issued: "ИЗДАДЕНА",
  sent: "ИЗПРАТЕНА",
  partially_paid: "ЧАСТИЧНО ПЛ.",
  paid: "ПЛАТЕНА",
  overdue: "ПРОСРОЧЕНА",
  cancelled: "АНУЛИРАНА",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "stamp-draft",
  issued: "stamp-sent",
  sent: "stamp-sent",
  partially_paid: "stamp-low",
  paid: "stamp-paid",
  overdue: "stamp-overdue",
  cancelled: "stamp-cancelled",
};

export function Stamp({ status }: { status: string }) {
  return (
    <span className={clsx("stamp", STATUS_CLASS[status] ?? "stamp-draft")}>
      {STATUS_LABELS[status] ?? status.toUpperCase()}
    </span>
  );
}
