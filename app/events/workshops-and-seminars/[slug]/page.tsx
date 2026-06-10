import { createSlugPage } from '@/lib/slugPage';

const page = createSlugPage('events/workshops-and-seminars', {
  notFound: <div>Page not found.</div>,
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
