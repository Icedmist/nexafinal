import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Shield, 
  ShieldAlert, 
  ShieldCheck,
  UserPlus,
  Mail,
  Building,
  MoreHorizontal,
  ArrowUpDown
} from "lucide-react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  storeId?: string;
  createdAt?: any;
  lastLogin?: any;
}

export default function SystemUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // For a platform admin, we want to see users. 
      // Note: In a real large-scale app, we'd use a Cloud Function to list Auth users.
      const snap = await getDocs(query(collection(db, "users"), limit(100)));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load platform users.");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "system_admin":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-blue-400 ring-1 ring-blue-500/20"><ShieldAlert className="h-3 w-3" /> System Admin</span>;
      case "owner":
        return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-400 ring-1 ring-indigo-500/20"><ShieldCheck className="h-3 w-3" /> Store Owner</span>;
      case "manager":
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/20"><Shield className="h-3 w-3" /> Manager</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 ring-1 ring-slate-500/20">Staff</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic tracking-tighter">Global Identity</h1>
          <p className="text-slate-400">Audit and manage all users registered on the Nexa platform.</p>
        </div>
        
        <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white uppercase tracking-[0.1em] transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20">
          <UserPlus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by name, email, or UID..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white transition-all">
             <ArrowUpDown className="h-4 w-4" />
             Sort By
           </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">User Identity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Access Level</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Primary Store</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Activity</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Querying Identity Vault...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                   <td colSpan={5} className="py-20 text-center">
                     <span className="text-sm font-bold text-slate-600">No users found matching your criteria.</span>
                   </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-900/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-blue-500">
                          {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white leading-none">{user.displayName || "Unknown User"}</span>
                          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Building className="h-4 w-4 text-slate-600" />
                        <span className="text-xs font-bold tracking-tight">{user.storeId || "Standalone"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Last Login</span>
                         <span className="text-xs font-bold text-slate-400">Just now</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-800 transition-all">
                         <MoreHorizontal className="h-5 w-5" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
