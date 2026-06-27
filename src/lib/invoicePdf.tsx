"use client";

import { createRoot } from "react-dom/client";
import { InvoiceDocument, type InvoiceData } from "@/components/app/InvoiceDocument";

type Company = {
  name: string; mol: string | null; address: string | null; city: string | null;
  eik: string | null; vatNumber: string | null; bankIban: string | null; bankName: string | null; bankBic: string | null;
  logoUrl: string | null;
};

let cachedCompany: Company | null = null;
async function getCompany(): Promise<Company | null> {
  if (cachedCompany) return cachedCompany;
  const r = await fetch("/api/company");
  if (!r.ok) return null;
  cachedCompany = await r.json();
  return cachedCompany;
}

async function buildData(id: string): Promise<InvoiceData | null> {
  const [docRes, company] = await Promise.all([fetch(`/api/documents/${id}`), getCompany()]);
  if (!docRes.ok || !company) return null;
  const doc = await docRes.json();
  return {
    type: doc.type, number: doc.number, issueDate: doc.issueDate, taxEventDate: doc.taxEventDate, dueDate: doc.dueDate,
    currency: doc.currency, paymentMethod: doc.paymentMethod, notes: doc.notes, template: doc.template,
    logoUrl: company.logoUrl,
    company: {
      name: company.name, mol: company.mol, address: company.address, city: company.city,
      eik: company.eik, vatNumber: company.vatNumber, bankIban: company.bankIban, bankName: company.bankName, bankBic: company.bankBic,
    },
    client: doc.client ? {
      name: doc.client.name, mol: doc.client.mol, address: doc.client.address, city: doc.client.city,
      eik: doc.client.eik, vatNumber: doc.client.vatNumber,
    } : null,
    lines: (doc.lines ?? []).map((l: { id: string; description: string; quantity: number; unitPrice: number; vatRate: number; lineTotal: number }) => ({
      id: l.id, description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, vatRate: l.vatRate, lineTotal: l.lineTotal,
    })),
  };
}

async function renderCanvas(host: HTMLElement, data: InvoiceData, html2canvas: typeof import("html2canvas-pro").default) {
  const holder = document.createElement("div");
  holder.style.width = "800px";
  holder.style.background = "#ffffff";
  host.appendChild(holder);
  const root = createRoot(holder);
  await new Promise<void>((resolve) => {
    root.render(<InvoiceDocument data={data} />);
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise((r) => setTimeout(r, 180)); // изчакване на шрифтове/лого
  const printable = (holder.querySelector(".printable") as HTMLElement) ?? holder;
  const canvas = await html2canvas(printable, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
  root.unmount();
  host.removeChild(holder);
  return canvas;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addCanvas(pdf: any, canvas: HTMLCanvasElement, isFirst: boolean) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL("image/jpeg", 0.95);
  let heightLeft = imgH;
  let position = margin;
  if (!isFirst) pdf.addPage();
  pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
  heightLeft -= (pageH - margin * 2);
  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(img, "JPEG", margin, position, imgW, imgH);
    heightLeft -= (pageH - margin * 2);
  }
}

/** Сваля една или няколко фактури в общ PDF файл. */
export async function downloadInvoicesPdf(ids: string[], filename: string): Promise<void> {
  if (ids.length === 0) return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  document.body.appendChild(host);
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    let first = true;
    for (const id of ids) {
      const data = await buildData(id);
      if (!data) continue;
      const canvas = await renderCanvas(host, data, html2canvas);
      addCanvas(pdf, canvas, first);
      first = false;
    }
    pdf.save(`${filename}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
