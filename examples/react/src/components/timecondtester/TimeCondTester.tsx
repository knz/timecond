import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Cond, DateRange } from '@knz/timecond';
import { defaultTimeConfig, describe, parse, TimeConfig } from '@knz/timecond';
import React, { useEffect, useRef, useState } from 'react';
import { DateTimePicker } from './DateTimePicker';
import { COLOR_CLASSES } from './styles';
import { TimeCondInput } from './TimeCondInput';
import { TimeRibbon } from './TimeRibbon';
import { formatDateBoth } from './utils';

// --- Main Component ---
export const TimeCondTester: React.FC = () => {
  const [expr, setExpr] = useState<string>('');
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCond, setParsedCond] = useState<Cond | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExprValid, setIsExprValid] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [config, setConfig] = useState<TimeConfig>(defaultTimeConfig);
  const dateTimePickerRef = useRef<HTMLDivElement>(null);
  const resultsCardRef = useRef<HTMLDivElement>(null);
  const inputCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expr.trim() === '') {
      setIsExprValid(false);
      return;
    }
    try {
      parse(expr, config, refDate);
      setIsExprValid(true);
    } catch {
      setIsExprValid(false);
    }
  }, [expr, refDate, config]);

  useEffect(() => {
    if (results && resultsCardRef.current) {
      resultsCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [results]);

  const handleCopyExample = (example: string) => {
    setExpr(example);
    setDrawerOpen(false);
  };

  const handleNextClick = () => {
    if (dateTimePickerRef.current) {
      dateTimePickerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus the first button after scrolling
      setTimeout(() => {
        dateTimePickerRef.current?.querySelector('button')?.focus();
      }, 300); // Delay to allow scroll animation
    }
  };

  const handleExprChange = (newExpr: string) => {
    setExpr(newExpr);
    if (parseError) {
      setParseError(null);
    }
  };

  const handleClear = () => {
    setExpr('');
    setParseError(null);
    setResults(null);
    setParsedCond(null);
  };

  const handleTryAnother = () => {
    inputCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTest = () => {
    let cond: Cond;
    setParseError(null);
    setResults(null);
    setParsedCond(null);
    setZoomLevel(1);
    try {
      cond = parse(expr, config, refDate);
      setParsedCond(cond);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : String(e));
      setParsedCond(null);
      inputCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // Evaluate all outputs, catching errors individually
    const evalResult: Record<string, unknown> = {};
    // inRange
    try {
      evalResult.inRange = cond.inRange(selectedDate);
    } catch (e: unknown) {
      evalResult.inRange = { error: e instanceof Error ? e.message : String(e) };
    }
    // nextStart
    try {
      const val = cond.nextStart(selectedDate);
      evalResult.nextStart = val instanceof Date ? val : val;
    } catch (e: unknown) {
      evalResult.nextStart = { error: e instanceof Error ? e.message : String(e) };
    }
    // lastActiveRange
    try {
      const val = cond.lastActiveRange(selectedDate);
      evalResult.lastActiveRange = val ? val : val;
    } catch (e: unknown) {
      evalResult.lastActiveRange = { error: e instanceof Error ? e.message : String(e) };
    }
    // nextRanges
    try {
      const val = cond.nextRanges(selectedDate);
      evalResult.nextRanges = val && val.ranges ? val.ranges : val;
    } catch (e: unknown) {
      evalResult.nextRanges = { error: e instanceof Error ? e.message : String(e) };
    }
    setResults(evalResult);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card ref={inputCardRef}>
        <CardHeader>
          <CardTitle>Time Condition Input</CardTitle>
          <CardDescription>
            For more information, see the{' '}
            <a className="underline" href="https://github.com/knz/timecond/">
              GitHub repository
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {parseError && <pre className="text-red-600 whitespace-pre-wrap">{parseError}</pre>}
          <TimeCondInput
            expr={expr}
            onExprChange={handleExprChange}
            onClear={handleClear}
            showNextButton={isExprValid}
            onNextClick={handleNextClick}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            onCopyExample={handleCopyExample}
            config={config}
            onConfigChange={setConfig}
          />

          <div ref={dateTimePickerRef}>
            <DateTimePicker
              label="Date/Time of last occurrence (for condition types 'nth' and 'after')"
              bold={false}
              value={refDate}
              onChange={setRefDate}
            />
            <DateTimePicker label="Current Date/Time to evaluate" bold={true} value={selectedDate} onChange={setSelectedDate} />
          </div>
          <div className="flex justify-center pt-4">
            <Button onClick={handleTest} size="lg">
              Evaluate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card ref={resultsCardRef}>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {parsedCond && !parseError && (
            <div className="text-muted-foreground border rounded p-2 bg-muted/50">
              <span>Description: </span>
              {describe(parsedCond, config)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>inRange:</span>
            {results && results.inRange !== undefined ? (
              typeof results.inRange === 'object' && (results.inRange as { error?: string }).error ? (
                <Badge variant="destructive">Error</Badge>
              ) : results.inRange ? (
                <Badge variant="default">True</Badge>
              ) : (
                <Badge variant="secondary">False</Badge>
              )
            ) : null}{' '}
            <div className="text-xs text-muted-foreground">Whether the condition is satisfied at the current date/time.</div>
          </div>
          <div>
            <span className={`${COLOR_CLASSES.lastActiveRange}`}>lastActiveRange:</span>
            <div className="text-xs text-muted-foreground">The last period when the condition was satisfied.</div>
            <div className="ml-2">
              {results && results.lastActiveRange !== undefined ? (
                typeof results.lastActiveRange === 'object' && (results.lastActiveRange as { error?: string }).error ? (
                  <span className="text-red-600">{(results.lastActiveRange as { error: string }).error}</span>
                ) : results.lastActiveRange && typeof results.lastActiveRange === 'object' && 'start' in results.lastActiveRange ? (
                  <>
                    <div>
                      <span>from:</span> {formatDateBoth((results.lastActiveRange as DateRange).start, selectedDate)}
                    </div>
                    <div>
                      <span>to (excl):</span> {formatDateBoth((results.lastActiveRange as DateRange).end, selectedDate)}
                    </div>
                  </>
                ) : (
                  <span>{JSON.stringify(results.lastActiveRange, null, 2)}</span>
                )
              ) : null}
            </div>
          </div>
          <div>
            <span className={` ${COLOR_CLASSES.nextStart}`}>nextStart:</span>
            <div className="text-xs text-muted-foreground">The earliest next time when the condition will be satisfied.</div>
            <div className="ml-2 ">
              {results && results.nextStart !== undefined ? (
                typeof results.nextStart === 'object' && (results.nextStart as { error?: string }).error ? (
                  <span className="text-red-600">{(results.nextStart as { error: string }).error}</span>
                ) : results.nextStart instanceof Date ? (
                  formatDateBoth(results.nextStart, selectedDate)
                ) : (
                  <span>{JSON.stringify(results.nextStart, null, 2)}</span>
                )
              ) : null}
            </div>
          </div>
          <div>
            <span className={` ${COLOR_CLASSES.nextRanges}`}>nextRanges:</span>
            <div className="text-xs text-muted-foreground">The first few upcoming periods when the condition will be satisfied.</div>
            <div className="ml-2">
              {results && results.nextRanges !== undefined ? (
                typeof results.nextRanges === 'object' && (results.nextRanges as { error?: string }).error ? (
                  <span className="text-red-600">{(results.nextRanges as { error: string }).error}</span>
                ) : Array.isArray(results.nextRanges) ? (
                  <div className="flex flex-col gap-1">
                    {(results.nextRanges as DateRange[]).map((r, i) => (
                      <div key={i} className="pl-2 border-l border-muted-foreground/30">
                        <div>
                          <span>from:</span> {formatDateBoth(r.start, selectedDate)}
                        </div>
                        <div>
                          <span>to (excl):</span> {formatDateBoth(r.end, selectedDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>{JSON.stringify(results.nextRanges, null, 2)}</span>
                )
              ) : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Button onClick={handleTryAnother} variant="outline">
            Try Another
          </Button>
        </CardFooter>
      </Card>
      {/* Ribbon visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Visualization</CardTitle>
          <CardDescription>
            The visualization shows the condition's satisfaction over time.
            <br />
            The selected current date/time is highlighted in red.
            <br />
            The last occurrence of the condition is highlighted in purple.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimeRibbon refDate={refDate} selectedDate={selectedDate} results={results} zoomLevel={zoomLevel} onZoomChange={setZoomLevel} />
        </CardContent>
      </Card>
    </div>
  );
};
