import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  ...props,
});

export const IconInvoice = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h2" /></svg>
);
export const IconWarehouse = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 21V9l9-5 9 5v12" /><path d="M3 21h18M7 21v-7h10v7M9 14v7M15 14v7" /></svg>
);
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5M21 20a6 6 0 0 0-4-5.6" /></svg>
);
export const IconExpense = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>
);
export const IconChart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 3v18h18" /><path d="M7 15l3-4 3 2 4-6" /></svg>
);
export const IconProjects = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 7h18M3 7l2-3h14l2 3M3 7v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7" /><path d="M9 12h6" /></svg>
);
export const IconCash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
);
export const IconShield = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const IconRocket = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2" /><path d="M9 12a12 12 0 0 1 9-9 12 12 0 0 1-9 9z" /><path d="M9 12l3 3" /><circle cx="15" cy="9" r="1.3" /></svg>
);
export const IconSeed = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21v-7" /><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5z" /><path d="M12 14c0-3-2-5-6-5 0 3 2 5 6 5z" /></svg>
);
export const IconTrophy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 17h6M10 21h4M12 17v-2" /></svg>
);
export const IconCrown = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 7l4 4 5-7 5 7 4-4v11H3z" /><path d="M3 18h18" /></svg>
);
export const IconBuilding = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></svg>
);
export const IconCalc = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h4M8 18h.01M12 18h.01" /></svg>
);
export const IconBank = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10l9-6 9 6M4 10v9M20 10v9M8 10v9M12 10v9M16 10v9M3 21h18" /></svg>
);
export const IconDoc = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M14 2v6h6" /></svg>
);
export const IconCalculator = IconCalc;
