import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isWithinInterval, 
  subDays,
  isValid,
  parseISO
} from 'date-fns';
import { twMerge } from 'tailwind-merge';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

type Tab = 'Fixed' | 'Since' | 'Last';

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Fixed');
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [lastDays, setLastDays] = useState(7);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      if (isValid(parseISO(startDate))) {
        setCurrentMonth(parseISO(startDate));
      }
    }
  }, [isOpen, startDate, endDate]);

  const handleApply = () => {
    onChange(tempStart, tempEnd);
    setIsOpen(false);
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (activeTab === 'Since') {
      setTempStart(dateStr);
      setTempEnd(format(new Date(), 'yyyy-MM-dd'));
      return;
    }

    if (!tempStart || (tempStart && tempEnd) || (tempStart && date < parseISO(tempStart))) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      setTempEnd(dateStr);
    }
  };

  const handleLastDaysChange = (days: number) => {
    setLastDays(days);
    const end = new Date();
    const start = subDays(end, days);
    setTempStart(format(start, 'yyyy-MM-dd'));
    setTempEnd(format(end, 'yyyy-MM-dd'));
  };

  const renderCalendar = (monthDate: Date) => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start, end });
    const startDay = start.getDay(); // 0 = Sunday

    const padding = Array(startDay).fill(null);

    return (
      <div className="w-64">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-neutral-100 rounded">
            <ChevronLeft size={16} />
          </button>
          <span className="font-medium">{format(monthDate, 'MMMM yyyy')}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-neutral-100 rounded">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-neutral-500">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {padding.map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = dateStr === tempStart || dateStr === tempEnd;
            const isInRange = tempStart && tempEnd && isWithinInterval(day, {
              start: parseISO(tempStart),
              end: parseISO(tempEnd)
            });
            
            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={twMerge(
                  "h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary-600 text-white" : "hover:bg-neutral-100",
                  isInRange && !isSelected ? "bg-primary-100 text-primary-900 rounded-none" : "",
                  isInRange && dateStr === tempStart ? "rounded-r-none" : "",
                  isInRange && dateStr === tempEnd ? "rounded-l-none" : ""
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-neutral-300 rounded-md px-3 py-2 h-[38px] hover:border-neutral-400 transition-colors"
      >
        <CalendarIcon size={16} className="text-neutral-400" />
        <span className="text-sm text-neutral-600">
          {startDate && endDate ? (
            <>
              {format(parseISO(startDate), 'MM/dd/yy')} - {format(parseISO(endDate), 'MM/dd/yy')}
            </>
          ) : (
            'Select dates'
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 bg-neutral-50 border-r border-neutral-200 p-4 flex flex-col gap-2">
            {(['Fixed', 'Since', 'Last'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={twMerge(
                  "text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  activeTab === tab ? "bg-white text-[#2C5D52] shadow-sm" : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                {tab}
              </button>
            ))}

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-neutral-500 block mb-1">Start date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full text-sm border border-neutral-300 rounded px-2 py-1"
                  />
                </div>
              </div>
              {activeTab !== 'Since' && (
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">End date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={tempEnd}
                      onChange={(e) => setTempEnd(e.target.value)}
                      className="w-full text-sm border border-neutral-300 rounded px-2 py-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'Last' ? (
              <div className="w-64">
                <h3 className="text-sm font-medium mb-4">Last time period</h3>
                <div className="space-y-2">
                  {[7, 14, 30, 90].map(days => (
                    <button
                      key={days}
                      onClick={() => handleLastDaysChange(days)}
                      className={twMerge(
                        "w-full text-left px-4 py-2 rounded border text-sm transition-colors",
                        lastDays === days ? "border-primary-500 bg-primary-50 text-primary-700" : "border-neutral-200 hover:border-neutral-300"
                      )}
                    >
                      Last {days} days
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex gap-8">
                {renderCalendar(currentMonth)}
                {renderCalendar(addMonths(currentMonth, 1))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-100">
              <button
                onClick={() => {
                  setTempStart(format(new Date(), 'yyyy-MM-dd'));
                  setTempEnd(format(new Date(), 'yyyy-MM-dd'));
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-md"
              >
                Today
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
