import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Copy, Info } from 'lucide-react';
import React from 'react';

interface CopyButtonProps {
  text: string;
  onCopy: (text: string) => void;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, onCopy }) => {
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => onCopy(text)}>
      <Copy className="h-4 w-4" />
    </Button>
  );
};

interface TimeCondHelpDrawerProps {
  open?: boolean;
  setOpen: (open: boolean) => void;
  onCopyExample: (example: string) => void;
}

// --- Help Drawer Component ---
export const TimeCondHelpDrawer: React.FC<TimeCondHelpDrawerProps> = ({ open, setOpen, onCopyExample }) => {
  const handleCopy = (text: string) => {
    onCopyExample(text);
    setOpen(false);
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          Help <Info className="h-4 w-4 ml-1" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-full h-full">
        <DrawerHeader>
          <DrawerTitle>Understanding Time Conditions</DrawerTitle>
          <DrawerDescription>A guide to defining flexible time-based conditions.</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto space-y-6 p-2">
          <section>
            <h4 className="font-semibold text-lg mb-2">What are Time Conditions?</h4>
            <p className="text-sm">
              Time conditions allow you to define complex, recurring, and human-friendly time rules. Think of them as a way to tell the
              system <em>when</em> it's a good time to plan activities.
            </p>
            <p className="text-sm">You can define conditions like "every Monday morning," "the first week of summer," or "after 3 days."</p>
          </section>

          <section>
            <h4 className="font-semibold text-lg mb-2">Basic Building Blocks</h4>
            <p className="text-sm  mb-2">You can use common phrases. These are your fundamental building blocks.</p>
            <div className="space-y-2">
              <div>
                <h5 className="font-medium">Parts of the Day</h5>
                <code className="bg-muted block p-2 rounded-md text-xs">dawn, morning, noon, afternoon, evening, night, midnight</code>
              </div>
              <div>
                <h5 className="font-medium">Days of the Week</h5>
                <code className="bg-muted block p-2 rounded-md text-xs">monday, tuesday, ..., sunday, workday, weekend</code>
              </div>
              <div>
                <h5 className="font-medium">Months and Seasons</h5>
                <code className="bg-muted block p-2 rounded-md text-xs">
                  january, february, ..., december, spring, summer, fall, winter
                </code>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-lg mb-2">Combining Conditions</h4>
            <p className="text-sm mb-2">Create more specific conditions by combining basic blocks with logical operators.</p>
            <div className="space-y-3">
              <div>
                <p className="mb-1">
                  Find the <code className="bg-muted px-1 rounded">first</code> occurrence of a condition that happens after another one
                  begins. The start can be <code className="bg-muted px-1 rounded">inclusive</code> or{' '}
                  <code className="bg-muted px-1 rounded">exclusive</code>.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">first monday after start of february inclusive</code>
                  <CopyButton text="first monday after start of february inclusive" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">
                  Use <code className="bg-muted px-1 rounded">either ... or ...</code> for logical OR.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">either weekend or friday</code>
                  <CopyButton text="either weekend or friday" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">
                  Use <code className="bg-muted px-1 rounded">both ... and ...</code> for logical AND.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">both monday and morning</code>
                  <CopyButton text="both monday and morning" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">
                  Use parentheses <code className="bg-muted px-1 rounded">(...)</code> to group conditions for clear logic.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">(both (either monday or tuesday) and morning)</code>
                  <CopyButton text="(both (either monday or tuesday) and morning)" onCopy={handleCopy} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-lg mb-2">Recurring and Specific Dates</h4>
            <p className="text-sm mb-2">Define patterns that repeat daily, monthly, or yearly.</p>
            <div className="space-y-3">
              <div>
                <p className="mb-1">
                  Define a daily time window. The end time can be <code className="bg-muted px-1 rounded">inclusive</code> or{' '}
                  <code className="bg-muted px-1 rounded">exclusive</code>.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">daily from 9:00 to 17:00 exclusive</code>
                  <CopyButton text="daily from 9:00 to 17:00 exclusive" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">Specify a day or range of days within a month.</p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">monthly on day 15</code>
                  <CopyButton text="monthly on day 15" onCopy={handleCopy} />
                </div>
                <div className="flex items-center mt-2">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">monthly from day 1 to 15</code>
                  <CopyButton text="monthly from day 1 to 15" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">Select date ranges on a yearly basis.</p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">yearly on date jan 15</code>
                  <CopyButton text="yearly on date jan 15" onCopy={handleCopy} />
                </div>
                <div className="flex items-center mt-2">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">yearly from date jan 1 to date jan 15</code>
                  <CopyButton text="yearly from date jan 1 to date jan 15" onCopy={handleCopy} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-lg mb-2">Relative Timespans</h4>
            <p className="text-sm mb-2">Define conditions relative to the last occurrence of an event.</p>
            <div className="space-y-3">
              <div>
                <p className="mb-1">
                  Define a period of time that begins <code className="bg-muted px-1 rounded">after</code> a certain duration.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">after 3 days, 5 hours</code>
                  <CopyButton text="after 3 days, 5 hours" onCopy={handleCopy} />
                </div>
              </div>
              <div>
                <p className="mb-1">
                  Select the <code className="bg-muted px-1 rounded">nth</code> occurrence of a condition. For example, the 3rd workday of
                  the month.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">nth 3 workday</code>
                  <CopyButton text="nth 3 workday" onCopy={handleCopy} />
                </div>
              </div>
            </div>
          </section>
          <section>
            <h4 className="font-semibold text-lg mb-2">Conditions that are always true</h4>
            <p className="text-sm mb-2">
              Define conditions that are immediately true. These are best combined with <code>first</code>.
            </p>
            <div className="space-y-3">
              <div>
                <p className="mb-1">
                  Define a simple duration or <code className="bg-muted px-1 rounded">span</code> of time.
                </p>
                <div className="flex items-center">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">span of 3 days</code>
                  <CopyButton text="span of 3 days" onCopy={handleCopy} />
                </div>
                <div className="flex items-center mt-2">
                  <code className="bg-muted block p-2 rounded-md text-xs flex-grow">
                    first span of 7 days after start of monday inclusive
                  </code>
                  <CopyButton text="first span of 7 days after start of monday inclusive" onCopy={handleCopy} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
