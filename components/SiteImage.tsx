/* eslint-disable @next/next/no-img-element */

interface SiteImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function SiteImage({ src, alt, ...props }: SiteImageProps) {
  return <img src={src} alt={alt} {...props} />;
}
