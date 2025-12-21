import { useState } from 'react';
import { AccountRow } from './AccountRow';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccountListProps {
  accounts: Array<any>;
  tool?: 'KAMELEOON' | 'AB_TASTY';
  filters?: any;
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}

export function AccountList({ accounts, tool = 'KAMELEOON', filters, onSort, sortConfig }: AccountListProps) {
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = () => {
    setAllExpanded(!allExpanded);
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key === key) {
      return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    }
    if (!sortConfig && key === 'name') {
      return <span className="ml-1">↑</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-soft overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider items-center select-none">
        <div className="col-span-4 flex items-center gap-2 cursor-pointer hover:text-neutral-700" onClick={() => onSort?.('name')}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleAll(); }}
            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
            title={allExpanded ? "Collapse All" : "Expand All"}
          >
            {allExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span>Account / Domain / Page</span>
          {renderSortIcon('name')}
        </div>
        <div className="col-span-2 cursor-pointer hover:text-neutral-700" onClick={() => onSort?.('tamName')}>
          TAM / Sitecode
          {renderSortIcon('tamName')}
        </div>
        <div className="col-span-2 cursor-pointer hover:text-neutral-700" onClick={() => onSort?.('lastEvaluationDate')}>
          Last Eval
          {renderSortIcon('lastEvaluationDate')}
        </div>
        <div className="col-span-1 cursor-pointer hover:text-neutral-700" onClick={() => onSort?.('desktopCpu')}>
          Desktop
          {renderSortIcon('desktopCpu')}
        </div>
        <div className="col-span-1 cursor-pointer hover:text-neutral-700" onClick={() => onSort?.('mobileCpu')}>
          Mobile
          {renderSortIcon('mobileCpu')}
        </div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* List */}
      <div className="divide-y divide-neutral-200">
        {accounts.map(account => (
          <AccountRow 
            key={account.id} 
            account={account} 
            tool={tool} 
            forceExpand={allExpanded}
            filters={filters}
          />
        ))}
      </div>
    </div>
  );
}
