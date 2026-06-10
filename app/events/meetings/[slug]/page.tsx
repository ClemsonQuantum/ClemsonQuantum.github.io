import { createSlugPage } from '@/lib/slugPage';

const page = createSlugPage('events/meetings');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
