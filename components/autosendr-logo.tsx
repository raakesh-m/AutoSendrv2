"use client";

interface AutoSendrLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "icon-only" | "text-only";
  className?: string;
}

export function AutoSendrLogo({
  size = "md",
  variant = "default",
  className = "",
}: AutoSendrLogoProps) {
  const sizes = {
    sm: { width: 120, height: 36, iconSize: 20, fontSize: 16 },
    md: { width: 160, height: 48, iconSize: 24, fontSize: 20 },
    lg: { width: 200, height: 60, iconSize: 32, fontSize: 24 },
  };

  const currentSize = sizes[size];

  if (variant === "icon-only") {
    return (
      <svg
        width={currentSize.iconSize}
        height={currentSize.iconSize}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
      >
        <path
          d="M2 12l7-7 3 3 7-7v5l-7 7-3-3-7 7z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (variant === "text-only") {
    return (
      <span
        className={`font-bold text-primary ${className}`}
        style={{ fontSize: currentSize.fontSize }}
      >
        AutoSendr
      </span>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        width={currentSize.iconSize}
        height={currentSize.iconSize}
        viewBox="0 0 24 24"
        fill="none"
        className="text-primary"
      >
        <path
          d="M2 12l7-7 3 3 7-7v5l-7 7-3-3-7 7z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
        />
      </svg>
      <span
        className="font-bold text-primary"
        style={{ fontSize: currentSize.fontSize }}
      >
        AutoSendr
      </span>
    </div>
  );
}
