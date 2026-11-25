export function BrandLogo({ className = "h-14" }: { className?: string }) {
  return (
    // Cropped from public/brand/app-background.png. Do not redraw.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/qte-logo.png" alt="QTE Quality Track Equipment" className={`${className} w-auto`} />
  );
}
