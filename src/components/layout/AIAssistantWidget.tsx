import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot,
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
  CreditCard,
  Sparkles,
  AlertCircle,
  Settings,
  ChevronDown,
  XCircle,
  TrendingUp,
  History,
  Check,
  Eye,
  EyeOff,
  Compass,
  ExternalLink,
  Zap,
  Navigation
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/hooks/useRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc, setDoc, collection, onSnapshot } from "firebase/firestore";

interface Ledger {
  storeId: string;
  period: string;
  creditsIncluded: number;
  creditsUsed: number;
  creditsPurchased: number;
  lastUpdated: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  image?: string;
  voice?: boolean;
  requestId?: string;
  pendingConfirmation?: {
    intent: string;
    explanation: string;
    parameters: {
      productName?: string;
      sku?: string;
      price?: number;
      costPrice?: number;
      categoryName?: string;
      quantity?: number;
      unit?: string;
      description?: string;
      itemId?: string;
      itemName?: string;
      adjustmentQuantity?: number;
      reason?: string;
      saleItems?: { name: string; quantity: number; price: number }[];
      totalNgn?: number;
      priceItemName?: string;
      oldPrice?: number;
      newPrice?: number;
      supplierName?: string;
      reorderItems?: { name: string; quantity: number }[];
    };
    status: "pending" | "completed" | "cancelled" | "error";
  };
  clarificationMessage?: string;
  report?: {
    type: string;
    data: Record<string, unknown>;
  };
}

const INTENT_ROUTES: Record<string, { path: string; label: string }> = {
  add_product: { path: "/app/catalog", label: "Catalog & Inventory" },
  adjust_stock: { path: "/app/catalog", label: "Catalog & Stock Adjustments" },
  record_sale: { path: "/app/sales", label: "Point of Sale (POS)" },
  check_report: { path: "/app/analytics", label: "Analytics & Reports" },
  price_update: { path: "/app/catalog", label: "Catalog & Price Management" },
  manage_customers: { path: "/app/customers", label: "Customer Directory" },
  customer_update: { path: "/app/customers", label: "Customer Directory" },
  purchase_order: { path: "/app/restocking", label: "Purchase Orders" },
  supplier_update: { path: "/app/suppliers", label: "Suppliers" },
  expense_record: { path: "/app/expenses", label: "Expense Ledger" },
  settings_update: { path: "/app/settings", label: "System Settings" },
};

