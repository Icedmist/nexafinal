interface NexaLogoProps {
  variant?: "full" | "icon";
  colorMode?: "brand" | "monochrome";
  height?: number | string;
  className?: string;
  id?: string;
}

export function NexaLogo({
  variant = "full",
  colorMode = "brand",
  height = 32,
  className = "",
  id = "nexastoreos-logo"
}: NexaLogoProps) {
  const isMonochrome = colorMode === "monochrome";
  const iconColorLeft = isMonochrome ? "currentColor" : "var(--nexa-blue)";
  const iconColorRight = isMonochrome ? "currentColor" : "var(--nexa-cyan)";
  const textPrimaryColor = isMonochrome ? "currentColor" : "var(--nexa-blue)";
  const textSecondaryColor = isMonochrome ? "currentColor" : "var(--nexa-cyan)";
  const textTertiaryColor = isMonochrome ? "currentColor" : "var(--muted-foreground)";

  const wordmarkFont = {
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif",
    fontWeight: 900,
    fontSize: "19px",
    letterSpacing: "-0.5px"
  } as const;

  if (variant === "icon") {
    return (
      <svg
        id={id}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
        className={className}
      >
        <path
          d="M 8 25 C 8 16 9.5 7 12 7 L 19.5 24"
          stroke={iconColorLeft}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 21.5 24 C 23.2 17 24.5 12 24.5 7"
          stroke={iconColorRight}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      id={id}
      viewBox="0 0 210 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height }}
      className={className}
    >
      <g transform="translate(2, 4)">
        <path
          d="M 8 25 C 8 16 9.5 7 12 7 L 19.5 24"
          stroke={iconColorLeft}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 21.5 24 C 23.2 17 24.5 12 24.5 7"
          stroke={iconColorRight}
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </g>

      <text x="38" y="26" fill={textPrimaryColor} style={wordmarkFont}>
        Nexa
      </text>
      <text x="84" y="26" fill={textSecondaryColor} style={{ ...wordmarkFont, fontWeight: 800 }}>
        Store
      </text>
      <text x="137" y="26" fill={textTertiaryColor} style={{ ...wordmarkFont, fontWeight: 700 }}>
        OS
      </text>
    </svg>
  );
}
