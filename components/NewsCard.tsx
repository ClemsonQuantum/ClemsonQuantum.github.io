import { PageMeta } from '@/lib/types';
import PreviewCard from './PreviewCard';

interface NewsCardProps {
  item: PageMeta;
}

export default function NewsCard({ item }: NewsCardProps) {
  return <PreviewCard item={item} kind="news" />;
}
