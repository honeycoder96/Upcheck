interface PlanLimitBannerProps {
  current: number;
  max: number;
}

export default function PlanLimitBanner({ current, max }: PlanLimitBannerProps) {
  if (current < max) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
      <span>
        You&apos;ve reached your monitor limit ({current}/{max}). Upgrade to add more monitors.
      </span>
    </div>
  );
}
