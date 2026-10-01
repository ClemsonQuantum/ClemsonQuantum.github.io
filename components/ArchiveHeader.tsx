import ConstellationDivider from './ConstellationDivider';

// The title band at the top of the archive and resources pages.
export default function ArchiveHeader({ title }: { title: string }) {
  return (
    <header className="archive-hero">
      <h1 className="archive-hero__title">{title}</h1>
      <ConstellationDivider />
    </header>
  );
}
