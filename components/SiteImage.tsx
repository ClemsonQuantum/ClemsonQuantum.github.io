/* eslint-disable @next/next/no-img-element -- static export serves images as-is, so next/image adds nothing (docs/DEVELOPMENT.md, "Images are plain <img>") */

interface SiteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function SiteImage({ src, alt, ...props }: SiteImageProps) {
  // lazy/async are defaults only — they sit before the spread so callers can
  // override them (e.g. the homepage featured-band image loads eagerly).
  return <img loading="lazy" decoding="async" src={src} alt={alt} {...props} />;
}
