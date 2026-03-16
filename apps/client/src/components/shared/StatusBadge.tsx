import { cn } from '../../lib/utils';
import type { MonitorStatus } from '@uptimemonitor/shared/constants';

interface StatusBadgeProps {
  status: MonitorStatus;
}

const statusConfig: Record<MonitorStatus, { dot: string; label: string }> = {
  up: { dot: 'bg-green-500', label: 'Up' },
  down: { dot: 'bg-red-500', label: 'Down' },
  paused: { dot: 'bg-gray-400', label: 'Paused' },
  pending: { dot: 'bg-gray-300', label: 'Pending' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { dot, label } = statusConfig[status];

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border border-border bg-card text-foreground">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
