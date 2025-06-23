import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cloneTimeConfig, defaultTimeConfig, TimeConfig } from '@knz/timecond';
import React, { useState } from 'react';

interface TimeCondConfigDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  config: TimeConfig;
  onApply: (newConfig: TimeConfig) => void;
}

const DAY_PARTS_ORDER = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'day'];

// Helper function to format time as HH:MM
const formatTime = (hour: number, minute: number): string => {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

// Helper function to parse time from HH:MM format
const parseTime = (timeString: string): { hour: number; minute: number } | null => {
  const match = timeString.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return null;

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
};

export const TimeCondConfigDrawer: React.FC<TimeCondConfigDrawerProps> = ({ open, setOpen, config, onApply }) => {
  const [localConfig, setLocalConfig] = useState<TimeConfig>(cloneTimeConfig(config));
  const [timeInputs, setTimeInputs] = useState<Record<string, { start: string; end: string }>>(() => {
    const inputs: Record<string, { start: string; end: string }> = {};
    DAY_PARTS_ORDER.filter((part) => part !== 'anytime').forEach((part) => {
      const dayPart = localConfig.dayParts[part];
      if (dayPart) {
        inputs[part] = {
          start: formatTime(dayPart.start.hour, dayPart.start.minute),
          end: formatTime(dayPart.end.hour, dayPart.end.minute),
        };
      }
    });
    return inputs;
  });

  const handleSwitchChange = (field: 'weekStartsOnMonday' | 'southernHemisphere', value: boolean) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTimeInputChange = (part: string, which: 'start' | 'end', value: string) => {
    setTimeInputs((prev) => ({
      ...prev,
      [part]: {
        ...prev[part],
        [which]: value,
      },
    }));
  };

  const handleReset = () => {
    const newConfig = cloneTimeConfig(defaultTimeConfig);
    setLocalConfig(newConfig);

    // Reset time inputs
    const inputs: Record<string, { start: string; end: string }> = {};
    DAY_PARTS_ORDER.filter((part) => part !== 'anytime').forEach((part) => {
      const dayPart = newConfig.dayParts[part];
      if (dayPart) {
        inputs[part] = {
          start: formatTime(dayPart.start.hour, dayPart.start.minute),
          end: formatTime(dayPart.end.hour, dayPart.end.minute),
        };
      }
    });
    setTimeInputs(inputs);
  };

  const handleApply = () => {
    // Parse time inputs and update config
    const updatedConfig = { ...localConfig };

    DAY_PARTS_ORDER.filter((part) => part !== 'anytime').forEach((part) => {
      const input = timeInputs[part];
      if (input) {
        const startTime = parseTime(input.start);
        const endTime = parseTime(input.end);

        if (startTime && endTime) {
          updatedConfig.dayParts[part] = {
            start: startTime,
            end: endTime,
          };
        }
      }
    });

    onApply(updatedConfig);
    setOpen(false);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Time Condition Configuration</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 py-2 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <span>Week starts on Monday</span>
            <Switch checked={localConfig.weekStartsOnMonday} onCheckedChange={(v) => handleSwitchChange('weekStartsOnMonday', v)} />
          </div>
          <div className="flex items-center justify-between">
            <span>Southern Hemisphere</span>
            <Switch checked={localConfig.southernHemisphere} onCheckedChange={(v) => handleSwitchChange('southernHemisphere', v)} />
          </div>
          <div>
            <div className="font-semibold mb-2">Day Parts</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day Part</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DAY_PARTS_ORDER.filter((part) => part !== 'anytime').map((part) => (
                  <TableRow key={part}>
                    <TableCell className="capitalize">{part}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={timeInputs[part]?.start || ''}
                        onChange={(e) => handleTimeInputChange(part, 'start', e.target.value)}
                        placeholder="HH:MM"
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={timeInputs[part]?.end || ''}
                        onChange={(e) => handleTimeInputChange(part, 'end', e.target.value)}
                        placeholder="HH:MM"
                        className="w-20"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DrawerFooter>
          <Button variant="secondary" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
