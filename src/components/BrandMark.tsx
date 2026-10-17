import Link from 'next/link';

export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-baseline font-black tracking-[0.16em] text-accent ${className}`}
      aria-label="VeriFit Startseite"
    >
      VERIFIT<span className="text-ink">.</span>
    </Link>
  );
}
