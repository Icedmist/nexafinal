import { 
  Menu, 
  Lock, 
  User, 
  LogOut, 
  ShieldCheck, 
  HelpCircle, 
  FileSpreadsheet,
  Plus,
  Wallet,
  QrCode,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentHeaderProps {
  onOpenMobileMenu: () => void;
  onOpenDemoPassModal: () => void;
  onOpenAuthModal: () => void;
  onOpenOnboardModal?: () => void;
  onOpenPayoutModal?: () => void;
  onOpenQrModal?: () => void;
  isAuthenticated: boolean;
  agentName?: string;
  agentEmail?: string;
  onLogout?: () => void;
  activeTabTitle?: string;
}

export function AgentHeader({
  onOpenMobileMenu,
  onOpenDemoPassModal,
  onOpenAuthModal,
  onOpenOnboardModal,
  onOpenPayoutModal,
  onOpenQrModal,
  isAuthenticated,
  agentName = "Growth Partner",
  agentEmail = "agent@nexastore.ng",
  onLogout,
  activeTabTitle = "Agent Growth Partner Workspace"
}: AgentHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#0B0C1E]/90 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-3.5 flex items-center justify-between text-white">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
          title="Open Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold font-['Bricolage_Grotesque'] text-white">
              {activeTabTitle}
            </h1>
            <Badge className="hidden sm:inline-flex bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[10px] font-bold">
              Field Agent Portal
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAuthenticated && onOpenOnboardModal && (
          <Button
            onClick={onOpenOnboardModal}
            size="sm"
            className="bg-gradient-to-r from-[#2B5BFF] to-[#00C4CF] hover:brightness-110 text-white font-bold text-xs h-9 gap-1.5 rounded-xl shadow-md shadow-[#2B5BFF]/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Onboard Store</span>
            <span className="lg:hidden">Onboard</span>
          </Button>
        )}

        {isAuthenticated && onOpenPayoutModal && (
          <Button
            onClick={onOpenPayoutModal}
            size="sm"
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#4DE89A] font-bold text-xs h-9 gap-1.5 rounded-xl"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden xl:inline">Claim Payout</span>
          </Button>
        )}

        {isAuthenticated && onOpenQrModal && (
          <Button
            onClick={onOpenQrModal}
            size="sm"
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-white/10 text-xs h-9 gap-1.5 rounded-xl hidden md:flex"
            title="Digital QR Flyer"
          >
            <QrCode className="h-4 w-4 text-[#00C4CF]" />
            <span className="hidden xl:inline">QR Flyer</span>
          </Button>
        )}

        <Button
          onClick={onOpenDemoPassModal}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-9 gap-1.5 rounded-xl"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span className="hidden md:inline">12h Demo Link</span>
          <span className="md:hidden">Demo</span>
        </Button>

        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 pl-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer">
                <div className="h-7 w-7 bg-gradient-to-br from-[#2B5BFF] to-[#00C4CF] rounded-full flex items-center justify-center font-bold text-xs text-white">
                  {agentName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left text-xs leading-tight pr-1">
                  <span className="font-bold text-white block">{agentName}</span>
                  <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">{agentEmail}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#141528] border-white/10 text-white rounded-2xl p-2 space-y-1">
              <DropdownMenuLabel className="text-xs">
                <span className="font-bold block">{agentName}</span>
                <span className="text-[10px] font-mono text-slate-400 font-normal">{agentEmail}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {onOpenOnboardModal && (
                <DropdownMenuItem 
                  onClick={onOpenOnboardModal}
                  className="text-xs focus:bg-white/10 cursor-pointer rounded-xl gap-2 font-medium"
                >
                  <Plus className="h-4 w-4 text-[#00C4CF]" /> Onboard Retail Merchant
                </DropdownMenuItem>
              )}
              {onOpenPayoutModal && (
                <DropdownMenuItem 
                  onClick={onOpenPayoutModal}
                  className="text-xs focus:bg-white/10 cursor-pointer rounded-xl gap-2 font-medium"
                >
                  <Wallet className="h-4 w-4 text-[#4DE89A]" /> Request Payout / Claim
                </DropdownMenuItem>
              )}
              {onOpenQrModal && (
                <DropdownMenuItem 
                  onClick={onOpenQrModal}
                  className="text-xs focus:bg-white/10 cursor-pointer rounded-xl gap-2 font-medium"
                >
                  <QrCode className="h-4 w-4 text-amber-400" /> Digital Agent QR Flyer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={onLogout}
                className="text-xs text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer rounded-xl gap-2 font-semibold"
              >
                <LogOut className="h-4 w-4 text-red-400" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            onClick={onOpenAuthModal}
            size="sm"
            className="bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white font-bold text-xs h-9 rounded-xl px-4"
          >
            Agent Sign In / Sign Up
          </Button>
        )}
      </div>
    </header>
  );
}
