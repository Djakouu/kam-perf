import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Header } from '../layout/Header';
import { FiltersBar } from './FiltersBar';
import { AccountList } from './AccountList';
import { AccountModal } from './AccountModal';
import { LoadingSpinner } from '../ui/Loading';
import { GET_HIERARCHY } from '../../graphql/queries';
import { CREATE_ACCOUNT } from '../../graphql/mutations';
import { Plus } from 'lucide-react';

export function Dashboard() {
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '2025-12-01',
    endDate: new Date().toISOString().split('T')[0],
    country: '',
    tamName: '',
    sitecode: '',
    cpuTime: ''
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      if (Math.abs(scrollTop - lastScrollTop.current) > 10) {
        const isScrollingDown = scrollTop > lastScrollTop.current;
        setIsFiltersVisible(!isScrollingDown || scrollTop < 50);
        lastScrollTop.current = scrollTop;
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const tool = 'KAMELEOON';
  
  const { loading, error, data, refetch } = useQuery(GET_HIERARCHY, {
    variables: { 
      tool,
      filters: {
        dateRange: {
          start: filters.startDate,
          end: filters.endDate
        }
      }
    }
  });

  const [createAccount, { loading: creatingAccount }] = useMutation(CREATE_ACCOUNT, {
    onCompleted: () => {
      refetch();
      setIsAddAccountModalOpen(false);
    }
  });

  const handleCreateAccount = (formData: any) => {
    createAccount({
      variables: {
        input: formData
      }
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' } 
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const processedAccounts = useMemo(() => {
    if (!data?.getHierarchy) return [];

    let accounts = data.getHierarchy.map((account: any) => {
      const domains = account.domains.map((domain: any) => {
        const pages = domain.pages.map((page: any) => ({
          ...page,
          lastEvaluationDate: page.stats?.date || new Date().toISOString(),
          desktopCpu: page.stats?.desktopCpuAvg || 0,
          mobileCpu: page.stats?.mobileCpuAvg || 0,
        }));

        // Calculate Domain Averages
        // The average of the CPU times of all pages in that domain that have a time > 0ms for that day.
        const activeDesktopPages = pages.filter((p: any) => p.desktopCpu > 0);
        const activeMobilePages = pages.filter((p: any) => p.mobileCpu > 0);

        const desktopSum = activeDesktopPages.reduce((sum: number, p: any) => sum + p.desktopCpu, 0);
        const mobileSum = activeMobilePages.reduce((sum: number, p: any) => sum + p.mobileCpu, 0);

        return {
          ...domain,
          pages,
          lastEvaluationDate: pages[0]?.lastEvaluationDate || new Date().toISOString(),
          desktopCpu: activeDesktopPages.length ? Math.round(desktopSum / activeDesktopPages.length) : 0,
          mobileCpu: activeMobilePages.length ? Math.round(mobileSum / activeMobilePages.length) : 0,
        };
      });

      // Calculate Account Averages
      // The average of the CPU times of all domains in that account that have a time > 0ms for that day.
      const activeDesktopDomains = domains.filter((d: any) => d.desktopCpu > 0);
      const activeMobileDomains = domains.filter((d: any) => d.mobileCpu > 0);

      const totalDesktop = activeDesktopDomains.reduce((sum: number, d: any) => sum + d.desktopCpu, 0);
      const totalMobile = activeMobileDomains.reduce((sum: number, d: any) => sum + d.mobileCpu, 0);

      return {
        ...account,
        domains,
        lastEvaluationDate: domains[0]?.lastEvaluationDate || new Date().toISOString(),
        desktopCpu: activeDesktopDomains.length ? Math.round(totalDesktop / activeDesktopDomains.length) : 0,
        mobileCpu: activeMobileDomains.length ? Math.round(totalMobile / activeMobileDomains.length) : 0,
      };
    });

    // Client-side filtering for search (Account Name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      accounts = accounts.filter((acc: any) => 
        acc.name.toLowerCase().includes(searchLower) || 
        acc.domains.some((d: any) => d.name.toLowerCase().includes(searchLower))
      );
    }

    // Client-side filtering for Country
    if (filters.country) {
      accounts = accounts.filter((acc: any) => 
        acc.country === filters.country
      );
    }

    // Client-side filtering for TAM Name
    if (filters.tamName) {
      const tamLower = filters.tamName.toLowerCase();
      accounts = accounts.filter((acc: any) => 
        acc.tamName?.toLowerCase().includes(tamLower)
      );
    }

    // Client-side filtering for Sitecode
    if (filters.sitecode) {
      const sitecodeLower = filters.sitecode.toLowerCase();
      accounts = accounts.filter((acc: any) => 
        acc.domains.some((d: any) => 
          d.sitecode?.toLowerCase().includes(sitecodeLower) ||
          d.pages.some((p: any) => p.sitecode?.toLowerCase().includes(sitecodeLower))
        )
      );
    }

    // Client-side filtering for CPU Time
    if (filters.cpuTime) {
      accounts = accounts.filter((acc: any) => {
        const maxCpu = Math.max(acc.desktopCpu, acc.mobileCpu);
        switch (filters.cpuTime) {
          case '<500':
            return maxCpu < 500;
          case '500-1000':
            return maxCpu >= 500 && maxCpu < 1000;
          case '1000-2000':
            return maxCpu >= 1000 && maxCpu < 2000;
          case '>2000':
            return maxCpu >= 2000;
          default:
            return true;
        }
      });
    }

    // Sorting
    if (sortConfig) {
      accounts.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle string comparison case-insensitively
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return accounts;
  }, [data, filters.search, filters.cpuTime, filters.country, filters.tamName, filters.sitecode, sortConfig]);

  if (loading && !data) return <div className="flex h-screen items-center justify-center"><LoadingSpinner size="large" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">Error: {error.message}</div>;

  return (
    <>
      <Header />
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-neutral-100 relative">
        <div className="max-w-7xl mx-auto px-8 pb-8 pt-0 space-y-6">
          <div className={`sticky top-0 z-20 transition-all duration-300 ease-in-out ${isFiltersVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'} -mx-8 px-8 py-6 bg-neutral-100/95 backdrop-blur-sm border-b border-neutral-200/50 shadow-sm`}>
            <div className="flex flex-col gap-4">
              <FiltersBar filters={filters} onFilterChange={handleFilterChange} />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex justify-end">
              <button
                onClick={() => setIsAddAccountModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-neutral-900 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Account</span>
              </button>
            </div>
            <AccountList 
              accounts={processedAccounts} 
              tool={tool} 
              filters={filters}
              onSort={handleSort}
              sortConfig={sortConfig}
            />
          </div>
        </div>
      </div>

      <AccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onSave={handleCreateAccount}
        existingAccounts={processedAccounts}
        isLoading={creatingAccount}
      />
    </>
  );
}
