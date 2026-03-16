import { Lock } from 'lucide-react';

interface ForbiddenProps {
  requiredRole: string;
}

export default function Forbidden({ requiredRole }: ForbiddenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <h2 className="text-xl font-semibold text-foreground">Access restricted</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        You need the <span className="font-medium text-foreground">{requiredRole}</span> role or
        higher to view this page.
      </p>
    </div>
  );
}
