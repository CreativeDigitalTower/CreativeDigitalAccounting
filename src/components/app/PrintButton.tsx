"use client";

export function PrintButton({ label = "↓ Изтегли PDF" }: { label?: string }) {
  function print() {
    document.body.classList.add("printing-doc");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-doc"), 500);
  }
  return <button onClick={print} className="btn btn-primary btn-sm no-print">{label}</button>;
}
