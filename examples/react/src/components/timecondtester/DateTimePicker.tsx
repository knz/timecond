import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React from 'react';

// --- DateTimePicker Subcomponent ---
type DateTimePickerProps = {
  label: string;
  bold: boolean;
  value: Date;
  onChange: (date: Date) => void;
};

const pad = (n: number) => n.toString().padStart(2, '0');

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ label, bold, value, onChange }) => {
  // For controlled input, split date and time
  const dateStr = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const timeStr = `${pad(value.getHours())}:${pad(value.getMinutes())}`;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(value);
    newDate.setFullYear(year, month - 1, day);
    onChange(newDate);
  };
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hour, minute] = e.target.value.split(':').map(Number);
    const newDate = new Date(value);
    newDate.setHours(hour, minute);
    onChange(newDate);
  };
  const handleNow = () => {
    onChange(new Date());
  };

  return (
    <div className="flex flex-col gap-1">
      <label className={`mb-1 ${bold ? 'font-bold' : ''}`}>{label}</label>
      <div className="flex gap-2 items-center">
        <Input type="date" value={dateStr} onChange={handleDateChange} style={{ width: 140 }} className="p-0 text-xs" />
        <Input type="time" value={timeStr} onChange={handleTimeChange} style={{ width: 100 }} className="p-0 text-xs" />
        <Button type="button" size="sm" variant="outline" onClick={handleNow} className="ml-1">
          Now
        </Button>
      </div>
    </div>
  );
};
