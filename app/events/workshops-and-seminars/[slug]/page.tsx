import { createSlugPage } from '@/lib/slugPage';

const page = createSlugPage('events/workshops-and-seminars');

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
