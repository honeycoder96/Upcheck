import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefetching: boolean;
  updatedAt: number | null;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}

export default function RefreshButton({ onRefresh, isRefetching, updatedAt }: RefreshButtonProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onRefresh}
        disabled={isRefetching}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        aria-label="Refresh data"
      >
        <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
        Refresh
      </button>
      {updatedAt !== null && (
        <span className="text-xs text-muted-foreground">Updated {formatTime(updatedAt)}</span>
      )}
    </div>
  );
}
