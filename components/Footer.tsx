export default function Footer() {
  return (
    <footer>
      <p>
        &copy; {new Date().getFullYear()} Clemson Quantum.{' '}
        Built with <a href="https://nextjs.org" target="_blank" rel="noopener">Next.js</a>.
      </p>
    </footer>
  );
}
