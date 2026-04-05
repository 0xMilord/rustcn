import React from 'react';
import { StatCard, StatCardProps } from './StatCard.js';

export interface KpiGridProps {
  stats: StatCardProps[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function KpiGrid({ stats, columns = 3, className }: KpiGridProps) {
  const cols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={`grid gap-4 ${cols[columns]} ${className ?? ''}`}>
      {stats.map((stat, i) => (
        <StatCard key={i} {...stat} />
      ))}
    </div>
  );
}
