import { useState } from "react";
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone,
  Lock,
  Mail,
  Zap,
  Layout
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GlobalSettings() {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("platform");

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Platform settings updated successfully!");
    }, 1000);
  };

  const tabs = [
    { id: "platform", label: "Platform", icon: Globe },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Layout },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Global Control</h1>
          <p className="text-slate-400">Configure platform-wide parameters and governance rules.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Apply Changes"}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 shadow-2xl">
            {activeTab === "platform" && (
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Platform Name</label>
                    <input 
                      type="text" 
                      defaultValue="NEXA Store OS"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Support Email</label>
                    <input 
                      type="email" 
                      defaultValue="support@nexastoreos.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-white">Maintenance Mode</span>
                      <p className="text-xs text-slate-500">Temporarily disable platform access for all non-admin users.</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-800">
                      <div className="h-4 w-4 rounded-full bg-slate-500 transition-all translate-x-1" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-white">Open Registration</span>
                      <p className="text-xs text-slate-500">Allow new businesses to sign up without an invite.</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600">
                      <div className="h-4 w-4 rounded-full bg-white transition-all translate-x-6 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-4">
                  <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-amber-500">Security Audit Required</span>
                    <p className="text-[10px] text-amber-500/80 leading-relaxed">It has been 30 days since the last full platform security audit. It is recommended to rotate service account keys.</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                     <div className="flex items-center gap-3">
                       <Lock className="h-5 w-5 text-blue-500" />
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-white">Two-Factor Authentication</span>
                         <span className="text-[10px] text-slate-500">Force 2FA for all administrative accounts</span>
                       </div>
                     </div>
                     <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-800">
                        <div className="h-4 w-4 rounded-full bg-slate-500 transition-all translate-x-1" />
                      </div>
                   </div>

                   <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                     <div className="flex items-center gap-3">
                       <Zap className="h-5 w-5 text-indigo-500" />
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-white">Rate Limiting</span>
                         <span className="text-[10px] text-slate-500">Enable global API rate limit (1000 req/min)</span>
                       </div>
                     </div>
                     <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600">
                        <div className="h-4 w-4 rounded-full bg-white transition-all translate-x-6 shadow-sm" />
                      </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Platform Banner</label>
                    <textarea 
                      placeholder="Enter an announcement to show all platform users..."
                      className="w-full min-h-[100px] rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button className="rounded-lg bg-blue-600/10 px-3 py-1.5 text-[10px] font-bold text-blue-500 border border-blue-500/20">Preview Banner</button>
                    <button className="rounded-lg bg-rose-600/10 px-3 py-1.5 text-[10px] font-bold text-rose-500 border border-rose-500/20">Clear Global Alerts</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="flex items-center justify-center py-20 text-slate-600 italic text-sm">
                Appearance customization module coming soon...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
