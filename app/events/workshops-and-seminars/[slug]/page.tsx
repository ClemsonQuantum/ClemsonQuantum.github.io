import { createSlugPage } from '@/lib/slugPage';
import { BANNER_SIZE } from '@/lib/og';
import { EVENT_COMPONENTS } from '@/components/eventComponents';
import '@/assets/css/qff.css';

const page = createSlugPage('events/workshops-and-seminars', {
  components: EVENT_COMPONENTS,
  imageSize: BANNER_SIZE,
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
