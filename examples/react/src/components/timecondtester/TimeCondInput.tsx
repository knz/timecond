import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { TimeConfig } from '@knz/timecond';
import { ChevronDown, Delete, Minus, Plus, Settings2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { TimeCondHelpDrawer } from './HelpDrawer';
import { TimeCondConfigDrawer } from './TimeCondConfigDrawer';

// --- Keyword Button Component ---
interface KeywordButtonProps {
  control: Extract<ControlConfig, { type: 'keyword' | 'noop' }>;
  onClick: (control: Extract<ControlConfig, { type: 'keyword' | 'noop' }>) => void;
}

const KeywordButton: React.FC<KeywordButtonProps> = ({ control, onClick }) => {
  return (
    <Button variant={control.variant} size="sm" onClick={() => onClick(control)} className="text-xs">
      {control.keyword}
    </Button>
  );
};

// --- Number Input Popover Component ---
interface NumberInputPopoverProps {
  onInsert: (number: string) => void;
}

const NumberInputPopover: React.FC<NumberInputPopoverProps> = ({ onInsert }) => {
  const [value, setValue] = useState<number>(1);
  const [isOpen, setIsOpen] = useState(false);

  const handleIncrement = () => {
    setValue((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setValue((prev) => Math.max(1, prev - 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 1;
    setValue(Math.max(1, newValue));
  };

  const handleInsert = () => {
    onInsert(value.toString());
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInsert();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          Number
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Enter a number</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDecrement} className="h-8 w-8 p-0">
              <Minus className="h-3 w-3" />
            </Button>
            <Input type="number" min="1" value={value} onChange={handleInputChange} onKeyDown={handleKeyPress} className="text-center" />
            <Button variant="outline" size="sm" onClick={handleIncrement} className="h-8 w-8 p-0">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button onClick={handleInsert} size="sm" className="w-full">
            Insert
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// --- Date Input Popover Component ---
interface DateInputPopoverProps {
  onInsert: (date: string) => void;
}

const DateInputPopover: React.FC<DateInputPopoverProps> = ({ onInsert }) => {
  const [day, setDay] = useState<number>(1);
  const [month, setMonth] = useState<string>('january');
  const [isOpen, setIsOpen] = useState(false);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 1;
    setDay(Math.max(1, Math.min(31, newValue)));
  };

  const handleMonthSelect = (selectedMonth: string) => {
    setMonth(selectedMonth);
  };

  const handleInsert = () => {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    onInsert(`${monthName} ${day}`);
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInsert();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs italic">
          Date
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Enter a date</div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs italic w-28 justify-between">
                  {month.charAt(0).toUpperCase() + month.slice(1)} <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                {dropdownConfigs.months.options.map((option) => (
                  <DropdownMenuItem key={option} onClick={() => handleMonthSelect(option)}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              type="number"
              min="1"
              max="31"
              value={day}
              onChange={handleDayChange}
              onKeyDown={handleKeyPress}
              className="text-center w-20"
            />
          </div>
          <Button onClick={handleInsert} size="sm" className="w-full">
            Insert
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// --- Time Input Popover Component ---
interface TimeInputPopoverProps {
  onInsert: (time: string) => void;
}

const TimeInputPopover: React.FC<TimeInputPopoverProps> = ({ onInsert }) => {
  const [hour, setHour] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    setHour(Math.max(0, Math.min(23, newValue)));
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    setMinute(Math.max(0, Math.min(59, newValue)));
  };

  const handleInsert = () => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    onInsert(`${formattedHour}:${formattedMinute}`);
    setIsOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInsert();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs italic">
          Time
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-3">
          <div className="text-sm font-medium">Enter a time</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={handleHourChange}
              onKeyDown={handleKeyPress}
              className="text-center w-20"
              placeholder="HH"
            />
            <span>:</span>
            <Input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={handleMinuteChange}
              onKeyDown={handleKeyPress}
              className="text-center w-20"
              placeholder="MM"
            />
          </div>
          <Button onClick={handleInsert} size="sm" className="w-full">
            Insert
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// --- Generic Dropdown Component ---
interface GenericDropdownProps {
  label: string;
  options: string[];
  onSelect: (option: string) => void;
}

const GenericDropdown: React.FC<GenericDropdownProps> = ({ label, options, onSelect }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs italic">
          {label} <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
        {options.map((option) => (
          <DropdownMenuItem key={option} onClick={() => onSelect(option)}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Dropdown configurations
const dropdownConfigs = {
  seasons: {
    label: 'Season',
    options: ['spring', 'summer', 'fall', 'autumn', 'winter', 'summerSolstice', 'winterSolstice', 'springEquinox', 'fallEquinox'],
  },
  months: {
    label: 'Month',
    options: ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  },
  weekdays: {
    label: 'Weekday',
    options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'weekend', 'workday'],
  },
  dayParts: {
    label: 'Day Part',
    options: ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'day', 'anytime'],
  },
  units: {
    label: 'Unit',
    options: ['days', 'hours', 'minutes', 'seconds', 'months'],
  },
};

// --- Controls Configuration ---
// Each entry defines the type and properties for rendering controls in order

type ControlConfig =
  | { type: 'keyword'; keyword: string; variant: 'default' | 'secondary' | 'outline'; insertText?: string }
  | { type: 'noop'; keyword: string; variant: 'default' | 'secondary' | 'outline' }
  | { type: 'dropdown'; dropdownKey: keyof typeof dropdownConfigs }
  | {
      type: 'conditional';
      condition: 'isLastWordUnit' | 'isLastWordNumber' | 'shouldShowNumberEditor' | { placeholder: string };
      control: ControlConfig;
    }
  | { type: 'numberPopover' }
  | { type: 'datePopover' }
  | { type: 'timePopover' }
  | { type: 'button'; action: 'clear'; label: string };

const controlsConfig: ControlConfig[] = [
  { type: 'conditional', condition: { placeholder: 'date' }, control: { type: 'datePopover' } },
  { type: 'conditional', condition: { placeholder: 'time' }, control: { type: 'timePopover' } },
  { type: 'conditional', condition: { placeholder: 'number' }, control: { type: 'numberPopover' } },
  { type: 'conditional', condition: { placeholder: 'month' }, control: { type: 'dropdown', dropdownKey: 'months' } },
  { type: 'conditional', condition: { placeholder: 'unit' }, control: { type: 'keyword', keyword: 'days', variant: 'default' } },
  { type: 'conditional', condition: { placeholder: 'unit' }, control: { type: 'keyword', keyword: 'hours', variant: 'default' } },
  { type: 'conditional', condition: { placeholder: 'unit' }, control: { type: 'keyword', keyword: 'minutes', variant: 'default' } },
  { type: 'conditional', condition: { placeholder: 'unit' }, control: { type: 'keyword', keyword: 'seconds', variant: 'default' } },
  { type: 'conditional', condition: { placeholder: 'expr' }, control: { type: 'dropdown', dropdownKey: 'seasons' } },
  { type: 'conditional', condition: { placeholder: 'expr' }, control: { type: 'dropdown', dropdownKey: 'months' } },
  { type: 'conditional', condition: { placeholder: 'expr' }, control: { type: 'dropdown', dropdownKey: 'weekdays' } },
  { type: 'conditional', condition: { placeholder: 'expr' }, control: { type: 'dropdown', dropdownKey: 'dayParts' } },
  {
    type: 'conditional',
    condition: { placeholder: 'unsure' },
    control: { type: 'keyword', keyword: 'to day ...', insertText: 'to day <number>', variant: 'secondary' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'unsure' },
    control: { type: 'keyword', keyword: 'to month ...', insertText: 'to month <month>', variant: 'secondary' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'unsure' },
    control: { type: 'keyword', keyword: 'to date ...', insertText: 'to date <date>', variant: 'secondary' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'unsure' },
    control: { type: 'keyword', keyword: 'or ...', insertText: 'or <expr> <or...>', variant: 'secondary' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'unsure' },
    control: { type: 'keyword', keyword: 'and ...', insertText: 'and <expr> <and...>', variant: 'secondary' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'span...' },
    control: { type: 'noop', keyword: 'no more clauses', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'span...' },
    control: { type: 'keyword', keyword: 'add another clause', insertText: ', <number> <unit> <span...>', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'or...' },
    control: { type: 'noop', keyword: 'no more clauses', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'and...' },
    control: { type: 'noop', keyword: 'no more clauses', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: {
      type: 'keyword',
      keyword: 'first ... after start of ...',
      insertText: 'first <expr> after start of <expr> <inclusive|exclusive>',
      variant: 'default',
    },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'inclusive' },
    control: { type: 'keyword', keyword: 'inclusive', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'exclusive' },
    control: { type: 'keyword', keyword: 'exclusive', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: {
      type: 'keyword',
      keyword: 'daily from ... to ...',
      variant: 'default',
      insertText: 'daily from <time> to <time> <inclusive|exclusive>',
    },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'monthly ...', variant: 'default', insertText: 'monthly <monthly...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'monthly...' },
    control: { type: 'keyword', keyword: 'on day ...', variant: 'default', insertText: 'on day <number>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'monthly...' },
    control: {
      type: 'keyword',
      keyword: 'from day ... to day ...',
      insertText: 'from day <number> to day <number>',
      variant: 'default',
    },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'yearly ...', variant: 'default', insertText: 'yearly <yearly...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'yearly...' },
    control: { type: 'keyword', keyword: 'on month ...', variant: 'default', insertText: 'on month <month>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'yearly...' },
    control: { type: 'keyword', keyword: 'on date ...', variant: 'default', insertText: 'on date <date>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'yearly...' },
    control: {
      type: 'keyword',
      keyword: 'from month ... to month ...',
      variant: 'default',
      insertText: 'from month <month> to month <month>',
    },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'yearly...' },
    control: {
      type: 'keyword',
      keyword: 'from date ... to date ...',
      variant: 'default',
      insertText: 'from date <date> to date <date>',
    },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'after ...', insertText: 'after <number> <unit> <span...>', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'span of ...', insertText: 'span of <number> <unit> <span...>', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'nth ...', insertText: 'nth <number> <expr>', variant: 'default' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'either ... or ...', variant: 'default', insertText: 'either <expr> or <expr> <or...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'or...' },
    control: { type: 'keyword', keyword: 'or ...', variant: 'default', insertText: 'or <expr> <or...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: 'both ... and ...', variant: 'default', insertText: 'both <expr> and <expr> <and...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'and...' },
    control: { type: 'keyword', keyword: 'and ...', variant: 'default', insertText: 'and <expr> <and...>' },
  },
  {
    type: 'conditional',
    condition: { placeholder: 'expr' },
    control: { type: 'keyword', keyword: '( ... )', variant: 'default', insertText: '(<expr>)' },
  },
];

interface TimeCondInputProps {
  expr: string;
  onExprChange: (value: string) => void;
  onClear: () => void;
  showNextButton: boolean;
  onNextClick: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onCopyExample: (example: string) => void;
  config: TimeConfig;
  onConfigChange: (newConfig: TimeConfig) => void;
}

export const TimeCondInput: React.FC<TimeCondInputProps> = ({
  expr,
  onExprChange,
  onClear,
  showNextButton,
  onNextClick,
  drawerOpen,
  setDrawerOpen,
  onCopyExample,
  config,
  onConfigChange,
}) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  // Auto-resize function
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Function to check if the last word before cursor is a number
  const isLastWordNumber = (): boolean => {
    const before = expr.slice(0, selection.start);
    const words = before.trim().split(/\s+/);
    if (words.length === 0) return false;

    const lastWord = words[words.length - 1];
    return /^\d+$/.test(lastWord);
  };

  // Function to check if the last word before cursor is a unit
  const isLastWordUnit = (): boolean => {
    const before = expr.slice(0, selection.start);
    const words = before.trim().split(/\s+/);
    if (words.length === 0) return false;

    const lastWord = words[words.length - 1];
    const units = ['days', 'hours', 'minutes', 'seconds', 'months'];
    return units.includes(lastWord);
  };

  // Function to check if number editor should be shown
  const shouldShowNumberEditor = (): boolean => {
    const before = expr.slice(0, selection.start);
    const words = before.trim().split(/\s+/);
    if (words.length === 0) return false;

    const lastWord = words[words.length - 1];
    const numberEditorTriggers = ['day', 'month', 'nth', 'of', 'after', ',', ':'];
    return numberEditorTriggers.includes(lastWord);
  };

  const isPlaceholderSelectedWithCondition = (condition: string): boolean => {
    if (condition === 'expr' && expr.trim() === '') {
      return true;
    }
    if (selection.start === selection.end && expr.trim() !== '') {
      return true;
    }

    const selectedText = expr.slice(selection.start, selection.end);

    if (!selectedText.startsWith('<') || !selectedText.endsWith('>')) {
      return false;
    }

    const placeholderContent = selectedText.slice(1, -1);
    const conditions = placeholderContent.split('|');

    return conditions.includes(condition);
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [expr]);

  useEffect(() => {
    // If there's a selection, don't do anything automatically.
    if (selection.start !== selection.end) {
      return;
    }

    const cursor = selection.start;
    const placeholderRegex = /<[^>]+>/g;
    let match;

    // Check if cursor is inside a placeholder
    while ((match = placeholderRegex.exec(expr)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (cursor > start && cursor < end) {
        // Cursor is inside, but not at the edges. Select it.
        const newSelection = { start, end };
        setSelection(newSelection);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
          }
        }, 0);
        return;
      }
    }

    // Reset regex for another pass
    placeholderRegex.lastIndex = 0;

    // Check for placeholder adjacent to the cursor
    while ((match = placeholderRegex.exec(expr)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const textBetweenLeft = expr.substring(end, cursor);
      const textBetweenRight = expr.substring(cursor, start);

      if (end === cursor || (end < cursor && textBetweenLeft.trim() === '')) {
        // Potentially at the right edge of a placeholder.
        // Let's check if the *next* thing isn't another placeholder.
        const nextChar = expr.substring(cursor).trim();
        if (!nextChar.startsWith('<')) {
          const newSelection = { start, end };
          setSelection(newSelection);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
            }
          }, 0);
          return;
        }
      }

      if (start === cursor || (start > cursor && textBetweenRight.trim() === '')) {
        // At the left edge of a placeholder
        const newSelection = { start, end };
        setSelection(newSelection);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
          }
        }, 0);
        return;
      }
    }
  }, [selection.start, selection.end, expr]);

  const handleKeywordClick = (control: Extract<ControlConfig, { type: 'keyword' | 'noop' }>) => {
    const insertText = control.type === 'keyword' ? control.insertText || control.keyword : '';

    const before = expr.slice(0, selection.start);
    const after = expr.slice(selection.end);

    let textToInsert = insertText;

    // Add space before if needed
    if (selection.start > 0 && !before.endsWith(' ') && !before.endsWith('(')) {
      textToInsert = ' ' + textToInsert;
    }

    // Add space after if needed
    if (selection.end < expr.length && !after.startsWith(' ') && !after.startsWith(')') && !textToInsert.endsWith(' ')) {
      textToInsert += ' ';
    }

    const newExpr = before + textToInsert + after;
    onExprChange(newExpr);

    // After any insert, check for a placeholder in the whole string
    const placeholderRegex = /<([^>]+)>/;
    const match = newExpr.match(placeholderRegex);

    if (match && match.index !== undefined) {
      // If a placeholder exists, select it
      const newSelection = { start: match.index, end: match.index + match[0].length };
      setSelection(newSelection);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
        }
      }, 0);
    } else {
      // Otherwise, position cursor at the end of the inserted text
      const finalCursorPosition = before.length + textToInsert.length;
      const newSelection = { start: finalCursorPosition, end: finalCursorPosition };
      setSelection(newSelection);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newSelection.start, newSelection.end);
        }
      }, 0);
    }
  };

  const handleDropdownSelect = (value: string) => {
    handleKeywordClick({ type: 'keyword', keyword: value, variant: 'outline' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onExprChange(e.target.value);
    setSelection({ start: e.target.selectionStart || 0, end: e.target.selectionEnd || 0 });
    adjustTextareaHeight();
  };

  const handleInputClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setSelection({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 });
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setSelection({ start: e.currentTarget.selectionStart || 0, end: e.currentTarget.selectionEnd || 0 });
  };

  const handleBackspace = () => {
    const { start, end } = selection;

    if (start !== end) {
      const newExpr = expr.slice(0, start) + expr.slice(end);
      onExprChange(newExpr);

      const newCursorPos = start;
      setSelection({ start: newCursorPos, end: newCursorPos });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
      return;
    }

    if (start === 0) return;

    const beforeCursor = expr.slice(0, start);
    const afterCursor = expr.slice(start);

    let i = beforeCursor.length - 1;

    // Skip trailing spaces
    while (i >= 0 && /\s/.test(beforeCursor[i])) {
      i--;
    }

    // Find the start of the word
    while (i >= 0 && !/\s/.test(beforeCursor[i])) {
      i--;
    }
    const wordStart = i + 1;

    const newBeforeCursor = beforeCursor.substring(0, wordStart);
    const newExpr = newBeforeCursor + afterCursor;
    onExprChange(newExpr);

    const newCursorPos = newBeforeCursor.length;
    setSelection({ start: newCursorPos, end: newCursorPos });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleClear = () => {
    onClear();
    setSelection({ start: 0, end: 0 });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label>Time Condition</label>
      <div className="flex flex-wrap items-start gap-2 justify-end">
        <div className="flex flex-1 items-start gap-2 min-w-[60%]">
          <Textarea
            ref={textareaRef}
            value={expr}
            onChange={handleInputChange}
            onClick={handleInputClick}
            onKeyUp={handleInputKeyUp}
            placeholder="try: first morning after start of monday inclusive"
            autoFocus
            className="text-xs w-full min-h-[40px] resize-none"
            rows={1}
          />
          <Button variant="outline" size="sm" onClick={handleBackspace}>
            <Delete className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleClear} variant="outline" size="sm" className="text-xs">
            Clear
          </Button>
          <TimeCondHelpDrawer open={drawerOpen} setOpen={setDrawerOpen} onCopyExample={onCopyExample} />
          <Button variant="ghost" size="icon" onClick={() => setConfigDrawerOpen(true)} aria-label="Open config drawer">
            <Settings2 className="h-5 w-5" />
          </Button>
          <TimeCondConfigDrawer open={configDrawerOpen} setOpen={setConfigDrawerOpen} config={config} onApply={onConfigChange} />
        </div>
      </div>

      {showNextButton && (
        <div className="flex justify-start pt-2">
          <Button onClick={onNextClick}>Next</Button>
        </div>
      )}

      {/* Controls rendered in order from controlsConfig */}
      <div className="flex flex-wrap gap-1 mt-2">
        {controlsConfig.map((control, idx) => {
          if (control.type === 'keyword') {
            return <KeywordButton key={control.keyword + control.variant + idx} control={control} onClick={handleKeywordClick} />;
          }
          if (control.type === 'dropdown') {
            const config = dropdownConfigs[control.dropdownKey];
            return (
              <GenericDropdown
                key={control.dropdownKey + String(idx)}
                label={config.label}
                options={config.options}
                onSelect={handleDropdownSelect}
              />
            );
          }
          if (control.type === 'conditional') {
            // Evaluate the condition function
            let show = false;
            if (typeof control.condition === 'string') {
              if (control.condition === 'isLastWordUnit') show = isLastWordUnit();
              if (control.condition === 'isLastWordNumber') show = isLastWordNumber();
              if (control.condition === 'shouldShowNumberEditor') show = shouldShowNumberEditor();
            } else if (typeof control.condition === 'object' && 'placeholder' in control.condition) {
              show = isPlaceholderSelectedWithCondition(control.condition.placeholder);
            }

            if (!show) return null;

            // Render the nested control
            const nested = control.control;
            if (nested.type === 'keyword' || nested.type === 'noop') {
              return <KeywordButton key={nested.keyword + nested.variant + idx} control={nested} onClick={handleKeywordClick} />;
            }
            if (nested.type === 'dropdown') {
              const config = dropdownConfigs[nested.dropdownKey];
              return (
                <GenericDropdown
                  key={nested.dropdownKey + String(idx)}
                  label={config.label}
                  options={config.options}
                  onSelect={handleDropdownSelect}
                />
              );
            }
            if (nested.type === 'numberPopover') {
              return <NumberInputPopover key={'numberPopover' + idx} onInsert={handleDropdownSelect} />;
            }
            if (nested.type === 'datePopover') {
              return <DateInputPopover key={'datePopover' + idx} onInsert={handleDropdownSelect} />;
            }
            if (nested.type === 'timePopover') {
              return <TimeInputPopover key={'timePopover' + idx} onInsert={handleDropdownSelect} />;
            }
            return null;
          }
          if (control.type === 'numberPopover') {
            return <NumberInputPopover key={'numberPopover' + idx} onInsert={handleDropdownSelect} />;
          }
          if (control.type === 'datePopover') {
            return <DateInputPopover key={'datePopover' + idx} onInsert={handleDropdownSelect} />;
          }
          if (control.type === 'timePopover') {
            return <TimeInputPopover key={'timePopover' + idx} onInsert={handleDropdownSelect} />;
          }
          return null;
        })}
      </div>
    </div>
  );
};
