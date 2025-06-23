import { format, formatDistance } from 'date-fns';
import React from 'react';

export function formatLocal(date: Date): string {
  return format(date, 'iii yyyy-MM-dd HH:mm:ss');
}

export function formatDateBoth(date: Date | undefined, relDate: Date): React.ReactNode {
  if (!date) return <span>null</span>;
  return (
    <>
      <span>{formatLocal(date)}</span>
      <br />
      <span className="ml-2 text-muted-foreground">[{formatDistance(date, relDate, { addSuffix: true })}]</span>
    </>
  );
}
