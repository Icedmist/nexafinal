import { useState } from "react";
import {  } from "react-router-dom";
import { Plus, Users, UserPlus, Mail, Shield, Building2, Search, MoreVertical, Ban, CheckCircle2, Pencil, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStaff, useStaffMutations, useStoreBranches } from "@/hooks/useStaffData";
import { useRole } from "@/hooks/useRole";
import { StaffPerformance } from "@/components/analytics/StaffPerformance";
import { StaffActivityLog } from "@/components/staff/StaffActivityLog";
import { PermissionGate } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import type { Staff, Branch } from "@/types/tenant";

export default StaffPage;

function StaffPage() {
  const { data: staff, isLoading } = useStaff();
  const { data: branches } = useStoreBranches();
  const { addStaff, updateStaff } = useStaffMutations();
  const { isAdmin, isManager, isSystemAdmin } = useRole();
  const [activeTab, setActiveTab] = useState("directory");
  
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    displayName: "",
    email: "",
    role: "staff" as "admin" | "manager" | "staff" | "system_admin" | "owner",

    branchId: "",
    password: "",
  });
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setNewStaff({
      displayName: member.displayName,
      email: member.email,
      role: member.role,
      branchId: member.branchId,
      password: "",
    });
    setFormOpen(true);
  };

  const filteredStaff = staff.filter(s => 
    s.displayName.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (editingStaff) {
      if (!newStaff.displayName || !newStaff.branchId) {
        toast.error("Please fill in all required fields");
        return;
      }
      try {
        await updateStaff(editingStaff.uid, {
          displayName: newStaff.displayName,
          role: newStaff.role,
          branchId: newStaff.branchId,
          password: newStaff.password || undefined,
        });
        toast.success("Staff member updated successfully");
        setFormOpen(false);
        setEditingStaff(null);
        setNewStaff({ displayName: "", email: "", role: "staff", branchId: "", password: "" });
      } catch (error: any) {
        toast.error(error.message || "Failed to update staff member");
      }
    } else {
      if (!newStaff.displayName || !newStaff.email || !newStaff.branchId || !newStaff.password) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (newStaff.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
      try {
        await addStaff(newStaff);
        toast.success("Staff member authorized successfully");
        setFormOpen(false);
        setNewStaff({ displayName: "", email: "", role: "staff", branchId: "", password: "" });
      } catch (error: any) {
        toast.error(error.message || "Failed to add staff member");
      }
    }
  };

  const toggleStatus = async (member: Staff) => {
    try {
      await updateStaff(member.uid, { isActive: !member.isActive });
      toast.success(`Staff member ${member.isActive ? "deactivated" : "activated"}`);
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Staff Management</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading team members...</p>
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-[1200px] space-y-6 flex flex-col", filteredStaff.length === 0 && "min-h-[60vh] justify-center")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Staff Management</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{staff.length} team members authorized</p>
        </div>
        <PermissionGate permission="manage_users">
          <Button onClick={() => {
            setEditingStaff(null);
            setNewStaff({ displayName: "", email: "", role: "staff", branchId: "", password: "" });
            setFormOpen(true);
          }} className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-xl shadow-primary/20 gap-2">
            <UserPlus className="h-4 w-4" /> Add Staff Member
          </Button>
        </PermissionGate>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-11 border-2">
            <TabsTrigger value="directory" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-3.5 w-3.5 mr-2" />
              Staff Directory
            </TabsTrigger>
            {(isAdmin || isManager) && (
              <>
                <TabsTrigger value="performance" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <TrendingUp className="h-3.5 w-3.5 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg font-bold text-[10px] uppercase tracking-widest px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Activity className="h-3.5 w-3.5 mr-2" />
                  Activity Log
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        <TabsContent value="directory" className="space-y-6 mt-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 rounded-xl border-2 font-medium"
              />
            </div>
          </div>

          <Card className="overflow-hidden border-2 rounded-2xl shadow-sm">
            <Table>
              {/* ... Table content ... */}
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Branch</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((member) => (
                <TableRow key={member.uid} className="group transition-colors hover:bg-muted/20">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {member.displayName[0]}
                      </div>
                      <div>
                        <p className="font-black text-sm">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground font-medium">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-md font-bold uppercase text-[10px] py-0.5">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      {branches.find(b => b.id === member.branchId)?.name || "Not assigned"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={member.isActive ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <PermissionGate permission="manage_users">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg h-8 w-8 p-0 font-bold"
                          onClick={() => handleEdit(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg h-8 px-2 font-bold text-xs"
                          onClick={() => toggleStatus(member)}
                        >
                          {member.isActive ? (
                            <><Ban className="h-3.5 w-3.5 mr-1.5 text-destructive" /> Deactivate</>
                          ) : (
                            <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" /> Activate</>
                          )}
                        </Button>
                      </div>
                    </PermissionGate>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
          </Card>
        </TabsContent>

        {(isAdmin || isManager) && (
          <>
            <TabsContent value="performance" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <StaffPerformance />
            </TabsContent>
            <TabsContent value="activity" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <StaffActivityLog />
            </TabsContent>
          </>
        )}
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{editingStaff ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
              <Input 
                placeholder="e.g. John Doe"
                value={newStaff.displayName}
                onChange={(e) => setNewStaff({ ...newStaff, displayName: e.target.value })}
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
              <Input 
                type="email"
                placeholder="john@example.com"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                disabled={!!editingStaff}
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assign Role</Label>
              <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v as any })}>
                <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {editingStaff?.role === "admin" && <SelectItem value="admin" disabled className="font-bold uppercase text-[10px]">Admin</SelectItem>}
                  <SelectItem value="manager" className="font-bold uppercase text-[10px]">Manager</SelectItem>
                  <SelectItem value="staff" className="font-bold uppercase text-[10px]">Staff</SelectItem>
                  {isSystemAdmin && <SelectItem value="system_admin" className="font-bold uppercase text-[10px]">System Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {editingStaff ? "New Password (Optional)" : "Temporary Password"}
              </Label>
              <Input 
                type="password"
                placeholder={editingStaff ? "Leave blank to keep current" : "At least 6 characters"}
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                className="h-11 rounded-xl border-2 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Branch Assignment</Label>
              <Select value={newStaff.branchId} onValueChange={(v) => setNewStaff({ ...newStaff, branchId: v })}>
                <SelectTrigger className="h-11 rounded-xl border-2 font-bold">
                  <SelectValue placeholder="Select a branch..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {branches.length === 0 ? (
                     <SelectItem value="default" disabled className="font-bold">No branches defined</SelectItem>
                  ) : (
                    branches.map(b => (
                      <SelectItem key={b.id} value={b.id} className="font-bold">{b.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {branches.length === 0 && (
                <p className="text-[10px] font-bold text-muted-foreground mt-1 ml-1">
                  You can define branches in the Store Settings page.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleSubmit} className="rounded-xl font-black uppercase tracking-widest text-xs px-6">
              {editingStaff ? "Update Staff" : "Onboard Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
