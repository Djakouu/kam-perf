
import { cn } from '../../lib/utils';

interface BadgeProps {
  value: number;
  unit?: string;
}

export function Badge({ value, unit = 'ms' }: BadgeProps) {
  let colorClass = "bg-status-good/10 text-status-good border-status-good/20"; // <= 500
  
  if (value > 2000) {
    colorClass = "bg-status-critical/10 text-status-critical border-status-critical/20";
  } else if (value > 1000) {
    colorClass = "bg-status-danger/10 text-status-danger border-status-danger/20";
  } else if (value > 500) {
    colorClass = "bg-status-warning/10 text-status-warning border-status-warning/20";
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      colorClass
    )}>
      {value}{unit}
    </span>
  );
}
