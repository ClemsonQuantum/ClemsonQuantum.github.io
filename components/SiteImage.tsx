/* eslint-disable @next/next/no-img-element */

interface SiteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function SiteImage({ src, alt, ...props }: SiteImageProps) {
  // lazy/async are defaults only — they sit before the spread so callers can
  // override them (e.g. the home hero loads eagerly as the LCP candidate).
  return <img loading="lazy" decoding="async" src={src} alt={alt} {...props} />;
}
