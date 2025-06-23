import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistance } from 'date-fns';
import React from 'react';
import { COLORS } from './styles';
import { formatLocal } from './utils';

// --- Ribbon Visualization Subcomponent ---
type RibbonEvent = {
  type: 'refDate' | 'selectedDate' | 'nextStart';
  date: Date;
};
type RibbonRange = {
  type: 'lastActiveRange' | 'nextRanges';
  start: Date;
  end: Date;
};

function getTimeSpan(refDate: Date, selectedDate: Date, results: Record<string, unknown> | null): { start: Date; end: Date } {
  let min = Math.min(refDate.getTime(), selectedDate.getTime());
  let max = Math.max(refDate.getTime(), selectedDate.getTime());
  if (results) {
    const addDate = (d: unknown) => {
      if (d instanceof Date) {
        min = Math.min(min, d.getTime());
        max = Math.max(max, d.getTime());
      }
    };
    const addRange = (r: unknown) => {
      if (
        r &&
        typeof r === 'object' &&
        'start' in r &&
        'end' in r &&
        (r as { start: unknown }).start instanceof Date &&
        (r as { end: unknown }).end instanceof Date
      ) {
        const startDate = (r as { start: Date }).start;
        const endDate = (r as { end: Date }).end;
        min = Math.min(min, startDate.getTime());
        max = Math.max(max, endDate.getTime());
      }
    };
    addDate(results.nextStart);
    if (
      results.lastActiveRange &&
      typeof results.lastActiveRange === 'object' &&
      'start' in results.lastActiveRange &&
      'end' in results.lastActiveRange &&
      (results.lastActiveRange as { start: unknown }).start instanceof Date &&
      (results.lastActiveRange as { end: unknown }).end instanceof Date
    ) {
      addRange(results.lastActiveRange);
    }
    if (Array.isArray(results.nextRanges)) {
      for (const r of results.nextRanges) addRange(r);
    }
  }
  if (min === max) {
    // 1 hour window centered on selectedDate
    min = selectedDate.getTime() - 30 * 60 * 1000;
    max = selectedDate.getTime() + 30 * 60 * 1000;
  }

  return { start: new Date(min), end: new Date(max) };
}

function getHourTicks(start: Date, end: Date) {
  const ticks = [];
  const d = new Date(start);
  d.setMinutes(0, 0, 0);
  while (d <= end) {
    ticks.push(new Date(d));
    d.setHours(d.getHours() + 1);
  }
  return ticks;
}
function getDayTicks(start: Date, end: Date) {
  const ticks = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    ticks.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return ticks;
}
function getMonthTicks(start: Date, end: Date) {
  const ticks = [];
  const d = new Date(start);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    ticks.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}
function getYearTicks(start: Date, end: Date) {
  const ticks = [];
  const d = new Date(start);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  while (d <= end) {
    ticks.push(new Date(d));
    d.setFullYear(d.getFullYear() + 1);
  }
  return ticks;
}

