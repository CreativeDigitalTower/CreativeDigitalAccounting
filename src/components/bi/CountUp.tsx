"use client";

import { useEffect, useRef, useState } from "react";

/** Дискретна count-up анимация на число (валута/бройка). */
export function CountUp({ value, money = false, decimals, duration = 900 }: { value: number; money?: boolean; decimals?: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const dec = decimals ?? (money ? 0 : 0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (value - from) * ease(t));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);

  const formatted = display.toLocaleString("bg-BG", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return <span>{formatted}{money ? " €" : ""}</span>;
}
