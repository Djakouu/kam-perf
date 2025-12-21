import React from 'react';
import { LayoutDashboard, FileText, BarChart3, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from '../ui/Tooltip';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'dashboard' | 'documentation';
  onNavigate: (view: 'dashboard' | 'documentation') => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  return (
    <div className="flex h-screen bg-neutral-100 font-sans text-neutral-900">
      {/* Sidebar */}
      <aside className="w-64 bg-[#2C5D52] border-r border-neutral-800 flex-shrink-0 flex flex-col text-white">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <img src="https://cdn.prod.website-files.com/685945d76d7a305336412a93/686bcac753076d6555ec57b9_Logo%20Kameleoon%20White.svg" loading="lazy" alt="" className="kameleoon-logo-hero_form"></img>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
          />
          
          <div className="relative group">
            <Tooltip content="Under construction" className="w-full block">
              <div className="w-full">
                <NavItem 
                  icon={<BarChart3 size={20} />} 
                  label="Analytics" 
                  active={false}
                  className="opacity-50 cursor-not-allowed"
                />
                <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
            </Tooltip>
          </div>
        </nav>

        <div className="p-4 border-t border-neutral-700">
            <NavItem 
                icon={<FileText size={20} />} 
                label="Documentation" 
                active={currentView === 'documentation'}
                onClick={() => onNavigate('documentation')}
            />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, className }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-neutral-400 hover:bg-white/5 hover:text-white",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
