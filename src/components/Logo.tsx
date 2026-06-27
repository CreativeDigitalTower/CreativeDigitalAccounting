import { clsx } from "clsx";

interface LogoProps {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ dark = false, size = "md" }: LogoProps) {
  const sealSize = size === "sm" ? 30 : size === "lg" ? 52 : 40;
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/cda-logo.png"
        alt="Creative Digital Accounting"
        width={sealSize}
        height={sealSize}
        style={{ width: sealSize, height: sealSize, borderRadius: "50%", flexShrink: 0, objectFit: "contain", background: dark ? "#fff" : "transparent" }}
      />
      <div>
        <div
          className={clsx("font-serif font-semibold leading-tight", textSize)}
          style={{ color: dark ? "#E9E7DA" : "var(--ink)", letterSpacing: ".2px" }}
        >
          Creative Digital
        </div>
        <div
          style={{
            fontSize: 9.5,
            color: dark ? "var(--brass)" : "var(--emerald)",
            letterSpacing: "1.6px",
            fontWeight: 600,
            marginTop: 1,
          }}
        >
          ACCOUNTING
        </div>
      </div>
    </div>
  );
}
