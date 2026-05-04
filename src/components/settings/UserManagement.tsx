import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Plus, MoreHorizontal, Users, Search, ShieldCheck, Shield, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useStaff, useStaffMutations } from "@/hooks/useStaffData";
import { useLocations } from "@/hooks/useInventoryData";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import type { Staff } from "@/types/tenant";

type RoleType = "admin" | "manager" | "staff";
const ROLE_LABELS: Record<RoleType, string> = { admin: "Admin", manager: "Inventory Manager", staff: "Staff" };
const ROLE_COLORS: Record<RoleType, string> = { admin: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200", manager: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", staff: "bg-muted text-muted-foreground" };

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: staff, isLoading: staffLoading } = useStaff();
  const { data: locations } = useLocations();
  const { addStaff, updateStaff } = useStaffMutations();

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("staff");
  const [inviteBranch, setInviteBranch] = useState<string>("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const [roleChange, setRoleChange] = useState<{ user: Staff; newRole: RoleType } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Staff | null>(null);

  const filtered = useMemo(() => {
    if (!search) return staff;
    const q = search.toLowerCase();
    return staff.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [staff, search]);

  const adminCount = staff.filter((u) => u.role === "admin" && u.isActive).length;
  const isLastAdmin = (user: Staff) => user.role === "admin" && user.isActive && adminCount <= 1;

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError("Valid email required"); return; }
    if (staff.some((u) => u.email.toLowerCase() === email)) { setInviteError("User already exists"); return; }
    if (!inviteName) { setInviteError("Name is required"); return; }
    
    setInviteLoading(true);
    try {
      await addStaff({
        email,
        displayName: inviteName,
        role: inviteRole,
        branchId: inviteBranch || null as any,
      });
      toast.success(`Invitation sent to ${email}`);
      setInviteOpen(false); setInviteEmail(""); setInviteName(""); setInviteRole("staff"); setInviteBranch(""); setInviteError("");
    } catch (err: any) {
      setInviteError(err.message || "Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChange) return;
    try {
      await updateStaff((roleChange.user as any).id, { role: roleChange.newRole });
      toast.success(`${roleChange.user.displayName}'s role changed to ${ROLE_LABELS[roleChange.newRole]}`);
      setRoleChange(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to change role");
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await updateStaff((deactivateTarget as any).id, { isActive: false });
      toast.success(`${deactivateTarget.displayName} deactivated`);
      setDeactivateTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to deactivate user");
    }
  };

  const handleReactivate = async (user: Staff) => {
    try {
      await updateStaff((user as any).id, { isActive: true });
      toast.success(`${user.displayName} reactivated`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate user");
    }
  };

  if (staffLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search staff…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-white" />
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Invite Staff
        </Button>
      </div>

      <div className="hidden sm:block rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No staff found</TableCell></TableRow>
            ) : filtered.map((staffMember) => (
              <TableRow key={(staffMember as any).id} className={cn(!staffMember.isActive && "opacity-50")}>
                <TableCell className="font-medium">{staffMember.displayName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{staffMember.email}</TableCell>
                <TableCell>
                  <RoleDropdown user={staffMember} currentUserId={currentUser?.uid || ""} adminCount={adminCount} isLastAdmin={isLastAdmin(staffMember)}
                    onChangeRole={(newRole) => setRoleChange({ user: staffMember, newRole })} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <MapPin className="h-3 w-3" />
                    {locations.find(l => l.id === staffMember.branchId)?.name || "All Branches"}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={staffMember.isActive ? "default" : "secondary"} className={cn("text-[10px] font-black uppercase tracking-wider")}>
                    {staffMember.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(staffMember.createdAt), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <UserActions user={staffMember} currentUserId={currentUser?.uid || ""} isLastAdmin={isLastAdmin(staffMember)}
                    onDeactivate={() => setDeactivateTarget(staffMember)} onReactivate={() => handleReactivate(staffMember)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff</DialogTitle>
            <DialogDescription>Add a new team member and assign them a branch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
             <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-1.5">
              <Label>Work Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }} placeholder="user@store.com" />
              {inviteError && <p className="text-xs text-destructive font-bold">{inviteError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Inventory Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={inviteBranch} onValueChange={setInviteBranch}>
                  <SelectTrigger><SelectValue placeholder="All Branches" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Invite Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChange} onOpenChange={(open) => !open && setRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {roleChange?.user.displayName}'s role to <strong>{roleChange ? ROLE_LABELS[roleChange.newRole] : ""}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.displayName}?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access immediately. You can reactivate them later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleDropdown({ user, currentUserId, adminCount, isLastAdmin, onChangeRole }: {
  user: Staff; currentUserId: string; adminCount: number; isLastAdmin: boolean;
  onChangeRole: (role: RoleType) => void;
}) {
  const isSelf = user.uid === currentUserId;

  if (isSelf) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn("text-[10px] cursor-default font-black uppercase tracking-wider", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
          </TooltipTrigger>
          <TooltipContent>Cannot change your own role</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isLastAdmin) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn("text-[10px] cursor-default font-black uppercase tracking-wider", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
          </TooltipTrigger>
          <TooltipContent>Cannot change role — this is the only admin. Promote another user first.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Select value={user.role} onValueChange={(v) => { if (v !== user.role) onChangeRole(v as RoleType); }}>
      <SelectTrigger className="h-7 w-[160px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Admin</div>
        </SelectItem>
        <SelectItem value="manager">
          <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Inventory Manager</div>
        </SelectItem>
        <SelectItem value="staff">
          <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Staff</div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function UserActions({ user, currentUserId, isLastAdmin, onDeactivate, onReactivate }: {
  user: Staff; currentUserId: string; isLastAdmin: boolean;
  onDeactivate: () => void; onReactivate: () => void;
}) {
  const isSelf = user.uid === currentUserId;
  const canDeactivate = !isSelf && !isLastAdmin && user.isActive;
  const canReactivate = !user.isActive;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canReactivate ? (
          <DropdownMenuItem onClick={onReactivate}>Reactivate</DropdownMenuItem>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled={!canDeactivate} onClick={canDeactivate ? onDeactivate : undefined}>
                  Deactivate
                </DropdownMenuItem>
              </TooltipTrigger>
              {!canDeactivate && (
                <TooltipContent>
                  {isSelf ? "Cannot deactivate yourself" : isLastAdmin ? "Cannot deactivate the only admin" : ""}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
