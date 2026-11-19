import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-accentstrong to-accent shadow-[0_0_20px_-4px_var(--accent)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 7 3 12l5 5" />
        <path d="m16 7 5 5-5 5" />
        <circle cx="12" cy="12" r="1.6" fill="white" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight">
      <LogoMark />
      <span className="text-[15px]">
        CodeLens <span className="text-accentstrong">AI</span>
      </span>
    </Link>
  );
}
