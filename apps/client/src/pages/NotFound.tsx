import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-9xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold text-foreground">This page doesn&apos;t exist</h1>
      <Link
        to="/"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
