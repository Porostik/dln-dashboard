import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '../../shared/lib/utils';
import { Button } from '../../shared/ui/button';
import { Calendar } from '../../shared/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../shared/ui/popover';

export type DateRange = {
  from?: Date;
  to?: Date;
};

type Props = {
  value: DateRange;
  onChange: (next: DateRange) => void;
};

export function Filters({ value, onChange }: Props) {
  const reset = () => onChange({ from: undefined, to: undefined });

  const label = value.from
    ? value.to
      ? `${format(value.from, 'yyyy-MM-dd')} → ${format(value.to, 'yyyy-MM-dd')}`
      : format(value.from, 'yyyy-MM-dd')
    : 'Pick a date range';

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[280px] justify-start text-left font-normal',
                !value.from && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{ from: value.from, to: value.to }}
              onSelect={(range) => {
                onChange({ from: range?.from, to: range?.to });
              }}
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="secondary"
          onClick={reset}
          disabled={!value.from && !value.to}
        >
          Reset
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: click start date, then end date.
      </div>
    </div>
  );
}
