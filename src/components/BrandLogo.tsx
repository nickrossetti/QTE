export function BrandLogo({ className = "h-14" }: { className?: string }) {
  return (
    // The official artwork can replace public/brand/logo.svg without a code change.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.svg" alt="QTE Quality Track Equipment" className={`${className} w-auto`} />
  );
}
