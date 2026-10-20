import SiteImage from './SiteImage';

/**
 * The club logo, swapped for the white-on-dark version under a dark color
 * scheme. Each <source> carries its own size because the two logos differ in
 * aspect ratio; without it dark mode reserves the light logo's wider box and
 * shifts the layout. The WebP files are 2x the header's 44px-tall display
 * size; `large` uses the full-size PNGs for spots shown wider than that.
 */
export default function ClubLogo({
  className,
  alt = 'Clemson Quantum Club',
  eager = false,
  large = false,
}: {
  className?: string;
  alt?: string;
  /** Above the fold: skip lazy loading. */
  eager?: boolean;
  large?: boolean;
}) {
  const light = large
    ? { src: '/images/logo-light.png', width: 258, height: 176 }
    : { src: '/images/logo-light.webp', width: 110, height: 88 };
  const dark = large
    ? { src: '/images/logo-dark.png', width: 208, height: 176 }
    : { src: '/images/logo-dark.webp', width: 105, height: 88 };
  return (
    <picture>
      <source
        srcSet={dark.src}
        media="(prefers-color-scheme: dark)"
        width={dark.width}
        height={dark.height}
      />
      <SiteImage
        src={light.src}
        alt={alt}
        className={className}
        width={light.width}
        height={light.height}
        {...(eager ? { loading: 'eager' as const } : {})}
      />
    </picture>
  );
}