export function AIAssistantWidget() {
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const currentTier = flags.planId || "starter";
  const { isSystemAdmin } = useRole();
  const { storeId: currentStoreId, switchStore } = useBusiness();
  const isSuperAdmin = isSystemAdmin;
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);

  // Autonomous Actions state
  const [autonomousActionsEnabled, setAutonomousActionsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.autonomousActions === "boolean") {
          return parsed.autonomousActions;
        }
      }
    } catch (e) {
      console.warn("Storage initial load error:", e);
    }
    return true; // Default enabled for Pro & Enterprise
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("nexa_smart_features");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.autonomousActions === "boolean") {
            setAutonomousActionsEnabled(parsed.autonomousActions);
          }
        }
      } catch (e) {
        console.warn("Storage listener parse error:", e);
      }
    };
    window.addEventListener("nexa_smart_features_updated", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("nexa_smart_features_updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleAutonomousActions = () => {
    const nextState = !autonomousActionsEnabled;
    setAutonomousActionsEnabled(nextState);
    try {
      const saved = localStorage.getItem("nexa_smart_features") || "{}";
      const parsed = JSON.parse(saved);
      parsed.autonomousActions = nextState;
      localStorage.setItem("nexa_smart_features", JSON.stringify(parsed));
      window.dispatchEvent(new Event("nexa_smart_features_updated"));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
    toast.info(nextState ? "⚡ Autonomous Actions & Auto-Navigation Activated" : "⏸️ Autonomous Actions Deactivated");
  };
  const [isOpen, setIsOpen] = useState(false);

  const isAutonomousAllowed = currentTier !== "starter" && autonomousActionsEnabled;
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to NEXAOS AI Business Assistant. How can I manage your store operations today? You can write, record a voice note, or upload a product photo to log inventory, record sales, adjust stock levels, update pricing, or view reports.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null);

  // Configuration and Ledger States
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(5000);
  const [byokKey, setByokKey] = useState("");
  const [showByokKey, setShowByokKey] = useState(false);
  const [showByokSettings, setShowByokSettings] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Fetch Credits Ledger
  const fetchLedger = useCallback(async () => {
    const activeStoreId = currentStoreId || "global-store";
    try {
      const res = await fetch(`/api/ai-assistant/credits/${activeStoreId}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      } else {
        setLedger({
          storeId: activeStoreId,
          period: new Date().toISOString().slice(0, 7),
          creditsIncluded: 100,
          creditsUsed: 0,
          creditsPurchased: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("Using offline default credits ledger:", err);
      setLedger({
        storeId: activeStoreId,
        period: new Date().toISOString().slice(0, 7),
        creditsIncluded: 100,
        creditsUsed: 0,
        creditsPurchased: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [currentStoreId]);

  // Fetch Custom API Key from Firestore Store Doc
  const fetchApiKey = useCallback(async () => {
    if (!auth.currentUser) return;
    const activeStoreId = currentStoreId || "global-store";
    try {
      const storeRef = doc(db, "stores", activeStoreId);
      const snap = await getDoc(storeRef);
      if (snap.exists() && snap.data().aiAssistantApiKey) {
        setByokKey(snap.data().aiAssistantApiKey);
      }
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (
        !msg.includes("permission-denied") &&
        !msg.includes("insufficient permissions") &&
        !msg.includes("offline") &&
        !msg.includes("client is offline") &&
        !msg.includes("unavailable")
      ) {
        console.error("Failed to fetch API key:", err);
      }
    }
  }, [currentStoreId]);

  useEffect(() => {
    fetchLedger();
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchApiKey();
      }
    });
    return () => unsub();
  }, [fetchLedger, fetchApiKey]);

  useEffect(() => {
    if (!isSystemAdmin) return;
    const unsub = onSnapshot(collection(db, "stores"), (snap) => {
      const list: { id: string; name: string }[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data?.name) {
          list.push({ id: docSnap.id, name: data.name });
        }
      });
      setStores(list);
    });
    return () => unsub();
  }, [isSystemAdmin]);

  // Audio Recording Handlers with robust permissions & stream cleanup
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported on this browser/device.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Try preferred types, fallback to browser default if none specified
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        options = { mimeType: 'audio/aac' };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          handleSendMultimodal("", base64Data, "audio/mp3", null, null);
        };

        // Clean up tracks to turn off recording indicator light on devices
        stream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info("Recording voice note...");
    } catch (err) {
      console.error("Microphone access failed:", err);
      toast.error("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success("Voice note captured.");
    }
  };

  // Image Upload Handlers
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageMime(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast.success("Product image attached.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Save BYOK Key to Firestore Store Doc or System Settings Doc
  const handleSaveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const trimmedKey = byokKey.trim();
      if (currentStoreId) {
        const storeRef = doc(db, "stores", currentStoreId);
        await updateDoc(storeRef, {
          aiAssistantApiKey: trimmedKey || null
        });
      }
      try {
        const sysSettingsRef = doc(db, "settings", "store");
        await setDoc(sysSettingsRef, { aiAssistantApiKey: trimmedKey || null }, { merge: true });
      } catch (e) {
        // ignore if permissions restriction
      }
      toast.success("Custom Gemini API Key updated successfully.");
      setShowByokSettings(false);
      fetchLedger();
    } catch (err: unknown) {
      console.error("Failed to save API key:", err);
      toast.error(`Failed to save key: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Purchase Top Up Credits
  const handleBuyTopUp = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch("/api/ai-assistant/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: currentStoreId,
          topUpAmountNgn: topUpAmount,
          paymentMethod: "card"
        })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully purchased ${data.creditsAdded} AI Credits!`);
        setShowTopUpModal(false);
        fetchLedger();
      } else {
        const err = await res.json();
        toast.error(err.error || "Purchase failed.");
      }
    } catch (err) {
      console.error("Failed top-up purchase:", err);
      toast.error("Top-up request failed.");
    }
  };

  // Send multimodal request to AI Assistant
  const handleSendMultimodal = async (
    text: string,
    voiceBase64: string | null = null,
    voiceMime: string | null = null,
    photoBase64: string | null = null,
    photoMime: string | null = null
  ) => {
    if (!text && !voiceBase64 && !photoBase64) return;
    setIsLoading(true);

    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: text || (voiceBase64 ? "🎙️ Sent a voice note" : "📸 Sent a product photo"),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: photoBase64 ? `data:${photoMime};base64,${photoBase64}` : undefined,
      voice: !!voiceBase64
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setSelectedImage(null);
    setSelectedImageMime(null);

    try {
      const res = await fetch("/api/ai-assistant/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: currentStoreId || "global-store",
          isSuperAdmin,
          message: text,
          voiceBase64,
          voiceMime,
          photoBase64,
          photoMime,
          customApiKey: byokKey || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        if (
          err.error === "GEMINI_QUOTA_EXHAUSTED" ||
          err.error === "RESOURCE_EXHAUSTED" ||
          (err.message && (err.message.includes("prepayment") || err.message.includes("429") || err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED")))
        ) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "⚠️ **Google Gemini API Quota Depleted**: The system Gemini API prepayment credits are currently depleted.\n\n💡 **Quick Solution**: You can enter your custom **Google Gemini API Key** in the **Custom Key** panel above to bypass system quota limits and power your AI Assistant directly.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setShowByokSettings(true);
        } else if (
          err.error === "GEMINI_KEY_INVALID" ||
          (err.message && (err.message.includes("API_KEY_INVALID") || err.message.includes("invalid")))
        ) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "🔑 **Invalid Gemini API Key**: The custom Gemini API Key provided is invalid or expired. Please check your key in the settings panel above.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setShowByokSettings(true);
        } else if (err.error === "AI_CREDITS_EXHAUSTED") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "⚠️ **AI Credits Exhausted**: You have run out of your monthly AI Assistant credits. Please purchase a credit top-up to continue managing operations via AI.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else if (err.error === "AI_ASSISTANT_LOCKED") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "🔒 **Enterprise Gated Feature**: The NEXAOS AI Business Assistant is exclusive to Enterprise subscribers. Please upgrade your subscription settings to unlock this workspace.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: `⚠️ **Processing Error**: ${err.message || "Unable to parse request."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsLoading(false);
        fetchLedger();
        return;
      }

      const data = await res.json();
      const parsedResult = data.result;

      let replyText = "";
      let pendingCard = undefined;
      let clarification = undefined;
      let reportData = undefined;

      if (parsedResult.intent === "clarify") {
        replyText = parsedResult.clarificationMessage || "Could you please provide more details about this operation?";
        clarification = replyText;
      } else if (parsedResult.intent === "check_report") {
        const repType = parsedResult.parameters?.reportType || "sales";
        replyText = `📊 Here is the **${repType.toUpperCase()}** report you requested for the selected period. Let me know if you need any other diagnostics!`;
        reportData = {
          type: repType,
          data: parsedResult.parameters
        };
      } else {
        replyText = `🤖 **Intent Classified**: I detected a request to **${parsedResult.intent.replace("_", " ")}** with ${Math.round(parsedResult.confidence * 100)}% confidence.\n\n*${parsedResult.explanation}*`;
        pendingCard = {
          intent: parsedResult.intent,
          explanation: parsedResult.explanation,
          parameters: parsedResult.parameters || {},
          status: "pending" as const
        };
      }

      const msgId = `assistant-${Date.now()}`;
      const newMsg = {
        id: msgId,
        sender: "assistant" as const,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requestId: data.requestId,
        pendingConfirmation: pendingCard,
        clarificationMessage: clarification,
        report: reportData
      };

      setMessages(prev => [...prev, newMsg]);

      // Check Autonomous Actions & Auto-Navigation
      const routeTarget = INTENT_ROUTES[parsedResult.intent];
      if (isAutonomousAllowed && parsedResult.intent !== "clarify" && data.requestId) {
        if (pendingCard) {
          try {
            const execRes = await fetch("/api/ai-assistant/execute-intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: data.requestId, storeId: currentStoreId || "global-store", isSuperAdmin })
            });

            if (execRes.ok) {
              setMessages(prev => prev.map(m => {
                if (m.id === msgId && m.pendingConfirmation) {
                  return {
                    ...m,
                    text: `${m.text}\n\n⚡ **Autonomously Executed**: Operation completed in store database!`,
                    pendingConfirmation: {
                      ...m.pendingConfirmation,
                      status: "completed" as const
                    }
                  };
                }
                return m;
              }));
              toast.success(`⚡ Autonomous Action Executed: ${parsedResult.intent.replace("_", " ").toUpperCase()}`);
            }
          } catch (execErr) {
            console.error("Autonomous execution error:", execErr);
          }
        }

        if (routeTarget) {
          toast.info(`⚡ Auto-Navigating to ${routeTarget.label}...`);
          setTimeout(() => {
            navigate(routeTarget.path);
          }, 700);
        }
      }

      fetchLedger();
    } catch (err) {
      console.error("API Call error:", err);
      toast.error("Could not communicate with NEXAOS AI server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send written text
  const handleSendText = () => {
    if (!inputText.trim() && !selectedImage) return;

    if (selectedImage) {
      const base64Str = selectedImage.split(",")[1];
      handleSendMultimodal(inputText, null, null, base64Str, selectedImageMime);
    } else {
      handleSendMultimodal(inputText, null, null, null, null);
    }
  };

  // Execute Intent after confirmation
  const handleConfirmIntent = async (msgId: string, requestId: string) => {
    try {
      const res = await fetch("/api/ai-assistant/execute-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, storeId: currentStoreId || "global-store", isSuperAdmin })
      });

      if (res.ok) {
        toast.success("Operation executed and saved to store!");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "completed" as const
              }
            };
          }
          return m;
        }));
        fetchLedger();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to execute operation.");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "error" as const
              }
            };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error("Execute intent error:", err);
      toast.error("Execution request failed.");
    }
  };

  // Cancel/Dismiss intent
  const handleCancelIntent = async (msgId: string, requestId: string) => {
    try {
      const res = await fetch("/api/ai-assistant/cancel-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      });

      if (res.ok) {
        toast.info("Action cancelled successfully.");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "cancelled" as const
              }
            };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error("Cancel intent error:", err);
      toast.error("Failed to cancel action.");
    }
  };

  return (
    <>
      {/* Floating Trigger FAB */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 lg:bottom-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
          title="Open AI Assistant"
          id="global-ai-widget-trigger"
        >
          {isOpen ? (
            <ChevronDown className="h-6 w-6" />
          ) : (
            <Bot className="h-6 w-6 animate-pulse" />
          )}
        </button>
      </div>

      {/* Expanded Dialog Widget Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 top-0 sm:top-auto sm:inset-x-auto sm:right-6 sm:bottom-20 sm:w-[440px] sm:h-[600px] bg-slate-50 dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl z-50 flex flex-col overflow-hidden font-sans"
            id="ai-assistant-widget-container"
          >
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="ai-widget-header">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">NEXAOS Business AI</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Autonomous voice & text agent</p>
                </div>
              </div>

              {/* Status & Options */}
              <div className="flex items-center gap-1.5">
                {/* Autonomous Toggle */}
                <button
                  onClick={toggleAutonomousActions}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full border transition-all ${
                    autonomousActionsEnabled
                      ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40"
                      : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                  }`}
                  title="Toggle Autonomous Actions & Navigation"
                  id="widget-autonomous-toggle-btn"
                >
                  <Zap className={`h-3 w-3 ${autonomousActionsEnabled ? "animate-pulse fill-amber-500 text-amber-500" : ""}`} />
                  <span>Auto: {autonomousActionsEnabled ? "ON" : "OFF"}</span>
                </button>

                <div className="text-[10px] rounded-full bg-indigo-50 px-2 py-1 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 max-w-[130px] truncate font-medium">
                  {isSuperAdmin ? "👑 Super Admin" : byokKey ? "Unlimited" : ledger ? `${((ledger.creditsIncluded || 0) + (ledger.creditsPurchased || 0) - (ledger.creditsUsed || 0))} cr` : "0 cr"}
                </div>

                {!byokKey && !isSuperAdmin && (
                  <button
                    onClick={() => setShowTopUpModal(true)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title="Top Up Credits"
                    id="widget-credits-topup-btn"
                  >
                    <CreditCard className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setShowByokSettings(!showByokSettings)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="API Key Configuration"
                  id="widget-byok-settings-btn"
                >
                  <Settings className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  id="widget-close-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Super Admin Store Context Bar */}
            {isSuperAdmin && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 flex items-center justify-between text-xs shrink-0" id="super-admin-store-switcher-widget">
                <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                  👑 Active Store Context:
                </span>
                <select
                  value={currentStoreId || ""}
                  onChange={(e) => switchStore?.(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500 max-w-[210px] truncate"
                  id="widget-super-admin-store-select"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* BYOK config screen within widget */}
            {showByokSettings && (
              <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 text-xs" id="widget-byok-panel">
                <h4 className="font-semibold text-slate-900 dark:text-white">Custom API Key (BYOK)</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Input a custom Gemini Key to bypass allowances entirely.
                </p>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showByokKey ? "text" : "password"}
                      placeholder="Gemini API Key..."
                      value={byokKey}
                      onChange={(e) => setByokKey(e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 pr-8 outline-none focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                      id="widget-byok-key-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowByokKey(!showByokKey)}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                      aria-label={showByokKey ? "Hide API key" : "Show API key"}
                    >
                      {showByokKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={isSavingKey}
                    className="rounded bg-indigo-600 px-3 py-1 font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 text-xs"
                    id="widget-byok-save-btn"
                  >
                    {isSavingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            )}

            {/* Conversation workspace */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" id="ai-widget-messages-container">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "assistant" && (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}

                    <div className="max-w-[85%] space-y-1.5">
                      <div
                        className={`rounded-2xl px-3.5 py-2 shadow-sm text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-800 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Attached Image */}
                        {msg.image && (
                          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                            <img src={msg.image} alt="Upload" className="max-h-40 w-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Confirmation Interactive Form */}
                      {msg.sender === "assistant" && msg.pendingConfirmation && (
                        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 p-3 shadow-sm dark:border-amber-950/50 dark:bg-amber-950/20 text-[11px]" id={`widget-confirm-${msg.id}`}>
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-semibold uppercase tracking-wide text-[9px]">Confirm Actions</span>
                          </div>

                          <div className="mt-2 space-y-1.5 rounded-lg bg-white p-2.5 shadow-inner dark:bg-slate-900">
                            {/* add_product entry check */}
                            {msg.pendingConfirmation.intent === "add_product" && (
                              <div className="space-y-1">
                                <span className="text-slate-400 font-medium block">Verify entry details:</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Name</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.productName || ""}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.productName = e.target.value;
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">SKU</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.sku || ""}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.sku = e.target.value;
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Selling Price</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.price || 0}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.price = Number(e.target.value);
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Stock</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.quantity || 0}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.quantity = Number(e.target.value);
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* adjust_stock check */}
                            {msg.pendingConfirmation.intent === "adjust_stock" && (
                              <div className="space-y-1">
                                <span className="text-slate-400 block font-medium">Verify adjustments:</span>
                                <span className="block font-semibold truncate">{msg.pendingConfirmation.parameters.itemName || "Item"}</span>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Change Qty</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.adjustmentQuantity || 0}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.adjustmentQuantity = Number(e.target.value);
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Reason</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.reason || ""}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.reason = e.target.value;
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* record_sale check */}
                            {msg.pendingConfirmation.intent === "record_sale" && (
                              <div className="space-y-1">
                                <span className="text-slate-400 block font-medium">Review sales transaction:</span>
                                <div className="max-h-20 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                  {(msg.pendingConfirmation.parameters.saleItems || []).map((si, sidx) => (
                                    <div key={sidx} className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                                      <span>{si.name} (x{si.quantity})</span>
                                      <span>₦{(si.price * si.quantity).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between border-t pt-1 border-slate-100 dark:border-slate-800">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">Total Price</span>
                                  <input
                                    type="number"
                                    className="bg-slate-50 border p-0.5 rounded w-20 text-right font-bold outline-none dark:bg-slate-800 text-[10px]"
                                    value={msg.pendingConfirmation.parameters.totalNgn || 0}
                                    onChange={(e) => {
                                      msg.pendingConfirmation!.parameters.totalNgn = Number(e.target.value);
                                      setMessages([...messages]);
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* price_update check */}
                            {msg.pendingConfirmation.intent === "price_update" && (
                              <div className="space-y-1">
                                <span className="text-slate-400 block font-medium">Change pricing details:</span>
                                <span className="block font-semibold truncate">{msg.pendingConfirmation.parameters.priceItemName}</span>
                                <div className="flex gap-4">
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">Old Price</label>
                                    <span className="line-through text-slate-400">₦{msg.pendingConfirmation.parameters.oldPrice || 0}</span>
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-slate-400 block">New Price (₦)</label>
                                    <input
                                      type="number"
                                      className="bg-slate-50 border p-0.5 rounded w-24 outline-none dark:bg-slate-800 text-[10px]"
                                      value={msg.pendingConfirmation.parameters.newPrice || 0}
                                      onChange={(e) => {
                                        msg.pendingConfirmation!.parameters.newPrice = Number(e.target.value);
                                        setMessages([...messages]);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* reorder check */}
                            {msg.pendingConfirmation.intent === "reorder" && (
                              <div className="space-y-1">
                                <span className="text-slate-400 block font-medium">Draft procurement order:</span>
                                <span className="block font-semibold truncate">Supplier: {msg.pendingConfirmation.parameters.supplierName}</span>
                                <div className="max-h-20 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                  {(msg.pendingConfirmation.parameters.reorderItems || []).map((ri, ridx) => (
                                    <div key={ridx} className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                                      <span>{ri.name}</span>
                                      <span>x{ri.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Control Buttons for pending confirmation */}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {INTENT_ROUTES[msg.pendingConfirmation.intent] && (
                              <button
                                onClick={() => msg.pendingConfirmation && navigate(INTENT_ROUTES[msg.pendingConfirmation.intent].path)}
                                className="w-full flex items-center justify-center gap-1 rounded bg-indigo-50 border border-indigo-200 py-1 text-center font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 transition text-[10px]"
                                title={`Navigate directly to ${INTENT_ROUTES[msg.pendingConfirmation.intent].label}`}
                              >
                                <Navigation className="h-3 w-3" />
                                <span>Go to {INTENT_ROUTES[msg.pendingConfirmation.intent].label}</span>
                              </button>
                            )}

                            {msg.pendingConfirmation.status === "pending" ? (
                              <div className="w-full flex gap-2">
                              <button
                                onClick={() => handleConfirmIntent(msg.id, msg.requestId || "")}
                                className="flex-1 rounded bg-amber-600 py-1 text-center font-bold text-white hover:bg-amber-500 transition active:scale-[0.98]"
                              >
                                Confirm Action
                              </button>
                              <button
                                onClick={() => handleCancelIntent(msg.id, msg.requestId || "")}
                                className="rounded bg-slate-200 dark:bg-slate-800 px-3 py-1 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2.5 flex items-center gap-1.5 font-semibold">
                              {msg.pendingConfirmation.status === "completed" && (
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Action completed successfully
                                </span>
                              )}
                              {msg.pendingConfirmation.status === "cancelled" && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <XCircle className="h-3.5 w-3.5" /> Action cancelled
                                </span>
                              )}
                              {msg.pendingConfirmation.status === "error" && (
                                <span className="text-red-500 flex items-center gap-1">
                                  <XCircle className="h-3.5 w-3.5" /> Execution failed
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                      {/* Display generated reports within widget */}
                      {msg.sender === "assistant" && msg.report && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-[11px]" id={`widget-report-${msg.id}`}>
                          <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 mb-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            <span className="font-bold uppercase tracking-wide text-[9px]">{msg.report.type} Diagnostics</span>
                          </div>
                          <div className="rounded bg-slate-50 dark:bg-slate-850 p-2 font-mono text-[10px] space-y-1">
                            {Object.entries(msg.report.data).map(([key, val]) => (
                              <div key={key} className="flex justify-between truncate">
                                <span className="text-slate-400">{key}:</span>
                                <span className="text-slate-800 dark:text-slate-200 font-semibold">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Attached media preview */}
            {selectedImage && (
              <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500 font-semibold truncate max-w-[200px]">Attached image</span>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setSelectedImageMime(null);
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Audio Recording preview inside layout */}
            {isRecording && (
              <div className="bg-red-500/10 px-4 py-2 flex items-center justify-between border-t border-red-500/20 text-xs text-red-600 dark:text-red-400 animate-pulse">
                <span className="font-semibold flex items-center gap-1.5">
                  <Mic className="h-4 w-4" /> Recording voice note...
                </span>
                <button
                  onClick={stopRecording}
                  className="rounded bg-red-600 text-white font-bold px-2.5 py-0.5 text-[10px] hover:bg-red-500 transition active:scale-95"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Bottom Input Controls Bar */}
            <div className="border-t border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900" id="ai-widget-input-bar">
              <div className="flex items-center gap-2">
                {/* File Upload Selector */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={handleImageClick}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Attach product photo"
                  id="widget-attach-image-btn"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                {/* Microphone Record Trigger */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="rounded-lg border border-slate-200 p-2 text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Record voice note"
                    id="widget-start-voice-btn"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 animate-pulse transition dark:bg-red-950/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Stop recording"
                    id="widget-stop-voice-btn"
                  >
                    <MicOff className="h-5 w-5" />
                  </button>
                )}

                {/* Text Input Block */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="e.g. 'Record sale of 3 Peak Milks'..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs outline-none transition focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-850 dark:text-white"
                    id="widget-text-query-input"
                  />
                  <button
                    onClick={handleSendText}
                    disabled={isLoading || (!inputText.trim() && !selectedImage)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 p-1.5 text-white transition hover:bg-indigo-500 disabled:opacity-40 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    id="widget-submit-query-btn"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credit Top-Up Modal from widget */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" id="widget-topup-modal">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 mx-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Purchase AI Credits</h3>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3.5">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Top-ups are non-expiring and billed instantly to your store balance.
              </p>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1 uppercase">Select Top-Up Volume</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setTopUpAmount(5000)}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      topUpAmount === 5000
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850"
                    }`}
                  >
                    <span className="block text-xs font-bold">₦5,000</span>
                    <span className="text-[9px] text-slate-400 font-medium">50 Credits</span>
                  </button>

                  <button
                    onClick={() => setTopUpAmount(10000)}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      topUpAmount === 10000
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850"
                    }`}
                  >
                    <span className="block text-xs font-bold">₦10,000</span>
                    <span className="text-[9px] text-slate-400 font-medium">100 Credits</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-850 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{topUpAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t pt-1 border-slate-200 dark:border-slate-700">
                  <span>Total Billable</span>
                  <span>₦{topUpAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleBuyTopUp}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-center font-semibold text-white hover:bg-indigo-500 transition"
                id="widget-execute-purchase-btn"
              >
                Complete Payment & Recharge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
