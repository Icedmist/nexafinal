import { useState, useEffect, useMemo } from "react";
import {
  Headphones, Search, Filter, MessageSquare, Clock, AlertTriangle,
  CheckCircle2, XCircle, ChevronDown, Send, User
} from "lucide-react";
import {
  collection, query, orderBy, limit, getDocs, doc, updateDoc,
  where, startAfter, onSnapshot, serverTimestamp, arrayUnion
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SupportTicket, TicketStatus, TicketPriority, TicketCategory, TicketMessage } from "@/types/support";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  waiting: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "text-slate-500",
  medium: "text-blue-400",
  high: "text-amber-400",
  urgent: "text-rose-400",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  billing: "Billing",
  technical: "Technical",
  account: "Account",
  feature_request: "Feature Request",
  bug_report: "Bug Report",
  other: "Other",
};

export default function SystemSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const q = query(
      collection(db, "support_tickets"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SupportTicket[];
      setTickets(data);
      setLoading(false);
    }, (err) => {
      console.error("Error loading tickets:", err);
      toast.error("Failed to load support tickets.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = !searchQuery || 
        t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.createdByName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTickets = filteredTickets.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  }), [tickets]);

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      await updateDoc(doc(db, "support_tickets", ticketId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`Ticket status updated to ${newStatus}`);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      toast.error("Failed to update ticket status.");
    }
  };

  const handleAssign = async (ticketId: string, assigneeName: string) => {
    try {
      await updateDoc(doc(db, "support_tickets", ticketId), {
        assignedTo: "system_admin",
        assignedToName: assigneeName,
        status: "in_progress",
        updatedAt: serverTimestamp(),
      });
      toast.success("Ticket assigned.");
    } catch (err) {
      toast.error("Failed to assign ticket.");
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setSending(true);
    try {
      const msg: TicketMessage = {
        id: `msg-${Date.now()}`,
        senderId: "system_admin",
        senderName: "System Admin",
        senderRole: "admin",
        message: replyMessage.trim(),
        createdAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, "support_tickets", selectedTicket.id), {
        messages: arrayUnion(msg),
        updatedAt: serverTimestamp(),
      });
      setReplyMessage("");
      toast.success("Reply sent.");
    } catch (err) {
      toast.error("Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const getRelativeTime = (timestamp: any): string => {
    if (!timestamp) return "Unknown";
    const date = timestamp?.toDate?.() || new Date(timestamp);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Support Tickets</h1>
          <p className="text-slate-400">Manage merchant support requests and issues.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Tickets", value: stats.total, color: "text-white" },
          { label: "Open", value: stats.open, color: "text-blue-400" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-400" },
          { label: "Resolved", value: stats.resolved, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">{s.label}</span>
            <span className={cn("text-2xl font-black mt-1 block", s.color)}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 py-3 pl-12 pr-4 text-sm text-white focus:border-blue-500 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-400 outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as any); setPage(1); }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-bold text-slate-400 outline-none cursor-pointer"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8"><TableSkeleton rows={5} columns={5} /></div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
            <Headphones className="h-12 w-12 text-slate-800" />
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold text-white">No tickets found</span>
              <span className="text-sm text-slate-500">No support tickets match your filters.</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ticket</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Store</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Category</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Priority</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Created</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {paginatedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="group hover:bg-blue-600/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm leading-tight">{ticket.subject}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1">{ticket.id.slice(0, 12)}...</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-400">{ticket.storeName || "Unknown"}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-slate-400">{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("text-xs font-black uppercase", PRIORITY_COLORS[ticket.priority])}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ring-1",
                        STATUS_COLORS[ticket.status]
                      )}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-500">{getRelativeTime(ticket.createdAt)}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-800 text-xs font-bold"
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-900 bg-slate-950/50 px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-600 hover:text-white disabled:opacity-30"
            >
              &larr;
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 text-slate-600 hover:text-white disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl bg-slate-950/98 border-slate-800 text-white rounded-[2.5rem] p-8 nexa-glass shadow-2xl max-h-[85vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-blue-500" />
                  {selectedTicket.subject}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Ticket {selectedTicket.id.slice(0, 12)} — {selectedTicket.storeName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value as TicketStatus)}
                      className="mt-1 w-full bg-transparent text-white font-bold outline-none cursor-pointer"
                    >
                      <option value="open" className="bg-slate-900">Open</option>
                      <option value="in_progress" className="bg-slate-900">In Progress</option>
                      <option value="waiting" className="bg-slate-900">Waiting</option>
                      <option value="resolved" className="bg-slate-900">Resolved</option>
                      <option value="closed" className="bg-slate-900">Closed</option>
                    </select>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Priority</span>
                    <span className={cn("font-black uppercase mt-1 block", PRIORITY_COLORS[selectedTicket.priority])}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Category</span>
                    <span className="font-bold text-white mt-1 block">{CATEGORY_LABELS[selectedTicket.category]}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Created By</span>
                    <span className="font-bold text-white mt-1 block">{selectedTicket.createdByName}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Description</span>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                {/* Messages Thread */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Conversation ({selectedTicket.messages?.length || 0})</span>
                  {selectedTicket.messages?.map((msg) => (
                    <div key={msg.id} className={cn(
                      "p-3 rounded-xl border text-xs",
                      msg.senderRole === "admin" 
                        ? "bg-blue-500/5 border-blue-500/20 ml-8" 
                        : "bg-slate-900 border-slate-800 mr-8"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {msg.senderName}
                          {msg.senderRole === "admin" && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded">Admin</span>}
                        </span>
                        <span className="text-[9px] text-slate-500">{getRelativeTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-slate-300">{msg.message}</p>
                    </div>
                  ))}
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                    <p className="text-xs text-slate-600 italic">No messages yet.</p>
                  )}
                </div>

                {/* Reply */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReply()}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-all"
                  />
                  <Button
                    onClick={handleReply}
                    disabled={sending || !replyMessage.trim()}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs px-4"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-900">
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-800 text-xs font-bold"
                    onClick={() => handleAssign(selectedTicket.id, "System Admin")}
                  >
                    Assign to Me
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-emerald-800 text-emerald-400 text-xs font-bold hover:bg-emerald-950"
                    onClick={() => handleStatusChange(selectedTicket.id, "resolved")}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-slate-800 text-slate-400 text-xs font-bold ml-auto"
                    onClick={() => setSelectedTicket(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
