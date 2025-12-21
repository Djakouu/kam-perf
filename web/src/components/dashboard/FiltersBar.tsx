import { useState, useEffect } from 'react';
import { Search, User, Code } from 'lucide-react';
import { Input } from '../ui/Input';
import { DateRangePicker } from '../ui/DateRangePicker';
import { Select } from '../ui/Select';

interface FiltersBarProps {
  filters: {
    search: string;
    startDate: string;
    endDate: string;
    country: string;
    tamName: string;
    sitecode: string;
    cpuTime: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export function FiltersBar({ filters, onFilterChange }: FiltersBarProps) {
  // Local state for debouncing text inputs
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localTamName, setLocalTamName] = useState(filters.tamName);
  const [localSitecode, setLocalSitecode] = useState(filters.sitecode);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) onFilterChange('search', localSearch);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localTamName !== filters.tamName) onFilterChange('tamName', localTamName);
    }, 500);
    return () => clearTimeout(timer);
  }, [localTamName, filters.tamName, onFilterChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSitecode !== filters.sitecode) onFilterChange('sitecode', localSitecode);
    }, 500);
    return () => clearTimeout(timer);
  }, [localSitecode, filters.sitecode, onFilterChange]);

  const handleDateChange = (start: string, end: string) => {
    onFilterChange('startDate', start);
    onFilterChange('endDate', end);
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-8 py-4 flex flex-wrap gap-4 items-center">
      <div className="flex-1 min-w-[200px]">
        <Input 
          placeholder="Account or Domain" 
          icon={<Search size={16} />} 
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>
      
      <div className="flex gap-3 items-center">
        <DateRangePicker 
          startDate={filters.startDate} 
          endDate={filters.endDate} 
          onChange={handleDateChange} 
        />

        <div className="w-32 relative">
          <Select
            value={filters.country}
            onChange={(value) => onFilterChange('country', value)}
            placeholder="Country"
            options={[
              { value: "", label: "All Countries" },
              { value: "FR", label: "FR" },
              { value: "UK", label: "UK" },
              { value: "US", label: "US" },
              { value: "DE", label: "DE" },
              { value: "RU", label: "RU" },
            ]}
          />
        </div>

        <div className="w-40">
          <Input 
            placeholder="TAM" 
            icon={<User size={16} />} 
            value={localTamName}
            onChange={(e) => setLocalTamName(e.target.value)}
          />
        </div>

        <div className="w-32">
          <Input 
            placeholder="Sitecode" 
            icon={<Code size={16} />} 
            value={localSitecode}
            onChange={(e) => setLocalSitecode(e.target.value)}
          />
        </div>

        <div className="w-40 relative">
          <Select
            value={filters.cpuTime}
            onChange={(value) => onFilterChange('cpuTime', value)}
            placeholder="CPU Time"
            options={[
              { value: "", label: "All CPU Times" },
              { value: "<500", label: "< 500ms" },
              { value: "500-1000", label: "500ms - 1000ms" },
              { value: "1000-2000", label: "1000ms - 2000ms" },
              { value: ">2000", label: "> 2000ms" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
