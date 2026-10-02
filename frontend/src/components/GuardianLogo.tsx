interface GuardianLogoProps {
  size?: number | string;
  className?: string;
  color?: string;
}

export function GuardianLogo({
  size = 20,
  className = "",
  color = "#ea4b71",
}: GuardianLogoProps) {
  return (
    <svg
      width={typeof size === "number" ? Math.round(size * 1.45) : size}
      height={size}
      viewBox="0 0 36 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="Guardian Logo"
    >
      {/* Horizontal connector from node 1 to node 2 */}
      <line
        x1="8.5"
        y1="12"
        x2="13.5"
        y2="12"
        stroke={color}
        strokeWidth="2.7"
        strokeLinecap="round"
      />

      {/* Upper fork: curves up from node 2 to node 3 (top right) */}
      <path
        d="M 19.5 12 C 22.5 12 24 6.5 27 6"
        stroke={color}
        strokeWidth="2.7"
        strokeLinecap="round"
      />

      {/* Lower fork: curves down from node 2 to node 4 (bottom right) */}
      <path
        d="M 19.5 12 C 22 12 23 17.5 25 18"
        stroke={color}
        strokeWidth="2.7"
        strokeLinecap="round"
      />

      {/* Node 1: Leftmost hollow circle */}
      <circle
        cx="5.5"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
      />

      {/* Node 2: Center-left hollow circle */}
      <circle
        cx="16.5"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
      />

      {/* Node 3: Top-right hollow circle */}
      <circle
        cx="29.5"
        cy="6"
        r="3"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
      />

      {/* Node 4: Bottom-right hollow circle */}
      <circle
        cx="27.5"
        cy="18"
        r="3"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
      />
    </svg>
  );
}
