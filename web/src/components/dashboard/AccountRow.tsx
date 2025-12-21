import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2, LineChart, Edit2, Plus } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { Badge } from '../ui/Badge';
import { DomainRow } from './DomainRow';
import { GraphPanel } from './GraphPanel';
import { AccountModal } from './AccountModal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { DomainModal } from './DomainModal';
import { Tooltip } from '../ui/Tooltip';
import { UPDATE_ACCOUNT, DELETE_ACCOUNT, CREATE_DOMAIN } from '../../graphql/mutations';
import { cn } from '../../lib/utils';
import { useExpandedState } from '../../context/ExpandedStateContext';

interface AccountRowProps {
  account: {
    id: string;
    name: string;
    country: string;
    tamName: string;
    lastEvaluationDate: string;
    desktopCpu: number;
    mobileCpu: number;
    domains: Array<any>;
  };
  tool: 'KAMELEOON' | 'AB_TASTY';
  forceExpand?: boolean;
  filters?: any;
}

export function AccountRow({ account, tool, forceExpand, filters }: AccountRowProps) {
  const { isExpanded, toggleExpanded } = useExpandedState();
  const expanded = isExpanded(account.id);
  
  const [showGraph, setShowGraph] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);

  const [updateAccount] = useMutation(UPDATE_ACCOUNT, {
    refetchQueries: ['GetHierarchy']
  });

  const [deleteAccount] = useMutation(DELETE_ACCOUNT, {
    refetchQueries: ['GetHierarchy']
  });

  const [createDomain] = useMutation(CREATE_DOMAIN, {
    refetchQueries: ['GetHierarchy']
  });

  // Sync with forceExpand if it changes
  React.useEffect(() => {
    if (forceExpand !== undefined) {
      if (forceExpand && !expanded) toggleExpanded(account.id);
      if (!forceExpand && expanded) toggleExpanded(account.id);
    }
  }, [forceExpand]);

  const handleUpdateAccount = (data: any) => {
    updateAccount({
      variables: {
        id: account.id,
        input: data
      }
    });
  };

  const handleDeleteAccount = () => {
    deleteAccount({
      variables: {
        id: account.id
      }
    });
    setIsDeleteModalOpen(false);
  };

  const handleCreateDomain = (data: any) => {
    createDomain({
      variables: {
        input: {
          ...data,
          accountId: account.id
        }
      }
    });
  };

  return (
    <div className="flex flex-col border-b border-neutral-200 last:border-0">
      <div 
        onClick={() => toggleExpanded(account.id)}
        className="grid grid-cols-12 gap-4 py-4 px-4 bg-white hover:bg-neutral-50 items-center text-sm group transition-colors "
      >
        <div className="col-span-4 flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleExpanded(account.id); }}
            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div className="flex flex-col">
            <span className="font-semibold text-neutral-900 text-base">{account.name}</span>
            <span className="text-xs text-neutral-400 uppercase font-medium">{account.country}</span>
          </div>
        </div>
        
        <div className="col-span-2 text-neutral-600 flex items-center gap-2">
          <span>{account.tamName}</span>
        </div>
        
        <div className="col-span-2 text-neutral-500">
          {new Date(account.lastEvaluationDate).toLocaleDateString()}
        </div>
        
        <div className="col-span-1">
          <Badge value={account.desktopCpu} />
        </div>
        
        <div className="col-span-1">
          <Badge value={account.mobileCpu} />
        </div>
        
        <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Edit">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
              className="p-1.5 text-neutral-400 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors"
            >
              <Edit2 size={16} />
            </button>
          </Tooltip>
          <Tooltip content="View Graph">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowGraph(!showGraph); }}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                showGraph ? "text-primary-800 bg-primary-50" : "text-neutral-400 hover:text-primary-800 hover:bg-primary-50"
              )}
            >
              <LineChart size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
              className="p-1.5 text-neutral-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors" 
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {showGraph && (
        <div className="px-4 pb-4 bg-neutral-50/50">
          <GraphPanel entityId={account.id} entityType="ACCOUNT" tool={tool} filters={filters} />
        </div>
      )}

      {expanded && (
        <div className="border-t border-neutral-100">
          {account.domains.map(domain => (
            <DomainRow key={domain.id} domain={domain} tool={tool} filters={filters} />
          ))}
          <div className="px-12 py-2 bg-neutral-50/30 border-t border-neutral-100">
            <button
              onClick={() => setIsAddDomainModalOpen(true)}
              className="flex items-center gap-2 text-xs font-medium text-primary-800 hover:text-primary-700 transition-colors"
            >
              <Plus size={14} />
              Add Domain
            </button>
          </div>
        </div>
      )}

      <AccountModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateAccount}
        initialData={{
          name: account.name,
          country: account.country,
          tamName: account.tamName
        }}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        entityName={account.name}
        entityType="Account"
      />

      <DomainModal
        isOpen={isAddDomainModalOpen}
        onClose={() => setIsAddDomainModalOpen(false)}
        onSave={handleCreateDomain}
        existingDomains={account.domains}
      />
    </div>
  );
}
