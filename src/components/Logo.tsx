import { clsx } from "clsx";

interface LogoProps {
  dark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ dark = false, size = "md" }: LogoProps) {
  const sealSize = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <div className="flex items-center gap-2.5">
      <div
        style={{
          width: sealSize,
          height: sealSize,
          borderRadius: "50%",
          border: "2px solid var(--brass)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "var(--brass)",
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: sealSize * 0.38,
          transform: "rotate(-6deg)",
          background: "rgba(166,130,47,.12)",
        }}
      >
        CD
      </div>
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
            color: "var(--brass)",
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
