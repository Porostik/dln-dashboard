export type DateRange = {
  from?: Date;
  to?: Date;
};

export type DayStat = {
  day: string;
  created_count: number;
  fulfilled_count: number;
  created_volume_usd: number;
  fulfilled_volume_usd: number;
};
