import { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2, LineChart, Edit2, Plus } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { Badge } from '../ui/Badge';
import { PageRow } from './PageRow';
import { GraphPanel } from './GraphPanel';
import { DomainModal } from './DomainModal';
import { DeleteConfirmationModal } from '../ui/DeleteConfirmationModal';
import { PageModal } from './PageModal';
import { Tooltip } from '../ui/Tooltip';
import { UPDATE_DOMAIN, DELETE_DOMAIN, CREATE_PAGE } from '../../graphql/mutations';
import { cn } from '../../lib/utils';
import { useExpandedState } from '../../context/ExpandedStateContext';

interface DomainRowProps {
  domain: {
    id: string;
    name: string;
    sitecode: string;
    lastEvaluationDate: string;
    desktopCpu: number;
    mobileCpu: number;
    pages: Array<any>;
  };
  tool: 'KAMELEOON' | 'AB_TASTY';
  filters?: any;
}

export function DomainRow({ domain, tool, filters }: DomainRowProps) {
  const { isExpanded, toggleExpanded } = useExpandedState();
  const expanded = isExpanded(domain.id);

  const [showGraph, setShowGraph] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);

  const [updateDomain, { loading: updating }] = useMutation(UPDATE_DOMAIN, {
    refetchQueries: ['GetHierarchy'],
    onCompleted: () => setIsEditModalOpen(false)
  });

  const [deleteDomain, { loading: deleting }] = useMutation(DELETE_DOMAIN, {
    refetchQueries: ['GetHierarchy'],
    onCompleted: () => setIsDeleteModalOpen(false)
  });

  const [createPage, { loading: creatingPage }] = useMutation(CREATE_PAGE, {
    refetchQueries: ['GetHierarchy'],
    onCompleted: () => setIsAddPageModalOpen(false)
  });

  const handleUpdateDomain = (data: any) => {
    updateDomain({
      variables: {
        id: domain.id,
        input: data
      }
    });
  };

  const handleDeleteDomain = () => {
    deleteDomain({
      variables: {
        id: domain.id
      }
    });
    // setIsDeleteModalOpen(false);
  };

  const handleCreatePage = (data: any) => {
    createPage({
      variables: {
        input: {
          ...data,
          domainId: domain.id
        }
      }
    });
  };

  return (
    <div className="flex flex-col">
      <div 
        onClick={() => toggleExpanded(domain.id)}
        className="grid grid-cols-12 gap-4 py-3 px-4 border-b border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 items-center text-sm group "
      >
        <div className="col-span-4 pl-6 flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleExpanded(domain.id); }}
            className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <span className="font-medium text-neutral-700">{domain.name}</span>
        </div>
        
        <div className="col-span-2 text-neutral-500 flex items-center gap-2 overflow-hidden">
          <span className="truncate max-w-[150px]" title={domain.sitecode}>{domain.sitecode}</span>
        </div>
        
        <div className="col-span-2 text-neutral-500">
          {new Date(domain.lastEvaluationDate).toLocaleDateString()}
        </div>
        
        <div className="col-span-1">
          <Badge value={domain.desktopCpu} />
        </div>
        
        <div className="col-span-1">
          <Badge value={domain.mobileCpu} />
        </div>
        
        <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Edit">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
              className="p-1.5 text-neutral-400 hover:text-primary-800 hover:bg-primary-50 rounded-md transition-colors"
            >
              <Edit2 size={14} />
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
              <LineChart size={14} />
            </button>
          </Tooltip>
          <Tooltip content="Delete">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true); }}
              className="p-1.5 text-neutral-400 hover:text-status-danger hover:bg-status-danger/10 rounded-md transition-colors" 
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {showGraph && (
        <div className="px-4 pb-4 bg-neutral-50/30 pl-12">
          <GraphPanel entityId={domain.id} entityType="DOMAIN" tool={tool} filters={filters} />
        </div>
      )}

      {expanded && (
        <div className="bg-neutral-50/30">
          {domain.pages.map(page => (
            <PageRow key={page.id} page={page} tool={tool} filters={filters} />
          ))}
          <div className="px-12 py-2 pl-16 border-t border-neutral-100">
            <button
              onClick={() => setIsAddPageModalOpen(true)}
              className="flex items-center gap-2 text-xs font-medium text-primary-800 hover:text-primary-700 transition-colors"
            >
              <Plus size={14} />
              Add Page
            </button>
          </div>
        </div>
      )}

      <DomainModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateDomain}
        initialData={{
          name: domain.name,
          sitecode: domain.sitecode,
          selfHostingUrl: (domain as any).selfHostingUrl,
          cookieConsentCode: (domain as any).cookieConsentCode
        }}
        isLoading={updating}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDomain}
        entityName={domain.name}
        entityType="Domain"
        isLoading={deleting}
      />

      <PageModal
        isOpen={isAddPageModalOpen}
        onClose={() => setIsAddPageModalOpen(false)}
        onSave={handleCreatePage}
        existingPages={domain.pages}
        isLoading={creatingPage}
      />
    </div>
  );
}
