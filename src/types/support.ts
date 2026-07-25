export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "billing" | "technical" | "account" | "feature_request" | "bug_report" | "other";

export interface SupportTicket {
  id: string;
  storeId: string;
  storeName: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  messages: TicketMessage[];
  createdAt: any;
  updatedAt: any;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "merchant";
  message: string;
  createdAt: any;
}
