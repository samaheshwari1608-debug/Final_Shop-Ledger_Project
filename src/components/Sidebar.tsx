import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  Users, 
  BarChart3, 
  Truck, 
  Sparkles, 
  Settings, 
  LogOut,
  ShoppingBag,
  Mic,
  Wallet,
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'billing' 
  | 'inventory' 
  | 'customers' 
  | 'reports' 
  | 'suppliers' 
  | 'expenses'
  | 'dues'
  | 'payroll'
  | 'ai_insights'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lowStockCount: number;
  pendingCreditTotal: number;
  onLogout: () => void;
  onOpenVoice: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingCreditTotal,
  onLogout,
  onOpenVoice,
  mobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing' as ActiveTab, label: 'Billing', icon: Receipt },
    { 
      id: 'inventory' as ActiveTab, 
      label: 'Inventory', 
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      id: 'customers' as ActiveTab, 
      label: 'Customers', 
      icon: Users,
      badge: pendingCreditTotal > 0 ? `₹${pendingCreditTotal.toLocaleString()}` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800'
    },
    { id: 'reports' as ActiveTab, label: 'Reports', icon: BarChart3 },
    { id: 'suppliers' as ActiveTab, label: 'Scan Receipts', icon: Truck },
    { id: 'expenses' as ActiveTab, label: 'Finance', icon: Wallet },
    { id: 'ai_insights' as ActiveTab, label: 'AI Insights', icon: Sparkles },
  ];

  return (
    <>
    {mobileOpen && <button type="button" aria-label="Close navigation" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-slate-950/50 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 h-screen w-64 overflow-y-auto bg-[#0F172A] text-slate-200 border-r border-[#1E293B] flex flex-col justify-between shrink-0 select-none shadow-[0_20px_60px_-35px_rgba(15,23,42,0.9)] transition-transform md:sticky md:top-0 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-700/80">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#059669] to-[#047857] flex items-center justify-center text-white shadow-lg shadow-[#059669]/30">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white">
                VyapaarIQ
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">Smart Business. Smarter Decisions.</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'expenses'
              ? activeTab === 'expenses' || activeTab === 'dues' || activeTab === 'payroll'
              : activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); onCloseMobile(); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 font-semibold shadow-inner shadow-emerald-500/10 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Voice Assistant Shortcut Card & Bottom Actions */}
      <div className="p-3 border-t border-slate-700/80 space-y-2">
        <button
          onClick={onOpenVoice}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-violet-600 text-white shadow-md shadow-violet-600/25 hover:opacity-95 transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold leading-none text-white">AI Voice Assistant</p>
              <p className="text-[10px] text-violet-100 mt-0.5">Ask or speak in English</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded">Mic</span>
        </button>

        <div className="pt-1 space-y-0.5">
          <button
            onClick={() => { setActiveTab('settings'); onCloseMobile(); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-slate-800/70 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
