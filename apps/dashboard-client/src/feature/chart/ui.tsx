import { XAxis, CartesianGrid, Bar, BarChart } from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../shared/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../shared/ui/chart';
import { Button } from '../../shared/ui/button';
import { DayStat } from '../../types';
import { useState } from 'react';

export type ChartMode = 'count' | 'volume';

type Props = {
  data: DayStat[];
};

const configCount = {
  created_count: { label: 'Create', color: 'var(--chart-1)' },
  fulfilled_count: { label: 'Fulfill', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const configVolume = {
  created_volume_usd: { label: 'Create $', color: 'var(--chart-1)' },
  fulfilled_volume_usd: { label: 'Fulfill $', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const formatUsd = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '-';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

export function OrdersChart({ data }: Props) {
  const [mode, setMode] = useState<ChartMode>('count');

  const isVolume = mode === 'volume';

  const createKey = isVolume ? 'created_volume_usd' : 'created_count';
  const fulfillKey = isVolume ? 'fulfilled_volume_usd' : 'fulfilled_count';
  const config = isVolume ? configVolume : configCount;

  const chartData = data.map((item) => ({
    day: item.day.slice(0, 10),
    created_count: Number(item.created_count),
    created_volume_usd: Number(item.created_volume_usd),
    fulfilled_count: Number(item.fulfilled_count),
    fulfilled_volume_usd: Number(item.fulfilled_volume_usd),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between w-full">
          <CardTitle>Orders activity</CardTitle>
          <div className="flex gap-x-2">
            <Button
              onClick={() => setMode('count')}
              variant={mode === 'count' ? 'default' : 'outline'}
            >
              Count
            </Button>
            <Button
              onClick={() => setMode('volume')}
              variant={mode === 'volume' ? 'default' : 'outline'}
            >
              Volume
            </Button>
          </div>
        </div>
        <CardDescription>
          {isVolume
            ? 'Create vs Fulfill volume (USD) per day'
            : 'Create vs Fulfill count per day'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer className="max-h-[500px] w-full" config={config}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  formatter={(value, name) => {
                    if (!isVolume) return [value, ' ', name];
                    return [formatUsd(value), ' ', name];
                  }}
                />
              }
            />
            <Bar dataKey={createKey} fill="var(--chart-1)" radius={4} />
            <Bar dataKey={fulfillKey} fill="var(--chart-2)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          {isVolume ? 'Volume dynamics' : 'Count dynamics'}{' '}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground">Aggregated by day</div>
      </CardFooter>
    </Card>
  );
}