export const TimeRibbon: React.FC<{
  refDate: Date;
  selectedDate: Date;
  results: Record<string, unknown> | null;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}> = ({ refDate, selectedDate, results, zoomLevel, onZoomChange }) => {
  // Gather events and ranges
  const events: RibbonEvent[] = [
    { type: 'refDate', date: refDate },
    { type: 'selectedDate', date: selectedDate },
  ];
  if (results) {
    if (results.nextStart instanceof Date) events.push({ type: 'nextStart', date: results.nextStart });
  }
  const ranges: RibbonRange[] = [];
  if (results) {
    if (
      results.lastActiveRange &&
      typeof results.lastActiveRange === 'object' &&
      'start' in results.lastActiveRange &&
      'end' in results.lastActiveRange &&
      (results.lastActiveRange as { start: unknown }).start instanceof Date &&
      (results.lastActiveRange as { end: unknown }).end instanceof Date
    ) {
      ranges.push({
        type: 'lastActiveRange',
        start: (results.lastActiveRange as { start: Date }).start,
        end: (results.lastActiveRange as { end: Date }).end,
      });
    }
    if (Array.isArray(results.nextRanges)) {
      for (const r of results.nextRanges) {
        if (
          r &&
          typeof r === 'object' &&
          'start' in r &&
          'end' in r &&
          (r as { start: unknown }).start instanceof Date &&
          (r as { end: unknown }).end instanceof Date
        ) {
          ranges.push({ type: 'nextRanges', start: (r as { start: Date }).start, end: (r as { end: Date }).end });
        }
      }
    }
  }
  // Compute time span (unchanged by zoom)
  const { start, end } = getTimeSpan(refDate, selectedDate, results);
  // Adjust time span based on zoom level
  let adjustedStart = start;
  let adjustedEnd = end;

  if (zoomLevel < 1) {
    const originalRange = end.getTime() - start.getTime();
    const expansionFactor = 1 / zoomLevel;
    const expandedRange = originalRange * expansionFactor;
    const center = start.getTime() + originalRange / 2;

    adjustedStart = new Date(center - expandedRange / 2);
    adjustedEnd = new Date(center + expandedRange / 2);
  }

  // Use adjusted range for calculations
  const totalMs = adjustedEnd.getTime() - adjustedStart.getTime();
  const totalMinutes = totalMs / (60 * 1000);

  // Calculate visible time range based on zoom level and container width
  const baseWidth = 800;
  const ribbonWidth = Math.max(baseWidth, baseWidth * zoomLevel);
  const visibleTimeMinutes = totalMinutes / zoomLevel;
  // const visibleEnd = new Date(start.getTime() + visibleTimeMinutes * 60 * 1000);

  // Determine tick granularity based on visible time range
  let ticks: Date[] = [];
  let tickLabelType: 'hour' | 'day' | 'month' | 'year' | null = null;
  if (visibleTimeMinutes < 200 * 60) {
    ticks = getHourTicks(adjustedStart, adjustedEnd);
    tickLabelType = 'hour';
    if (visibleTimeMinutes > 20 * 60) {
      tickLabelType = 'day';
    }
  } else if (visibleTimeMinutes < 200 * 24 * 60) {
    ticks = getDayTicks(adjustedStart, adjustedEnd);
    tickLabelType = 'day';
    if (visibleTimeMinutes > 10 * 24 * 60) {
      tickLabelType = 'month';
    }
  } else if (visibleTimeMinutes < 300 * 30 * 24 * 60) {
    ticks = getMonthTicks(adjustedStart, adjustedEnd);
    tickLabelType = 'month';
    if (visibleTimeMinutes > 20 * 30 * 24 * 60) {
      tickLabelType = 'year';
    }
  } else {
    ticks = getYearTicks(adjustedStart, adjustedEnd);
    tickLabelType = 'year';
  }

  // Stacking: group ranges by type for vertical stacking
  const stackTypes = ['lastActiveRange', 'nextRanges'] as const;
  const stackMap: Record<string, RibbonRange[]> = {};
  for (const t of stackTypes) stackMap[t] = [];
  for (const r of ranges) stackMap[r.type].push(r);

  // Render
  return (
    <div className="flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <span>Zoom:</span>
        <span className="text-muted-foreground min-w-[40px]">{zoomLevel.toFixed(1)}x</span>
        <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.max(0.25, zoomLevel / 1.5))} disabled={zoomLevel <= 0.25}>
          Zoom Out
        </Button>
        <Button variant="outline" size="sm" onClick={() => onZoomChange(Math.min(16, zoomLevel * 1.5))} disabled={zoomLevel >= 16}>
          Zoom In
        </Button>
      </div>

      {/* Ribbon container with horizontal scroll */}
      <div className="overflow-x-auto border rounded-lg">
        <div style={{ width: ribbonWidth, position: 'relative' }}>
          {/* Tick labels above ribbon */}
          <div style={{ height: 30, position: 'relative', marginBottom: 4 }}>
            {ticks.map((tick, i) => {
              if (tickLabelType === 'hour' && tick.getMinutes() !== 0) return null;
              if (tickLabelType === 'day' && tick.getHours() !== 0) return null;
              if (tickLabelType === 'month' && tick.getDate() !== 1) return null;
              if (tickLabelType === 'year' && tick.getMonth() !== 0) return null;
              const pos = ((tick.getTime() - adjustedStart.getTime()) / totalMs) * 100;
              const label =
                tickLabelType === 'hour'
                  ? tick.getHours() + ':00'
                  : tickLabelType === 'day'
                    ? tick.toLocaleDateString()
                    : tickLabelType === 'month'
                      ? tick.toLocaleString('default', { month: 'short', year: 'numeric' })
                      : tick.getFullYear().toString();
              return (
                <div
                  key={tickLabelType + i}
                  style={{
                    position: 'absolute',
                    left: `${pos}%`,
                    transform: 'translateX(-50%)',
                    color: '#666',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Main ribbon */}
          <div
            style={{
              width: '100%',
              height: 80,
              position: 'relative',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}
          >
            {/* Ranges, stacked */}
            {stackTypes.map((type, stackIdx) =>
              stackMap[type].map((r, i) => {
                const left = ((r.start.getTime() - adjustedStart.getTime()) / totalMs) * 100;
                const right = ((r.end.getTime() - adjustedStart.getTime()) / totalMs) * 100;
                const color = COLORS[type];
                return (
                  <Popover key={type + i}>
                    <PopoverTrigger asChild>
                      <div
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `${right - left}%`,
                          top: 4 + stackIdx * ((80 - 8) / stackTypes.length),
                          height: (80 - 8) / stackTypes.length,
                          background: color,
                          borderRadius: 4,
                          opacity: 0.7,
                          cursor: 'pointer',
                        }}
                      />
                    </PopoverTrigger>
                    <PopoverContent sideOffset={4}>
                      <div>
                        <div>
                          <b>{type}</b>
                        </div>
                        <div>
                          start: {formatLocal(r.start)}
                          <br />
                          {formatDistance(r.start, selectedDate, { addSuffix: true })}
                        </div>
                        <div>
                          end (exclusive): {formatLocal(r.end)}
                          <br />
                          {formatDistance(r.end, selectedDate, { addSuffix: true })}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              }),
            )}
            {/* Events (vertical lines) */}
            {events.map((ev, i) => {
              const pos = ((ev.date.getTime() - adjustedStart.getTime()) / totalMs) * 100;
              const color = COLORS[ev.type];
              const style: React.CSSProperties = {
                position: 'absolute',
                left: `${pos}%`,
                top: 0,
                height: '100%',
                width: 2,
                background: color,
                zIndex: 2,
              };
              if (ev.type === 'nextStart') {
                style.background = COLORS.nextStart;
              }
              return (
                <Popover key={ev.type + i}>
                  <PopoverTrigger asChild>
                    <div style={style} />
                  </PopoverTrigger>
                  <PopoverContent sideOffset={4}>
                    <div>
                      <div>
                        <b>{ev.type}</b>
                      </div>
                      <div>{formatLocal(ev.date)}</div>
                      <div>{formatDistance(ev.date, selectedDate, { addSuffix: true })}</div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
            {/* Ticks (dotted lines) */}
            {ticks.map((tick, i) => {
              const pos = ((tick.getTime() - adjustedStart.getTime()) / totalMs) * 100;
              const special =
                (tickLabelType === 'hour' && tick.getMinutes() === 0) ||
                (tickLabelType === 'day' && tick.getHours() === 0) ||
                (tickLabelType === 'month' && tick.getDate() === 1) ||
                (tickLabelType === 'year' && tick.getMonth() === 0);
              const color = special ? '#000' : '#222';
              const width = special ? 2 : 1;
              return (
                <div
                  key={tickLabelType + i}
                  style={{
                    position: 'absolute',
                    left: `${pos}%`,
                    top: 0,
                    height: '100%',
                    width: 1,
                    borderLeft: `${width}px dotted ${color}`,
                    opacity: 0.4,
                    zIndex: 1,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
