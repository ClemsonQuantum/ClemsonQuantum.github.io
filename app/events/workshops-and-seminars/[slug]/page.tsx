import { createSlugPage } from '@/lib/slugPage';
import MarkdownDiv from '@/components/MarkdownDiv';

// The shared MarkdownDiv enables the sentinel-class components (quantum hero
// canvas, falling leaves, countdown) on hosted workshop pages — e.g. Qiskit
// Fall Fest 2026. Plain-markdown pages pass through it untouched.
const page = createSlugPage('events/workshops-and-seminars', {
  components: { div: MarkdownDiv },
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
