import { 
  BarChart3, 
  Store, 
  Wallet, 
  FolderDown, 
  Video, 
  FileSpreadsheet, 
  UserCheck, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AgentTabType = 
  | "performance" 
  | "referrals" 
  | "earnings" 
  | "resources" 
  | "video-academy" 
  | "csv-guide" 
  | "settings";

interface AgentSidebarProps {
  activeTab: AgentTabType;
  setActiveTab: (tab: AgentTabType) => void;
  referralsCount: number;
  earningsCount: number;
  isMinimized: boolean;
  setIsMinimized: (val: boolean | ((prev: boolean) => boolean)) => void;
  onLogout?: () => void;
  agentName?: string;
  agentCode?: string;
}

export function AgentSidebar({
  activeTab,
  setActiveTab,
  referralsCount,
  earningsCount,
  isMinimized,
  setIsMinimized,
  onLogout,
  agentName = "Growth Partner",
  agentCode = "NEXA-AG-001"
}: AgentSidebarProps) {
  const menuItems = [
    {
      id: "performance" as AgentTabType,
      label: "Performance & Overview",
      icon: BarChart3,
      badge: undefined
    },
    {
      id: "referrals" as AgentTabType,
      label: "Onboarded Merchants",
      icon: Store,
      badge: referralsCount > 0 ? String(referralsCount) : undefined
    },
    {
      id: "earnings" as AgentTabType,
      label: "Payouts & Earnings",
      icon: Wallet,
      badge: earningsCount > 0 ? String(earningsCount) : undefined
    },
    {
      id: "resources" as AgentTabType,
      label: "File Resources",
      icon: FolderDown,
      badge: "Collateral"
    },
    {
      id: "video-academy" as AgentTabType,
      label: "Video Academy",
      icon: Video,
      badge: "Training"
    },
    {
      id: "csv-guide" as AgentTabType,
      label: "CSV & AI Tool",
      icon: FileSpreadsheet,
      badge: undefined
    },
    {
      id: "settings" as AgentTabType,
      label: "Territory Profile",
      icon: UserCheck,
      badge: undefined
    }
  ];

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0B0C1E] border-r border-white/10 text-white flex flex-col justify-between transition-all duration-300 ${
        isMinimized ? "w-20" : "w-64"
      }`}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 bg-gradient-to-br from-[#2B5BFF] to-[#00C4CF] rounded-2xl flex items-center justify-center shrink-0 font-black text-white text-lg shadow-lg">
              N
            </div>
            {!isMinimized && (
              <div className="space-y-0.5">
                <span className="font-extrabold text-sm font-['Bricolage_Grotesque'] tracking-tight block text-white">
                  NexaStore<span className="text-[#00C4CF]">OS</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Agent Portal
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="hidden md:flex h-7 w-7 bg-white/5 hover:bg-white/10 rounded-lg items-center justify-center text-slate-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!isMinimized && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate">{agentName}</span>
              <ShieldCheck className="h-4 w-4 text-[#4DE89A] shrink-0" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Code: {agentCode}</span>
              <Badge className="bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[9px] px-1.5 py-0">
                Active
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isMinimized ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#2B5BFF] to-[#1B4BEE] text-white shadow-lg font-bold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              {!isMinimized && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge
                      className={`text-[9px] px-1.5 py-0 font-bold border-none ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        {onLogout && (
          <Button
            variant="ghost"
            onClick={onLogout}
            className={`w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-xs font-semibold justify-start rounded-xl h-9 gap-2.5 ${
              isMinimized ? "px-3" : "px-3.5"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0 text-red-400" />
            {!isMinimized && <span>Sign Out</span>}
          </Button>
        )}
      </div>
    </aside>
  );
}
