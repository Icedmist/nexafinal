import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Bot, User, Send, Trash2, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

interface ChatMessage {
  sender: "customer" | "agent" | "staff";
  text: string;
  timestamp: string;
}

interface SupportChat {
  id: string;
  customerName: string;
  customerEmail?: string;
  status: "active" | "closed";
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export default function SystemAdminChats() {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "support_chats"));
    const unsub = onSnapshot(q, (snap) => {
      const list: SupportChat[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          customerName: data.customerName || "Guest Customer",
          customerEmail: data.customerEmail || "",
          status: data.status || "active",
          messages: data.messages || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setChats(list);
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch support chats from Firestore:", err);
      setIsLoading(false);
    });

    return unsub;
  }, []);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages, selectedChatId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !replyText.trim() || isSending) return;

    const chatDocRef = doc(db, "support_chats", selectedChatId);
    const textToSend = replyText.trim();
    setReplyText("");
    setIsSending(true);

    const newMessage: ChatMessage = {
      sender: "staff",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    try {
      const updatedMessages = [...(selectedChat?.messages || []), newMessage];
      await updateDoc(chatDocRef, {
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Reply dispatched to customer!");
    } catch (err) {
      console.error("Failed to send reply:", err);
      toast.error("Failed to dispatch reply.");
      setReplyText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleStatus = async (chat: SupportChat) => {
    const nextStatus = chat.status === "active" ? "closed" : "active";
    try {
      await updateDoc(doc(db, "support_chats", chat.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Chat status updated to ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update chat status.");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this support chat session?")) return;

    try {
      await deleteDoc(doc(db, "support_chats", chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      toast.success("Support chat session deleted.");
    } catch (err) {
      console.error("Failed to delete chat:", err);
      toast.error("Failed to delete chat session.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Synchronizing live support pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 h-[600px]">
      <Card className="md:col-span-1 shadow-none border border-muted-foreground/10 flex flex-col h-full">
        <CardHeader className="p-4 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Customer Support Pipelines
          </CardTitle>
          <CardDescription className="text-[10px]">Real-time customer storefront support logs.</CardDescription>
        </CardHeader>
        <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5 bg-muted/5">
          {chats.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-xs text-muted-foreground font-medium">No active support chats</p>
            </div>
          ) : (
            chats.map((chat) => {
              const lastMessage = chat.messages[chat.messages.length - 1];
              const isSelected = chat.id === selectedChatId;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-200 flex flex-col gap-1 focus:outline-none ${
                    isSelected
                      ? "bg-primary/5 border-primary/25 shadow-sm"
                      : "bg-white border-neutral-200/60 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground truncate max-w-[120px]">{chat.customerName}</span>
                    <Badge className={`text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider ${
                      chat.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-neutral-500/10 text-neutral-500 border-neutral-200"
                    }`} variant="outline">{chat.status}</Badge>
                  </div>
                  {chat.customerEmail && (
                    <span className="text-[10px] text-muted-foreground truncate">{chat.customerEmail}</span>
                  )}
                  {lastMessage && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 italic mt-1">
                      {lastMessage.sender === "customer" ? "Customer: " : lastMessage.sender === "agent" ? "AI Agent: " : "Staff: "}
                      {lastMessage.text}
                    </p>
                  )}
                  <span className="text-[9px] text-neutral-400 font-mono mt-1 self-end">
                    {new Date(chat.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 shadow-none border border-muted-foreground/10 flex flex-col h-full bg-neutral-50">
        {selectedChat ? (
          <>
            <CardHeader className="p-4 bg-white border-b flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-emerald-600" /> {selectedChat.customerName}
                </CardTitle>
                <CardDescription className="text-[10px] font-mono">Session ID: {selectedChat.id}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => handleToggleStatus(selectedChat)} variant="outline" size="sm" className="h-8 px-2 text-[10px] gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {selectedChat.status === "active" ? "Mark Closed" : "Reopen Chat"}
                </Button>
                <Button onClick={() => handleDeleteChat(selectedChat.id)} variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500" title="Delete conversation log">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {selectedChat.messages.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">No messages exchanged in this session.</div>
              ) : (
                selectedChat.messages.map((msg, idx) => {
                  const isCustomer = msg.sender === "customer";
                  const isAI = msg.sender === "agent";
                  return (
                    <div key={idx} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3.5 space-y-1 shadow-sm text-xs leading-relaxed ${
                        isCustomer
                          ? "bg-white border text-foreground rounded-tl-none"
                          : isAI
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-950 rounded-tr-none"
                          : "bg-primary text-primary-foreground rounded-tr-none font-medium"
                      }`}>
                        <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-1 mb-1.5 text-[9px] font-mono opacity-60">
                          <span className="flex items-center gap-1">
                            {isCustomer ? <User className="h-2.5 w-2.5" /> : isAI ? <Bot className="h-2.5 w-2.5 text-emerald-600" /> : <ShieldAlert className="h-2.5 w-2.5 text-primary-foreground" />}
                            {isCustomer ? selectedChat.customerName.toUpperCase() : isAI ? "NEXA AI ASSISTANT" : "SUPPORT DESK (STAFF)"}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendReply} className="p-3 bg-white border-t flex gap-2 rounded-b-xl">
              <Input value={replyText} onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Type message to reply to ${selectedChat.customerName}...`}
                className="text-xs h-9" disabled={isSending || selectedChat.status === "closed"} />
              <Button type="submit" disabled={isSending || !replyText.trim() || selectedChat.status === "closed"}
                className="h-9 px-4 bg-primary text-white font-semibold gap-1.5 text-xs">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 text-neutral-300 mb-3" />
            <h3 className="text-sm font-semibold">Select a Support Pipeline</h3>
            <p className="text-xs max-w-xs mt-1">
              Pick an active customer support session from the sidebar to view transcripts or directly message the customer.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
