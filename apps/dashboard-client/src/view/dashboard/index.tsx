import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DayStat, type DateRange } from '../../types';
import { Filters } from '../../feature/filters';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { OrdersChart } from '../../feature/chart';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

function toYyyyMmDd(date: Date) {
  return date.toDateString();
}

async function fetchDailyVolume(range: DateRange): Promise<DayStat[]> {
  const url = new URL(`${API_BASE}/dashboard/daily-volume`);
  if (range.from) url.searchParams.set('from', toYyyyMmDd(range.from));
  if (range.to) url.searchParams.set('to', toYyyyMmDd(range.to));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function Dashboard() {
  const [range, setRange] = React.useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const query = useQuery({
    queryKey: [
      'daily-volume',
      range.from?.toLocaleDateString() ?? null,
      range.to?.toLocaleDateString() ?? null,
    ],
    queryFn: () => fetchDailyVolume(range),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 5_000,
  });

  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 md:p-8">
      <Card className="border-border/60">
        <CardHeader className="gap-2">
          <CardTitle className="text-xl md:text-2xl">DLN Dashboard</CardTitle>
          <Filters value={range} onChange={setRange} />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {query.isLoading && 'Loading…'}
            {query.isError && `Error: ${(query.error as Error).message}`}
            {query.isSuccess && `Days: ${query.data.length}`}
          </div>

          <OrdersChart data={query.data ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
