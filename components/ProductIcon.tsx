import { Product } from "@/lib/products";

export default function ProductIcon({ icon }: { icon: Product["icon"] }) {
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "blinds":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M4 8h16M4 12h16M4 16h16" />
        </svg>
      );
    case "shutter":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M4 7h16M4 10h16M4 13h16M4 16h16M4 19h16" />
        </svg>
      );
    case "awning":
      return (
        <svg {...common}>
          <path d="M3 11l1-5h16l1 5z" />
          <path d="M3 11h18M7 11l-1 4M12 11v4M17 11l1 4" />
        </svg>
      );
    case "net":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
        </svg>
      );
  }
}
