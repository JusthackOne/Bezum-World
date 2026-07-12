import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit/card";

interface BalanceIndicatorProps {
  title: string;
  balancePercent: number;
  description: string;
  ariaLabel: string;
}

export function BalanceIndicator({
  title,
  balancePercent,
  description,
  ariaLabel,
}: BalanceIndicatorProps) {
  const displayBalancePercent = Number.isNaN(balancePercent) ? 0 : Math.max(0, balancePercent);
  const meterValue = Number.isFinite(displayBalancePercent) ? displayBalancePercent : 200;
  const indicatorPosition = Math.min(100, meterValue / 2);
  const formattedPercent = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(displayBalancePercent);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center text-xs font-medium text-muted-foreground">100%</div>
        <div
          className="relative h-5"
          role="meter"
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={200}
          aria-valuenow={Math.min(200, meterValue)}
          aria-valuetext={`${formattedPercent}%. ${description}`}
        >
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-gradient-to-r from-red-500 via-green-500 to-purple-600" />
          <div
            className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground ring-1 ring-background"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow-md transition-[left] duration-300 ease-out motion-reduce:transition-none"
            style={{ left: `${indicatorPosition}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-start justify-between gap-3 text-sm">
          <p className="font-medium">{description}</p>
          <span className="shrink-0 tabular-nums text-muted-foreground">{formattedPercent}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
