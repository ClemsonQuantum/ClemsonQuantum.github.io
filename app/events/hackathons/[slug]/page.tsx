import { createSlugPage } from '@/lib/slugPage';
import { BANNER_SIZE } from '@/lib/og';
import { EVENT_COMPONENTS } from '@/components/eventComponents';

const page = createSlugPage('events/hackathons', {
  components: EVENT_COMPONENTS,
  imageSize: BANNER_SIZE,
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
