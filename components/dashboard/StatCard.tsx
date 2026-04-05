import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-sm p-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <p className={`text-xs mt-1 ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            {change.positive ? '\u2191' : '\u2193'} {change.value}% from last period
          </p>
        )}
      </div>
    </div>
  );
}
