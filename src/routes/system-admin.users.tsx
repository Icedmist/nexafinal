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
  ArrowUpDown,
  Lock,
  UserCheck,
  Ban
} from "lucide-react";
import { collection, query, getDocs, orderBy, limit, where } from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InvitePlatformUserDialog } from "@/components/system-admin/InvitePlatformUserDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const handleForcePasswordReset = async (email: string) => {
    const toastId = toast.loading(`Generating password reset link for ${email}...`);
    try {
      const reset = httpsCallable(functions, 'resetuserpassword');
      const res = await reset({ email });
      const data = res.data as any;
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        toast.success("Password reset link generated and copied to clipboard!", { id: toastId });
        alert(`Password Reset Link:\n${data.link}\n\nThis link has been copied to your clipboard.`);
      } else {
        toast.success("Password reset link sent to user's email.", { id: toastId });
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      toast.error(err.message || "Failed to generate password reset link.", { id: toastId });
    }
  };

  const handleUpdatePlatformUser = async (uid: string, updates: { role?: string; storeId?: string; disabled?: boolean }) => {
    const toastId = toast.loading("Updating user properties...");
    try {
      const update = httpsCallable(functions, 'updateplatformuser');
      await update({ uid, ...updates });
      toast.success("User properties successfully updated.", { id: toastId });
      fetchUsers(); // Refresh list
      setDetailsOpen(false);
    } catch (err: any) {
      console.error("Update platform user error:", err);
      toast.error(err.message || "Failed to update user.", { id: toastId });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserActivities(selectedUser.id);
    } else {
      setUserActivities([]);
    }
  }, [selectedUser]);

  const fetchBusinesses = async () => {
    try {
      const snapshot = await getDocs(collection(db, "businesses"));
      setBusinesses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching businesses for lookup:", err);
    }
  };

  const fetchUserActivities = async (uid: string) => {
    setLoadingActivities(true);
    try {
      const q = query(
        collection(db, "activity_logs"),
        where("userId", "==", uid),
        orderBy("timestamp", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      setUserActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching user activities:", err);
      setUserActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const listUsers = httpsCallable(functions, 'listallusers');
      const result = await listUsers();
      const data = result.data as any;

      if (data.error) {
        console.error("Backend error details:", data);
        toast.error(`Auth Error: ${data.errorMessage} (${data.errorCode})`);
        setLoading(false);
        return;
      }
      
      // Map Auth users to UserProfile format
      const mapped = data.users.map((u: any) => ({
        id: u.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.customClaims?.role || "user",
        storeId: u.customClaims?.storeId,
        createdAt: u.creationTime,
        lastLogin: u.lastSignInTime,
      })) as UserProfile[];

      setUsers(mapped);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load platform users.");
    } finally {
      setLoading(false);
    }
  };

  const handleWipeUser = async (uid: string) => {
    if (!confirm("Are you sure you want to WIPE this user? This will delete their Auth account and all associated platform data. This action is IRREVERSIBLE.")) {
      return;
    }

    const toastId = toast.loading("Wiping user from platform...");
    try {
      const wipe = httpsCallable(functions, 'wipeuser');
      await wipe({ uid });
      toast.success("User successfully wiped.", { id: toastId });
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Wipe error:", error);
      toast.error("Failed to wipe user.", { id: toastId });
    }
  };

  const handleUpdateEmail = async (uid: string, currentEmail: string) => {
    const newEmail = prompt("Enter the new email address for this user:", currentEmail);
    if (!newEmail || newEmail === currentEmail) return;

    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const toastId = toast.loading(`Updating email to ${newEmail}...`);
    try {
      const updateEmail = httpsCallable(functions, 'updateuseremail');
      await updateEmail({ uid, newEmail });
      toast.success("Email updated successfully.", { id: toastId });
      fetchUsers(); // Refresh list
    } catch (error: any) {
      console.error("Email update error:", error);
      toast.error(error.message || "Failed to update email.", { id: toastId });
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "system_admin":
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-400 ring-1 ring-blue-500/20"><ShieldAlert className="h-3 w-3" /> System Admin</span>;
      case "owner":
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400 ring-1 ring-amber-500/20"><ShieldCheck className="h-3 w-3" /> Store Owner</span>;
      case "manager":
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-purple-400 ring-1 ring-purple-500/20"><Shield className="h-3 w-3" /> Manager</span>;
      case "suspended":
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-400 ring-1 ring-rose-500/20"><Ban className="h-3 w-3" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400 ring-1 ring-emerald-500/20">Staff</span>;
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
        
        <button 
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-xs font-black text-white uppercase tracking-[0.1em] transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20"
        >
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
                      <div className="h-6 w-6 rounded-full border-2 border-blue-500/20 border-t-blue-500" />
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
                  <tr 
                    key={user.id} 
                    onClick={() => {
                      setSelectedUser(user);
                      setDetailsOpen(true);
                    }}
                    className="group hover:bg-slate-900/30 transition-colors cursor-pointer"
                  >
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
                        <span className="text-xs font-bold tracking-tight">
                          {businesses.find(b => b.id === user.storeId)?.name || user.storeId || "Standalone"}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex flex-col">
                         <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">Last Login</span>
                         <span className="text-xs font-bold text-slate-400">Just now</span>
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <button 
                             onClick={(e) => e.stopPropagation()} 
                             className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-slate-800 transition-all"
                           >
                             <MoreHorizontal className="h-5 w-5" />
                           </button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-48 bg-slate-950 border-slate-800">
                           <DropdownMenuLabel className="text-slate-500">Actions</DropdownMenuLabel>
                           <DropdownMenuItem 
                             className="text-white hover:bg-slate-900 cursor-pointer"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedUser(user);
                               setDetailsOpen(true);
                             }}
                           >
                             View Profile
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             className="text-white hover:bg-slate-900 cursor-pointer"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleUpdateEmail(user.id, user.email);
                             }}
                           >
                             Change Email
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             className="text-white hover:bg-slate-900 cursor-pointer"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleForcePasswordReset(user.email);
                             }}
                           >
                             Force Password Reset
                           </DropdownMenuItem>
                           <DropdownMenuSeparator className="bg-slate-800" />
                           <DropdownMenuItem 
                             className="text-rose-500 hover:bg-rose-500/10 cursor-pointer font-bold"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleWipeUser(user.id);
                             }}
                           >
                             Wipe Data & Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <InvitePlatformUserDialog 
        open={inviteOpen} 
        onOpenChange={setInviteOpen} 
        onSuccess={fetchUsers}
      />

      {/* User Details & Action Dialog Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border-slate-800 text-white rounded-[2.5rem] p-8 nexa-glass shadow-2xl animate-in fade-in duration-300">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-500" />
              User Profile Operations
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Change permissions, linked stores, credentials, and manage system status for {selectedUser?.displayName || selectedUser?.email}.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-4">
              {/* Identity details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Display Name</span>
                  <span className="text-sm font-bold text-white mt-1 block">{selectedUser.displayName || "Not set"}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Email Address</span>
                  <span className="text-sm font-bold text-white mt-1 block">{selectedUser.email}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">User UID</span>
                  <span className="text-xs font-mono text-slate-300 mt-1 block truncate" title={selectedUser.id}>{selectedUser.id}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Access Role</span>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 col-span-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Associated Store Workspace</span>
                  <span className="text-sm font-bold text-white mt-1 block flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-500" />
                    {businesses.find(b => b.id === selectedUser.storeId)?.name || selectedUser.storeId || "Standalone (Global Access)"}
                  </span>
                </div>
              </div>

              {/* Edit Controls */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Access Configuration</span>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Change Account Role</label>
                    <select 
                      value={selectedUser.role}
                      onChange={(e) => handleUpdatePlatformUser(selectedUser.id, { role: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="system_admin">System Admin</option>
                      <option value="owner">Store Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Linked Store ID</label>
                    <input 
                      type="text"
                      defaultValue={selectedUser.storeId || ""}
                      placeholder="e.g. store_uid (or leave blank)"
                      onBlur={(e) => handleUpdatePlatformUser(selectedUser.id, { storeId: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Recent User Activities */}
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                  <span>Recent User Activities</span>
                  <span className="text-[9px] text-blue-400 font-bold lowercase tracking-wider">Live Platform Audit Logs</span>
                </span>
                
                {loadingActivities ? (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 rounded-full border border-blue-500/20 border-t-blue-500" />
                  </div>
                ) : userActivities.length === 0 ? (
                  <span className="text-xs text-slate-500 italic block py-2">No recent audit trails registered in logs.</span>
                ) : (
                  <div className="space-y-2">
                    {userActivities.map((act) => (
                      <div key={act.id} className="flex justify-between items-start gap-4 p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-white leading-tight">{act.title || act.type}</span>
                          <span className="text-[10px] text-slate-400">{act.message}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">
                          {act.timestamp?.seconds ? new Date(act.timestamp.seconds * 1000).toLocaleTimeString() : "Recent"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Administrative Actions */}
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Credentials & Lifecycle Security</span>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-slate-800 text-xs font-bold gap-2 hover:bg-slate-800 hover:text-white"
                    onClick={() => handleForcePasswordReset(selectedUser.email)}
                  >
                    <Lock className="h-3.5 w-3.5 text-blue-400" />
                    Force Password Reset Link
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-slate-800 text-xs font-bold gap-2 hover:bg-slate-800 hover:text-white"
                    onClick={() => handleUpdateEmail(selectedUser.id, selectedUser.email)}
                  >
                    <Mail className="h-3.5 w-3.5 text-amber-400" />
                    Change Email Address
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-rose-950 bg-rose-950/10 text-rose-400 text-xs font-bold gap-2 hover:bg-rose-900/30 hover:text-rose-200"
                    onClick={() => handleWipeUser(selectedUser.id)}
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-400" />
                    Wipe Platform Data & Delete
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-4 border-t border-slate-900">
                <Button 
                  variant="outline" 
                  className="rounded-xl border-slate-800 text-slate-400 hover:text-white"
                  onClick={() => setDetailsOpen(false)}
                >
                  Close Operations
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
