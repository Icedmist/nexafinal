import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Activity,
  RefreshCw,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldAlert,
  Play,
  Edit2,
  Trash2,
  Plus,
  Users,
  Eye,
  Mail,
  Target,
  TrendingUp,
  Award
} from "lucide-react";

interface RetentionEmailTemplate {
  templateId: string;
  name: string;
  subject: string;
  htmlBody: string;
  category: "welcome" | "billing" | "onboarding" | "low_stock";
}

interface RetentionTargetGoal {
  targetId: string;
  title: string;
  description: string;
  metricName: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline: string;
  status: "active" | "achieved" | "missed";
}

const DEFAULT_EMAIL_TEMPLATES: RetentionEmailTemplate[] = [
  {
    templateId: "tpl_welcome_back",
    name: "Inactive Welcome Back Campaign",
    subject: "We miss you at {{storeName}}! Here's a quick operations health check",
    category: "welcome",
    htmlBody: `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; padding: 24px;">
  <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0d9488; margin: 0; font-size: 22px;">NEXAOS RETENTION PLATFORM</h2>
  </div>
  <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Hello {{manager}},</p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    We noticed your branch, <strong>{{storeName}}</strong>, hasn't recorded any sales in the last {{days}} days. Keeping your catalog up-to-date helps prevent operational hiccups.
  </p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    NEXAOS features advanced offline-first POS sync, supplier automated ordering, and real-time ledger accounting designed to keep your business running smoothly without friction.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="/app" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">Resume Operations</a>
  </div>
  <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
    Prepared by Nexa Technologies Support. Email: support@nexaos.com
  </p>
</div>`
  },
  {
    templateId: "tpl_billing_renew",
    name: "Subscription Renewal Pitch",
    subject: "Action Required: Your NexaOS Premium trial for {{storeName}} is ending soon!",
    category: "billing",
    htmlBody: `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; padding: 24px;">
  <div style="text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #f59e0b; margin: 0; font-size: 22px;">NEXAOS BILLING CARE</h2>
  </div>
  <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Dear {{manager}},</p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    Your branch, <strong>{{storeName}}</strong>, is currently utilizing the full power of Nexa Professional. Your current trial period has {{days}} days remaining.
  </p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    To prevent any service interruption or temporary restriction of cross-branch visibility and multi-terminal access, please hook up your payment details inside your Settings panel.
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="/app/settings" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">Update Payment Details</a>
  </div>
  <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center;">
    Automated billing safeguard desk. Nexa Technologies Nigeria.
  </p>
</div>`
  },
  {
    templateId: "tpl_onboarding_guide",
    name: "First Catalog Item Guide",
    subject: "Get started on NexaOS: Let's list your first product at {{storeName}}",
    category: "onboarding",
    htmlBody: `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; padding: 24px;">
  <div style="text-align: center; border-bottom: 2px solid #14b8a6; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #14b8a6; margin: 0; font-size: 22px;">NEXAOS ONBOARDING DESK</h2>
  </div>
  <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Hello {{manager}},</p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    Welcome to NEXAOS! We are super excited to help power <strong>{{storeName}}</strong>. We noticed you haven't uploaded any stock or products yet.
  </p>
  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
    Adding items to your cloud database is incredibly easy:
    <ol>
      <li>Navigate to the Catalog Tab</li>
      <li>Click "Add Product"</li>
      <li>Enter the SKU, buying cost, selling price, and stock levels</li>
    </ol>
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="/app/catalog" style="background-color: #14b8a6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">Upload Your First Product</a>
  </div>
</div>`
  }
];

const INITIAL_TARGET_GOALS: RetentionTargetGoal[] = [
  {
    targetId: "target_churn",
    title: "Reduce Merchant Churn Rate",
    description: "Keep percentage of active merchants above threshold levels.",
    metricName: "Active Store Ratio",
    currentValue: 87,
    targetValue: 95,
    unit: "%",
    deadline: "2026-08-01",
    status: "active"
  },
  {
    targetId: "target_onboarding",
    title: "Complete Catalog Onboarding",
    description: "Successfully guide new signups to register their first item within 48 hours.",
    metricName: "Onboarded Rate",
    currentValue: 78,
    targetValue: 88,
    unit: "%",
    deadline: "2026-08-15",
    status: "active"
  },
  {
    targetId: "target_email_replies",
    title: "Personalized Email Campaign Success",
    description: "Achieve healthy conversion ratios on automated and on-demand emails.",
    metricName: "Conversion Ratio",
    currentValue: 24,
    targetValue: 35,
    unit: "%",
    deadline: "2026-09-01",
    status: "active"
  }
];

interface RetentionTriggerConfig {
  triggerId: string;
  name: string;
  condition: string;
  thresholdValue: number;
  channel: string;
  messageTemplate: string;
  isActive: boolean;
  cooldownDays: number;
}

interface RetentionEventRecord {
  eventId: string;
  storeId: string;
  triggerId: string;
  channel: string;
  sentAt: string;
  status: string;
  agentId?: string | null;
  meta?: {
    message?: string;
    storeName?: string;
    phone?: string;
    manual?: boolean;
  };
}

interface PerformanceMetric {
  triggerId: string;
  name: string;
  condition: string;
  thresholdValue: number;
  channel: string;
  messageTemplate: string;
  isActive: boolean;
  cooldownDays: number;
  sentCount: number;
  respondedCount: number;
  responseRate: number;
}

interface RetentionStore {
  id: string;
  storeName?: string;
  name?: string;
  isOnboarded?: boolean;
  lastSaleDate?: string;
  createdAt?: string;
  subscriptionStatus?: string;
  [key: string]: unknown;
}

interface RetentionAgent {
  agentId: string;
  fullName: string;
  email: string;
}

interface RetentionReferral {
  id: string;
  storeId: string;
  agentId: string;
  status: string;
}

interface ReportDeliveryRecord {
  id?: string;
  storeId?: string;
  recipientEmail?: string;
  frequency?: string;
  sentAt?: string;
  gmailQuotaUsedThisDay?: number;
  status?: string;
  simulated?: boolean;
  error?: string;
  summary?: {
    revenueNgn?: number;
    transactionCount?: number;
    lowStockCount?: number;
  };
}

export default function SystemAdminRetention() {
  const [triggers, setTriggers] = useState<RetentionTriggerConfig[]>([]);
  const [events, setEvents] = useState<RetentionEventRecord[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stores, setStores] = useState<RetentionStore[]>([]);
  const [agents, setAgents] = useState<RetentionAgent[]>([]);
  const [referrals, setReferrals] = useState<RetentionReferral[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<RetentionTriggerConfig | null>(null);

  const [activeTab, setActiveTab] = useState<"retention" | "emails" | "targets" | "reports">("retention");
  const [deliveries, setDeliveries] = useState<ReportDeliveryRecord[]>([]);
  const [simulatingReports, setSimulatingReports] = useState(false);
  const [testingReport, setTestingReport] = useState(false);
  const [testStoreId, setTestStoreId] = useState("");
  const [testRecipient, setTestRecipient] = useState("");
  const [reportSearchFilter, setReportSearchFilter] = useState("");
  const [reportDateFilter, setReportDateFilter] = useState("");

  const [emailTemplates, setEmailTemplates] = useState<RetentionEmailTemplate[]>(DEFAULT_EMAIL_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<RetentionEmailTemplate>(DEFAULT_EMAIL_TEMPLATES[0]);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_TEMPLATES[0].subject);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_TEMPLATES[0].htmlBody);
  const [emailRecipientStoreId, setEmailRecipientStoreId] = useState("");
  const [customRecipientEmail, setCustomRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedBulkStoreIds, setSelectedBulkStoreIds] = useState<string[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [retentionStatus, setRetentionStatus] = useState<{
    gmailConfigured: boolean;
    mode: string;
    recipientDomainHint: string;
  } | null>(null);

  useEffect(() => {
    const atRiskIds = stores.map(store => {
      const lastSaleTime = store.lastSaleDate ? new Date(store.lastSaleDate).getTime() : new Date(store.createdAt || Date.now()).getTime();
      const daysInactive = Math.floor((Date.now() - lastSaleTime) / (1000 * 60 * 60 * 24));
      
      let level = "healthy";
      if (daysInactive >= 3) {
        level = "at-risk";
      } else if (!store.isOnboarded) {
        level = "warning";
      }
      return { id: store.id, level };
    }).filter(s => s.level !== "healthy").map(s => s.id);
    
    setSelectedBulkStoreIds(atRiskIds);
  }, [stores]);

  const [targets, setTargets] = useState<RetentionTargetGoal[]>(INITIAL_TARGET_GOALS);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [newTarget, setNewTarget] = useState<Partial<RetentionTargetGoal>>({
    title: "",
    description: "",
    metricName: "Progress Rate",
    currentValue: 0,
    targetValue: 100,
    unit: "%",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "active"
  });
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTrigger, setNewTrigger] = useState<Partial<RetentionTriggerConfig>>({
    name: "",
    condition: "no_sales_logged_in_N_days",
    thresholdValue: 3,
    channel: "whatsapp",
    messageTemplate: "Hello {{storeName}}! We haven't heard from you in {{days}} days. Let's catch up!",
    cooldownDays: 7,
    isActive: true
  });

  useEffect(() => {
    const unsubTriggers = onSnapshot(collection(db, "retentionTriggers"), (snap) => {
      const list: RetentionTriggerConfig[] = [];
      snap.forEach((doc) => {
        list.push({ triggerId: doc.id, ...doc.data() as Omit<RetentionTriggerConfig, "triggerId"> });
      });
      setTriggers(list);
    });

    const unsubDeliveries = onSnapshot(collection(db, "reportDeliveries"), (snap) => {
      const list: ReportDeliveryRecord[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() as Omit<ReportDeliveryRecord, "id"> });
      });
      list.sort((a, b) => {
        const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return dateB - dateA;
      });
      setDeliveries(list);
    });

    const unsubEvents = onSnapshot(collection(db, "retentionEvents"), (snap) => {
      const list: RetentionEventRecord[] = [];
      snap.forEach((doc) => {
        list.push({ eventId: doc.id, ...doc.data() as Omit<RetentionEventRecord, "eventId"> });
      });
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setEvents(list);
    });

    const unsubStores = onSnapshot(collection(db, "stores"), (snap) => {
      const list: RetentionStore[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() as Omit<RetentionStore, "id"> });
      });
      setStores(list);
    });

    const unsubReferrals = onSnapshot(collection(db, "referrals"), (snap) => {
      const list: RetentionReferral[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() as Omit<RetentionReferral, "id"> });
      });
      setReferrals(list);
    });

    const unsubAgents = onSnapshot(collection(db, "agents"), (snap) => {
      const list: RetentionAgent[] = [];
      snap.forEach((doc) => {
        list.push({ agentId: doc.id, ...doc.data() as Omit<RetentionAgent, "agentId"> });
      });
      setAgents(list);
      setLoading(false);
    });

    fetchMetrics();
    fetchRetentionStatus();

    return () => {
      unsubTriggers();
      unsubDeliveries();
      unsubEvents();
      unsubStores();
      unsubReferrals();
      unsubAgents();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRetentionStatus = async () => {
    try {
      const response = await fetch("/api/retention/status");
      if (response.ok) {
        const data = await response.json();
        setRetentionStatus(data);
      }
    } catch (err) {
      console.warn("Failed to fetch retention status from server:", err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/retention/metrics");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.warn("Failed to fetch performance metrics from server:", err);
    }
  };

  const handleEvaluateAll = async () => {
    setEvaluating(true);
    const toastId = toast.loading("Analyzing merchant metrics and checking thresholds...");
    try {
      const res = await fetch("/api/retention/evaluate", { method: "POST" });
      if (!res.ok) throw new Error("Evaluation endpoint failed");
      const data = await res.json();
      
      toast.dismiss(toastId);
      if (data.firedCount > 0) {
        toast.success(`Retention Engine processed! Sent ${data.firedCount} automated nudges.`, {
          duration: 5000
        });
      } else {
        toast.success("Retention Engine processed! No store crossed threshold requirements.", {
          duration: 4000
        });
      }
      fetchMetrics();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Error evaluating retention rules.");
    } finally {
      setEvaluating(false);
    }
  };

  const handleManualNudge = async (storeId: string, triggerId: string) => {
    const toastId = toast.loading("Firing manual override trigger...");
    try {
      const res = await fetch("/api/retention/trigger-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, triggerId })
      });
      if (!res.ok) throw new Error("Manual nudge failed");
      
      toast.dismiss(toastId);
      toast.success("Manual WhatsApp retention notification successfully sent!");
      fetchMetrics();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Error sending manual nudge.");
    }
  };

  const handleSimulateScheduledReports = async () => {
    setSimulatingReports(true);
    const toastId = toast.loading("Evaluating scheduled PDF reports for all active merchants...");
    try {
      const res = await fetch("/api/reports/generate-scheduled", { method: "POST" });
      if (!res.ok) throw new Error("Scheduled reports generation failed");
      const data = await res.json();
      toast.dismiss(toastId);
      if (data.processedCount > 0) {
        toast.success(`Simulation Processed! Evaluated ${data.processedCount} stores. Successfully delivered ${data.sentCount} reports.`, {
          duration: 6000
        });
      } else {
        toast.success("Simulation Processed! No merchants are currently due for a scheduled report.", {
          duration: 5000
        });
      }
      if (data.quotaExceeded) {
        toast.warning("Volume Guard: Success limit was reached today (450/day). Pending reports are queued.", { duration: 6000 });
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to simulate scheduled reports.");
    } finally {
      setSimulatingReports(false);
    }
  };

  const handleTestReportGenerate = async () => {
    if (!testStoreId) {
      toast.error("Please select a store to generate the test report.");
      return;
    }
    setTestingReport(true);
    const toastId = toast.loading("Compiling metrics, building PDF, and triggering delivery...");
    try {
      const res = await fetch("/api/reports/test-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: testStoreId,
          recipientEmail: testRecipient.trim() || undefined
        })
      });
      if (!res.ok) throw new Error("Test report generation failed");
      const data = await res.json();
      toast.dismiss(toastId);
      toast.success(`Success! PDF report generated. ${data.simulated ? "Simulated delivery successful (no credentials)" : `Sent to ${data.recipient}`}!`, {
        duration: 5000
      });
      setTestStoreId("");
      setTestRecipient("");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to generate test report.");
    } finally {
      setTestingReport(false);
    }
  };

  const handleSaveTrigger = async (trigger: RetentionTriggerConfig) => {
    try {
      await setDoc(doc(db, "retentionTriggers", trigger.triggerId), trigger);
      toast.success(`Trigger "${trigger.name}" updated successfully.`);
      setEditingTrigger(null);
      fetchMetrics();
    } catch (err) {
      toast.error("Failed to update trigger rule.");
    }
  };

  const handleCreateTrigger = async () => {
    if (!newTrigger.name) {
      toast.error("Trigger name is required.");
      return;
    }
    const triggerId = `custom_${Date.now()}`;
    const fullTrigger = {
      triggerId,
      name: newTrigger.name,
      condition: newTrigger.condition || "no_sales_logged_in_N_days",
      thresholdValue: Number(newTrigger.thresholdValue) || 3,
      channel: newTrigger.channel || "whatsapp",
      messageTemplate: newTrigger.messageTemplate || "",
      cooldownDays: Number(newTrigger.cooldownDays) || 7,
      isActive: true
    } as RetentionTriggerConfig;

    try {
      await setDoc(doc(db, "retentionTriggers", triggerId), fullTrigger);
      toast.success("New custom retention rule generated!");
      setShowCreateForm(false);
      setNewTrigger({
        name: "",
        condition: "no_sales_logged_in_N_days",
        thresholdValue: 3,
        channel: "whatsapp",
        messageTemplate: "Hello {{storeName}}! We haven't heard from you in {{days}} days.",
        cooldownDays: 7,
        isActive: true
      });
      fetchMetrics();
    } catch (err) {
      toast.error("Failed to generate custom trigger.");
    }
  };

  const toggleTriggerStatus = async (trigger: RetentionTriggerConfig) => {
    try {
      await updateDoc(doc(db, "retentionTriggers", trigger.triggerId), {
        isActive: !trigger.isActive
      });
      toast.success(`Trigger "${trigger.name}" is now ${!trigger.isActive ? "ACTIVE" : "INACTIVE"}.`);
      fetchMetrics();
    } catch (err) {
      toast.error("Failed to toggle status.");
    }
  };

  const atRiskStores = stores.map(store => {
    const lastSaleTime = store.lastSaleDate ? new Date(store.lastSaleDate).getTime() : new Date(store.createdAt || Date.now()).getTime();
    const daysInactive = Math.floor((Date.now() - lastSaleTime) / (1000 * 60 * 60 * 24));
    
    const storeReferral = referrals.find(r => r.storeId === store.id && r.status === "converted");
    const agent = storeReferral ? agents.find(a => a.agentId === storeReferral.agentId) : null;

    let level = "healthy";
    let reason = "Active sales logged";

    if (daysInactive >= 3) {
      level = "at-risk";
      reason = `${daysInactive} days without logging sales`;
    } else if (!store.isOnboarded) {
      level = "warning";
      reason = "Onboarding flow incomplete";
    }

    return {
      ...store,
      daysInactive,
      agent,
      level,
      reason
    };
  }).filter(s => s.level !== "healthy");

  const handleTemplateChange = (tplId: string) => {
    const found = emailTemplates.find(t => t.templateId === tplId);
    if (found) {
      setSelectedTemplate(found);
      setEmailSubject(found.subject);
      setEmailBody(found.htmlBody);
    }
  };

  const getCompiledEmailPreview = () => {
    const store = stores.find(s => s.id === emailRecipientStoreId);
    const storeName = store ? (store.storeName || store.name || "Nexa Merchant") : "Main Warehouse";
    const manager = store ? ((store as Record<string, unknown>).ownerName || (store as Record<string, unknown>).manager || "Store Manager") : "Store Manager";
    const days = "7";
    
    return emailBody
      .replace(/\{\{storeName\}\}/g, storeName)
      .replace(/\{\{manager\}\}/g, String(manager))
      .replace(/\{\{days\}\}/g, days);
  };

  const getCompiledSubjectPreview = () => {
    const store = stores.find(s => s.id === emailRecipientStoreId);
    const storeName = store ? (store.storeName || store.name || "Nexa Merchant") : "Main Warehouse";
    return emailSubject.replace(/\{\{storeName\}\}/g, storeName);
  };

  const handleSendCustomEmail = async () => {
    if (!emailRecipientStoreId) {
      toast.error("Please select a recipient store.");
      return;
    }
    
    setSendingEmail(true);
    const toastId = toast.loading("Connecting with Gmail API, compiling merge tags, and initiating dispatch...");
    try {
      const store = stores.find(s => s.id === emailRecipientStoreId);
      const recipient = customRecipientEmail.trim() || String((store as Record<string, unknown>)?.managerEmail || (store as Record<string, unknown>)?.email || "merchant@nexaos.io");
      
      const compiledSubject = getCompiledSubjectPreview();
      const compiledBody = getCompiledEmailPreview();

      const res = await fetch("/api/retention/send-custom-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: emailRecipientStoreId,
          subject: compiledSubject,
          htmlBody: compiledBody,
          recipientEmail: recipient
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to dispatch custom retention email");
      }
      const data = await res.json();
      toast.dismiss(toastId);
      toast.success(`Success! Personalized email successfully sent. ${data.simulated ? "(Simulated delivery sandbox)" : `Delivered to ${recipient}`}!`, {
        duration: 5000
      });
      setEmailRecipientStoreId("");
      setCustomRecipientEmail("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to send personalized email nudge.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendBulkEmail = async () => {
    if (selectedBulkStoreIds.length === 0) {
      toast.error("Please select at least one store for bulk outreach.");
      return;
    }

    setSendingBulk(true);
    const toastId = toast.loading(`Connecting with Gmail API and executing bulk outreach to ${selectedBulkStoreIds.length} merchants...`);
    try {
      const res = await fetch("/api/retention/send-bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeIds: selectedBulkStoreIds,
          subjectTemplate: emailSubject,
          htmlBodyTemplate: emailBody
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to dispatch bulk retention campaign");
      }
      const data = await res.json();
      toast.dismiss(toastId);
      toast.success(`Success! Bulk email outreach completed. Successfully dispatched to ${data.successCount} merchants.`, {
        duration: 5000
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to execute bulk email campaign.");
    } finally {
      setSendingBulk(false);
    }
  };

  const handleCreateTargetGoal = () => {
    if (!newTarget.title) {
      toast.error("Target title is required.");
      return;
    }
    const goal: RetentionTargetGoal = {
      targetId: `tgt_${Date.now()}`,
      title: newTarget.title,
      description: newTarget.description || "",
      metricName: newTarget.metricName || "Progress Rate",
      currentValue: Number(newTarget.currentValue) || 0,
      targetValue: Number(newTarget.targetValue) || 100,
      unit: newTarget.unit || "%",
      deadline: newTarget.deadline || new Date().toISOString().slice(0, 10),
      status: "active"
    };

    setTargets([...targets, goal]);
    setShowTargetForm(false);
    setNewTarget({
      title: "",
      description: "",
      metricName: "Progress Rate",
      currentValue: 0,
      targetValue: 100,
      unit: "%",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "active"
    });
    toast.success("New retention goal target established!");
  };

  const handleUpdateTargetValue = (targetId: string, value: number) => {
    setTargets(targets.map(t => {
      if (t.targetId === targetId) {
        const newVal = Math.min(t.targetValue, Math.max(0, value));
        const newStatus = newVal >= t.targetValue ? "achieved" : "active";
        return { ...t, currentValue: newVal, status: newStatus as "active" | "achieved" };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Super Admin Control Center
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor inactive store signals, check scheduled business report dispatches, manage WhatsApp campaigns, and track platform health.
          </p>
        </div>
        {activeTab === "retention" && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleEvaluateAll}
              disabled={evaluating}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${evaluating ? "animate-spin" : ""}`} /> Run Evaluation Cycle
            </Button>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Create Trigger Rule
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-muted-foreground/10 gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("retention")}
          className={`px-4 py-2 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === "retention"
              ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          User Engagement & Retention
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`px-4 py-2 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === "emails"
              ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          Personalized Email Nudges
        </button>
        <button
          onClick={() => setActiveTab("targets")}
          className={`px-4 py-2 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === "targets"
              ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          Target Goals & Cohorts
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === "reports"
              ? "border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          }`}
        >
          Automated Business Reports
        </button>
      </div>

      {activeTab === "retention" && (
        <>

      {/* Trigger Creator Modal/Block */}
      {showCreateForm && (
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold font-sans">Configure Custom Retention Rule</CardTitle>
            <CardDescription className="text-xs">Add a custom automated signal validator targeting store performance records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Rule Name</label>
                <input
                  type="text"
                  placeholder="e.g. Inactive Platinum Merchants"
                  value={newTrigger.name}
                  onChange={e => setNewTrigger({ ...newTrigger, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Condition Type</label>
                <select
                  value={newTrigger.condition}
                  onChange={e => setNewTrigger({ ...newTrigger, condition: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background"
                >
                  <option value="no_sales_logged_in_N_days">No sales logged in N days</option>
                  <option value="trial_ending_in_N_days">Trial ending in N days</option>
                  <option value="subscription_past_due">Subscription past due</option>
                  <option value="onboarding_incomplete_after_N_days">Onboarding incomplete after N days</option>
                  <option value="low_stock_no_reorder">Low stock without supplier reorders</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Threshold (N)</label>
                  <input
                    type="number"
                    value={newTrigger.thresholdValue}
                    onChange={e => setNewTrigger({ ...newTrigger, thresholdValue: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Cooldown (Days)</label>
                  <input
                    type="number"
                    value={newTrigger.cooldownDays}
                    onChange={e => setNewTrigger({ ...newTrigger, cooldownDays: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Channel</label>
                  <select
                    value={newTrigger.channel}
                    onChange={e => setNewTrigger({ ...newTrigger, channel: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="in_app">In-App</option>
                    <option value="email">Email Campaign</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">WhatsApp Template Message</label>
              <textarea
                rows={3}
                placeholder="Use tags like {{storeName}}, {{days}}, {{count}}, {{link}}"
                value={newTrigger.messageTemplate}
                onChange={e => setNewTrigger({ ...newTrigger, messageTemplate: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border bg-background font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button size="sm" className="text-xs" onClick={handleCreateTrigger}>
                Generate Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Bento-Grid */}
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        <Card className="shadow-none border border-muted-foreground/10 p-5 flex items-center justify-between bg-muted/25">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Rules Defined</span>
            <p className="text-2xl font-bold font-sans">{triggers.length}</p>
            <span className="text-[10px] text-emerald-500 font-bold block">{triggers.filter(t => t.isActive).length} active rule hooks</span>
          </div>
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            <Activity className="h-5 w-5" />
          </div>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-5 flex items-center justify-between bg-muted/25">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Alert Deliveries Sent</span>
            <p className="text-2xl font-bold font-sans">{events.length}</p>
            <span className="text-[10px] text-muted-foreground block font-medium">WhatsApp / System SMS logs</span>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
            <Send className="h-5 w-5" />
          </div>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-5 flex items-center justify-between bg-muted/25">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Average Response Rate</span>
            <p className="text-2xl font-bold font-sans">
              {metrics.length > 0
                ? Math.round(metrics.reduce((acc, curr) => acc + curr.responseRate, 0) / metrics.length)
                : 0}%
            </p>
            <span className="text-[10px] text-emerald-500 font-bold block">Action logged inside 7 days</span>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-5 flex items-center justify-between bg-muted/25">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Stores Needing Nudges</span>
            <p className="text-2xl font-bold font-sans text-red-500">{atRiskStores.length}</p>
            <span className="text-[10px] text-amber-500 font-bold block">Requires follow-up check</span>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <AlertCircle className="h-5 w-5" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Rules management block */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-muted-foreground">Trigger Configuration Registry</h3>
          
          <div className="space-y-3">
            {triggers.map(trigger => {
              const metric = metrics.find(m => m.triggerId === trigger.triggerId);
              const isEditing = editingTrigger?.triggerId === trigger.triggerId;

              return (
                <Card key={trigger.triggerId} className="shadow-none border border-muted-foreground/10">
                  <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground font-sans">{trigger.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-tight bg-muted/50">
                          {trigger.condition}
                        </Badge>
                        <Badge variant={trigger.isActive ? "default" : "secondary"} className="text-[9px] uppercase tracking-wide font-bold">
                          {trigger.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {isEditing ? (
                        <div className="pt-3 space-y-3 border-t mt-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block">Threshold</label>
                              <input
                                type="number"
                                value={editingTrigger.thresholdValue}
                                onChange={e => setEditingTrigger({ ...editingTrigger, thresholdValue: Number(e.target.value) })}
                                className="w-full text-xs p-2 rounded border bg-background mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block">Cooldown (Days)</label>
                              <input
                                type="number"
                                value={editingTrigger.cooldownDays}
                                onChange={e => setEditingTrigger({ ...editingTrigger, cooldownDays: Number(e.target.value) })}
                                className="w-full text-xs p-2 rounded border bg-background mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] uppercase font-bold text-muted-foreground block">Channel</label>
                              <select
                                value={editingTrigger.channel}
                                onChange={e => setEditingTrigger({ ...editingTrigger, channel: e.target.value })}
                                className="w-full text-xs p-2 rounded border bg-background mt-1"
                              >
                                <option value="whatsapp">WhatsApp</option>
                                <option value="sms">SMS</option>
                                <option value="in_app">In-App</option>
                                <option value="email">Personalized Email</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] uppercase font-bold text-muted-foreground block">Template</label>
                            <textarea
                              rows={3}
                              value={editingTrigger.messageTemplate}
                              onChange={e => setEditingTrigger({ ...editingTrigger, messageTemplate: e.target.value })}
                              className="w-full text-xs p-2 rounded border bg-background mt-1 font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setEditingTrigger(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSaveTrigger(editingTrigger)}>
                              <Save className="h-3.5 w-3.5 mr-1" /> Save Rule
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground font-mono bg-muted/20 p-2.5 rounded-lg border border-dashed leading-relaxed">
                            {trigger.messageTemplate}
                          </p>

                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                            <span>Threshold: <strong className="text-foreground">{trigger.thresholdValue} days/units</strong></span>
                            <span>Cooldown: <strong className="text-foreground">{trigger.cooldownDays} days</strong></span>
                            <span>Channel: <strong className="text-foreground uppercase">{trigger.channel}</strong></span>
                            {metric && (
                              <span className="text-emerald-500 font-bold">
                                Response: {metric.respondedCount}/{metric.sentCount} ({metric.responseRate}%)
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingTrigger({ ...trigger })}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 ${trigger.isActive ? "text-amber-500" : "text-muted-foreground"}`}
                          onClick={() => toggleTriggerStatus(trigger)}
                        >
                          <Play className={`h-3.5 w-3.5 ${trigger.isActive ? "fill-amber-500" : ""}`} />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* At risk list and manual trigger overrides */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-muted-foreground">Merchant Action Desk</h3>
          
          <Card className="shadow-none border border-muted-foreground/10">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-bold font-sans uppercase">At-Risk Stores & Overrides</CardTitle>
              <CardDescription className="text-[10px]">Direct overrides bypass cooldowns to notify merchants and alert agents immediately.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y max-h-[480px] overflow-y-auto">
              {atRiskStores.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  All active branches meet health checks!
                </div>
              ) : (
                atRiskStores.map(store => (
                  <div key={store.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground block font-sans">{store.storeName || store.name}</span>
                        <span className="text-[10px] text-muted-foreground block">{store.reason}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-red-500 bg-red-500/5 border-red-500/20">
                        {store.level}
                      </Badge>
                    </div>

                    <div className="text-[10px] text-muted-foreground flex items-center justify-between flex-wrap gap-1 bg-muted/20 p-1.5 rounded">
                      <span>Agent: <strong>{store.agent ? store.agent.fullName : "Organic Sign-up"}</strong></span>
                      {store.agent && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold">REFERRED</span>}
                    </div>

                    <div className="flex items-center gap-1 pt-1 justify-end">
                      <select
                        id={`nudge-select-${store.id}`}
                        defaultValue="inactivity_nudge"
                        className="text-[10px] border rounded bg-background p-1 h-7 text-muted-foreground"
                      >
                        {triggers.map(t => (
                          <option key={t.triggerId} value={t.triggerId}>{t.name}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="text-[10px] h-7 bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 gap-1"
                        onClick={() => {
                          const triggerId = (document.getElementById(`nudge-select-${store.id}`) as HTMLSelectElement).value;
                          handleManualNudge(store.id, triggerId);
                        }}
                      >
                        <Send className="h-3 w-3" /> Nudge
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dynamic event audit logs */}
      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold font-sans uppercase">Campaign Logs & Delivery Feed</CardTitle>
            <CardDescription className="text-[10px]">Real-time history of automatically fired triggers and corresponding agent task assignments.</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {events.length} logged actions
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left divide-y">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[9px] font-bold">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Merchant Store</th>
                  <th className="p-4">Trigger Action</th>
                  <th className="p-4">Delivery Channel</th>
                  <th className="p-4">Message Preview</th>
                  <th className="p-4">Assigned Agent</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-background font-sans">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No retention events fired in this node instance yet.
                    </td>
                  </tr>
                ) : (
                  events.slice(0, 20).map(evt => {
                    const trig = triggers.find(t => t.triggerId === evt.triggerId);
                    const agent = agents.find(a => a.agentId === evt.agentId);

                    return (
                      <tr key={evt.eventId} className="hover:bg-muted/5">
                        <td className="p-4 whitespace-nowrap text-muted-foreground font-mono text-[10px]">
                          {new Date(evt.sentAt).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          {evt.meta?.storeName || evt.storeId}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-muted-foreground">{trig ? trig.name : evt.triggerId}</span>
                          {evt.meta?.manual && <Badge className="ml-1 text-[8px] bg-amber-500/15 text-amber-500 border-none font-sans uppercase">Manual</Badge>}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/5 text-green-500 border-green-500/20">
                            {evt.channel}
                          </Badge>
                        </td>
                        <td className="p-4 max-w-xs truncate text-muted-foreground" title={evt.meta?.message}>
                          {evt.meta?.message || "No message logged"}
                        </td>
                        <td className="p-4">
                          {agent ? (
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium text-foreground">{agent.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">Organic Sign-up</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-[10px] uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            {evt.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {activeTab === "emails" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Email Engine Configuration Status Banner */}
          {retentionStatus ? (
            retentionStatus.gmailConfigured ? (
              <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 flex items-start gap-3.5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-[10px]">Gmail Live Outreach Active</h4>
                  <p className="text-muted-foreground leading-normal">The Gmail API retention engine is successfully configured with an active <strong>GMAIL_ACCESS_TOKEN</strong>. Personalized customer reactivation emails will be delivered instantly to target clients.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300 flex items-start gap-3.5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5 flex-1">
                  <div className="flex justify-between items-center gap-2">
                    <h4 className="font-bold uppercase tracking-wider text-[10px]">High-Fidelity Simulated Sandbox Delivery Active</h4>
                    <Badge className="text-[8px] uppercase font-bold text-indigo-700 bg-indigo-500/10 border border-indigo-500/25 shrink-0">Option 2 (Default Sandbox)</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    NEXAOS Email outreach is running in <strong>Simulated Sandbox Delivery Mode</strong>. All email dispatches, manual campaigns, and automated scheduled business reports will run instantly, execute template compiling with live merge tags, and log flawlessly to the timeline without sending real emails.
                  </p>
                  <div className="pt-2.5 border-t border-indigo-500/10 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-bold text-indigo-800 dark:text-indigo-400">Key benefits of Simulated Sandbox Mode:</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>Allows seamless offline demo testing and merchant training without spamming real inboxes.</li>
                      <li>Simulates 100% realistic API response behaviors, status updates, and quota indexes.</li>
                      <li>Instantly preview dynamic merge tags (e.g. store names, manager names, low stock lists) live in the dispatch console.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 rounded-xl border bg-muted/20 animate-pulse flex items-center gap-3">
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Verifying Gmail API configuration status...</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {/* Template Selector & Editor */}
            <Card className="md:col-span-2 shadow-none border border-muted-foreground/10">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xs font-bold font-sans uppercase">Personalized Email Campaign Template Editor</CardTitle>
                <CardDescription className="text-[10px]">Select preset engagement newsletters, customize HTML copy, and replace placeholders dynamically.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Preset Template</label>
                    <select
                      value={selectedTemplate.templateId}
                      onChange={e => handleTemplateChange(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    >
                      {emailTemplates.map(t => (
                        <option key={t.templateId} value={t.templateId}>{t.name} ({t.category.toUpperCase()})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Email Subject Line</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                      placeholder="Enter personalized subject..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">HTML Template Code</label>
                    <span className="text-[8px] text-teal-600 font-mono">Available Tags: {"{{storeName}}"}, {"{{manager}}"}, {"{{days}}"}</span>
                  </div>
                  <textarea
                    rows={12}
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background font-mono leading-relaxed"
                    placeholder="HTML structure or raw text..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Quick Dispatch Desk */}
              <Card className="shadow-none border border-muted-foreground/10">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-xs font-bold font-sans uppercase">Quick Dispatch Desk</CardTitle>
                  <CardDescription className="text-[10px]">Target a specific merchant, specify recipient override and send personalized email instantly.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Target Recipient Store</label>
                    <select
                      value={emailRecipientStoreId}
                      onChange={e => setEmailRecipientStoreId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    >
                      <option value="">-- Choose Merchant Store --</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.storeName || s.name} ({String((s as Record<string, unknown>)?.ownerEmail || "No Email Defined")})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Recipient Email Override</label>
                    <input
                      type="email"
                      value={customRecipientEmail}
                      onChange={e => setCustomRecipientEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                      placeholder="Optional: custom-email@domain.com"
                    />
                    <p className="text-[9px] text-muted-foreground">Defaults to merchant account owner email if left blank.</p>
                  </div>

                  <Button
                    onClick={handleSendCustomEmail}
                    disabled={sendingEmail || !emailRecipientStoreId}
                    className="w-full text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 gap-2 mt-4"
                  >
                    <Mail className="h-4 w-4" />
                    {sendingEmail ? "Dispatching..." : "Send Personalized Nudge"}
                  </Button>

                  {/* Live Compilation Preview Box */}
                  {emailRecipientStoreId && (
                    <div className="mt-4 p-4 border border-dashed rounded-lg bg-muted/15 space-y-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block border-b pb-1">Live Dynamic Compilation Preview</span>
                      <div className="text-[11px] space-y-1 text-muted-foreground font-sans">
                        <p><strong>Subject:</strong> {getCompiledSubjectPreview()}</p>
                        <p className="text-[10px] bg-muted/40 p-2 rounded max-h-[140px] overflow-y-auto font-mono text-[9px] leading-normal" dangerouslySetInnerHTML={{ __html: getCompiledEmailPreview() }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bulk Campaign Dispatch Desk */}
              <Card className="shadow-none border border-muted-foreground/10">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold font-sans uppercase">Bulk Outreach Desk</CardTitle>
                    <Badge variant="destructive" className="text-[8px] uppercase tracking-wider font-extrabold animate-pulse">BULK CAMPAIGN</Badge>
                  </div>
                  <CardDescription className="text-[10px]">Send personalized emails to multiple at-risk/warning merchants at once.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Select At-Risk Merchants</label>
                      <button
                        type="button"
                        onClick={() => {
                          const atRiskIds = atRiskStores.map(s => s.id);
                          if (selectedBulkStoreIds.length === atRiskIds.length) {
                            setSelectedBulkStoreIds([]);
                          } else {
                            setSelectedBulkStoreIds(atRiskIds);
                          }
                        }}
                        className="text-[9px] text-teal-600 font-bold hover:underline"
                      >
                        {selectedBulkStoreIds.length === atRiskStores.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    {atRiskStores.length === 0 ? (
                      <div className="p-3 border border-dashed rounded-lg bg-emerald-500/5 text-center">
                        <p className="text-[10px] text-emerald-600 font-bold">No stores are currently at risk!</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg max-h-[160px] overflow-y-auto divide-y bg-background p-1.5 space-y-1">
                        {atRiskStores.map(store => {
                          const isChecked = selectedBulkStoreIds.includes(store.id);
                          return (
                            <label key={store.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer text-[10px]">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedBulkStoreIds(selectedBulkStoreIds.filter(id => id !== store.id));
                                  } else {
                                    setSelectedBulkStoreIds([...selectedBulkStoreIds, store.id]);
                                  }
                                }}
                                className="rounded border-muted text-teal-600 focus:ring-teal-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">{store.storeName || store.name}</p>
                                <p className="text-[9px] text-muted-foreground truncate">{String((store as Record<string, unknown>)?.ownerEmail || (store as Record<string, unknown>)?.email || "No Email Defined")}</p>
                              </div>
                              <Badge variant="outline" className="text-[8px] px-1 py-0 scale-90">
                                {store.daysInactive}d inactive
                              </Badge>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSendBulkEmail}
                    disabled={sendingBulk || selectedBulkStoreIds.length === 0}
                    className="w-full text-xs bg-red-600 hover:bg-red-700 text-white font-bold h-10 gap-2 mt-2"
                  >
                    <Send className="h-4 w-4" />
                    {sendingBulk ? `Dispatching Bulk (${selectedBulkStoreIds.length})...` : `Dispatch Bulk Campaign (${selectedBulkStoreIds.length} Stores)`}
                  </Button>

                  <div className="p-3 bg-muted/20 border rounded-lg">
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      <strong>Note:</strong> Bulk campaign compiles subject lines and body copy individually for each store, substituting personalized merge tags (<code>{"{{storeName}}"}</code>, <code>{"{{manager}}"}</code>, and <code>{"{{days}}"}</code>) prior to dispatch.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Email Deliveries Feed */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold font-sans uppercase">Email Campaigns & Delivery Records</CardTitle>
                <CardDescription className="text-[10px]">Audit trail of email-channel campaign dispatches, status codes, and GMail API logs.</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {events.filter(e => e.channel === "email").length} email dispatches logged
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[9px] font-bold">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Target Store</th>
                      <th className="p-4">Recipient</th>
                      <th className="p-4">Subject Preview</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-background font-sans">
                    {events.filter(e => e.channel === "email").length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No email retention dispatches logged in this workspace yet.
                        </td>
                      </tr>
                    ) : (
                      events.filter(e => e.channel === "email").map(evt => {
                        return (
                          <tr key={evt.eventId} className="hover:bg-muted/5">
                            <td className="p-4 whitespace-nowrap text-muted-foreground font-mono text-[10px]">
                              {new Date(evt.sentAt).toLocaleString()}
                            </td>
                            <td className="p-4 font-bold text-foreground">
                              {evt.meta?.storeName || evt.storeId}
                            </td>
                            <td className="p-4 font-mono text-[11px] text-muted-foreground">
                              {evt.meta?.phone || "merchant@nexaos.io"}
                            </td>
                            <td className="p-4 max-w-xs truncate text-muted-foreground">
                              {evt.meta?.message || "NEXAOS Engagement Notice"}
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <Badge className="text-[9px] bg-teal-500/10 text-teal-600 border-none uppercase font-bold">GMail API</Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-[10px] uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                {evt.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "targets" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-muted-foreground">Campaign Objectives & KPI Targets</h3>
              <p className="text-[10px] text-muted-foreground">Establish company performance benchmarks, assign target metrics and evaluate real-time conversion rates.</p>
            </div>
            <Button
              onClick={() => setShowTargetForm(!showTargetForm)}
              size="sm"
              variant="outline"
              className="text-xs h-9 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Establish Target Goal
            </Button>
          </div>

          {showTargetForm && (
            <Card className="border border-teal-500/20 bg-teal-500/5 shadow-sm p-6">
              <div className="text-sm font-bold font-sans pb-3 border-b mb-4">Set Campaign Performance Target</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Target Title</label>
                  <input
                    type="text"
                    value={newTarget.title}
                    onChange={e => setNewTarget({ ...newTarget, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    placeholder="e.g. Recover 5 Slipped-Away Store branches"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Description</label>
                  <input
                    type="text"
                    value={newTarget.description}
                    onChange={e => setNewTarget({ ...newTarget, description: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    placeholder="Explain target objective..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Current</label>
                    <input
                      type="number"
                      value={newTarget.currentValue}
                      onChange={e => setNewTarget({ ...newTarget, currentValue: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Goal</label>
                    <input
                      type="number"
                      value={newTarget.targetValue}
                      onChange={e => setNewTarget({ ...newTarget, targetValue: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Unit</label>
                    <input
                      type="text"
                      value={newTarget.unit}
                      onChange={e => setNewTarget({ ...newTarget, unit: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border bg-background"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowTargetForm(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreateTargetGoal}>
                  Generate Target
                </Button>
              </div>
            </Card>
          )}

          {/* Targets Progress Bento Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            {targets.map(tgt => {
              const percentage = Math.round((tgt.currentValue / tgt.targetValue) * 100);
              return (
                <Card key={tgt.targetId} className="shadow-none border border-muted-foreground/10 p-5 flex flex-col justify-between bg-muted/15">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold font-sans block text-foreground leading-tight">{tgt.title}</span>
                      <Badge variant="outline" className={`text-[9px] uppercase font-extrabold ${tgt.status === "achieved" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-teal-500/10 text-teal-500 border-teal-500/20"}`}>
                        {tgt.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{tgt.description}</p>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{tgt.metricName}</span>
                      <span className="font-bold text-foreground">{tgt.currentValue}{tgt.unit} / {tgt.targetValue}{tgt.unit} ({percentage}%)</span>
                    </div>
                    
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-muted-foreground/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${tgt.status === "achieved" ? "bg-emerald-500" : "bg-teal-500"}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1 border-t border-muted-foreground/5 mt-2">
                      <span>Deadline: <strong>{tgt.deadline}</strong></span>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-5 px-1.5 text-[8px] font-bold text-primary"
                          onClick={() => handleUpdateTargetValue(tgt.targetId, tgt.currentValue + 1)}
                          disabled={tgt.status === "achieved"}
                        >
                          + Increment
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Smart Merchant Cohort Segmentation */}
          <div className="space-y-4 pt-4">
            <div>
              <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-muted-foreground">Smart Merchant Cohort Segments</h3>
              <p className="text-[10px] text-muted-foreground">Deep behavioral segmentation algorithm evaluating and clustering store accounts for targeted multi-channel outreach.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Cohort 1: Slipped Away */}
              <Card className="shadow-none border border-muted-foreground/10">
                <CardHeader className="pb-3 border-b bg-red-500/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold font-sans uppercase text-red-600 dark:text-red-400">Cohort: Slipped Away (Inactive &gt; 5 Days)</CardTitle>
                    <CardDescription className="text-[10px]">Stores that logged sales before but have gone completely quiet.</CardDescription>
                  </div>
                  <Badge className="bg-red-500/10 text-red-500 border-none text-[10px] font-bold">
                    {atRiskStores.filter(s => s.daysInactive > 5).length} Stores
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 divide-y max-h-[320px] overflow-y-auto">
                  {atRiskStores.filter(s => s.daysInactive > 5).length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No merchants currently fit this cohort segment!
                    </div>
                  ) : (
                    atRiskStores.filter(s => s.daysInactive > 5).map(store => (
                      <div key={store.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-foreground block font-sans">{store.storeName || store.name}</span>
                          <span className="text-[10px] text-red-500 font-mono block">Offline for {store.daysInactive} days | Sector: {String((store as Record<string, unknown>)?.sector || "General")}</span>
                        </div>
                        <Button
                          size="sm"
                          className="text-[10px] h-7 bg-red-500 hover:bg-red-600 text-white font-bold"
                          onClick={() => {
                            setActiveTab("emails");
                            setEmailRecipientStoreId(store.id);
                            handleTemplateChange("tpl_welcome_back");
                          }}
                        >
                          Send Welcome Back Nudge
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Cohort 2: Cold-Start Onboarding */}
              <Card className="shadow-none border border-muted-foreground/10">
                <CardHeader className="pb-3 border-b bg-amber-500/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold font-sans uppercase text-amber-600 dark:text-amber-400">Cohort: Cold-Start (0 Sales Recorded)</CardTitle>
                    <CardDescription className="text-[10px]">Registered stores that have never recorded their first transaction yet.</CardDescription>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-500 border-none text-[10px] font-bold">
                    {stores.filter(s => !s.isOnboarded || s.lastSaleDate === undefined).length} Stores
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 divide-y max-h-[320px] overflow-y-auto">
                  {stores.filter(s => !s.isOnboarded || s.lastSaleDate === undefined).length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      All registered stores have logged at least one transaction!
                    </div>
                  ) : (
                    stores.filter(s => !s.isOnboarded || s.lastSaleDate === undefined).slice(0, 10).map(store => (
                      <div key={store.id} className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-foreground block font-sans">{store.storeName || store.name}</span>
                          <span className="text-[10px] text-amber-500 font-medium block">Incomplete Setup | Joined: {store.createdAt ? new Date(store.createdAt).toLocaleDateString() : "N/A"}</span>
                        </div>
                        <Button
                          size="sm"
                          className="text-[10px] h-7 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                          onClick={() => {
                            setActiveTab("emails");
                            setEmailRecipientStoreId(store.id);
                            handleTemplateChange("tpl_onboarding_guide");
                          }}
                        >
                          Send Onboarding Guide
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Quota & Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
            <Card className="shadow-none border border-muted-foreground/10 p-5 bg-muted/25 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Gmail Daily Limit</span>
                <p className="text-2xl font-bold font-sans">500 emails</p>
                <div className="w-full bg-muted-foreground/20 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-teal-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, (deliveries.filter(d => d.status === "delivered" && d.sentAt && d.sentAt.startsWith(new Date().toISOString().split("T")[0])).length / 500) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                  <span>Used Today: {deliveries.filter(d => d.status === "delivered" && d.sentAt && d.sentAt.startsWith(new Date().toISOString().split("T")[0])).length}</span>
                  <span className="text-amber-500 font-semibold">Guard Line: 450</span>
                </div>
              </div>
            </Card>

            <Card className="shadow-none border border-muted-foreground/10 p-5 bg-muted/25 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Deliveries</span>
                <p className="text-2xl font-bold font-sans text-teal-600 dark:text-teal-400">
                  {deliveries.filter(d => d.status === "delivered").length}
                </p>
                <span className="text-[10px] text-muted-foreground">Successful all-time report dispatches</span>
              </div>
            </Card>

            <Card className="shadow-none border border-muted-foreground/10 p-5 bg-muted/25 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Failed Transmissions</span>
                <p className="text-2xl font-bold font-sans text-red-500">
                  {deliveries.filter(d => d.status === "failed").length}
                </p>
                <span className="text-[10px] text-muted-foreground">Blocked, bounced or error entries</span>
              </div>
            </Card>

            <Card className="shadow-none border border-muted-foreground/10 p-5 bg-muted/25 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Active Subscriptions</span>
                <p className="text-2xl font-bold font-sans">
                  {stores.filter(s => (s as Record<string, unknown>)?.reportPreferences && typeof (s as Record<string, Record<string, unknown>>)?.reportPreferences === "object" && ((s as Record<string, Record<string, unknown>>)?.reportPreferences as Record<string, unknown>)?.frequency && ((s as Record<string, Record<string, unknown>>)?.reportPreferences as Record<string, unknown>)?.frequency !== "off").length} stores
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {stores.filter(s => (s as Record<string, Record<string, unknown>>)?.reportPreferences && ((s as Record<string, Record<string, unknown>>)?.reportPreferences as Record<string, unknown>)?.frequency === "daily").length} Daily | {stores.filter(s => (s as Record<string, Record<string, unknown>>)?.reportPreferences && ((s as Record<string, Record<string, unknown>>)?.reportPreferences as Record<string, unknown>)?.frequency === "weekly").length} Weekly
                </span>
              </div>
            </Card>
          </div>

          {/* Action Desk */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Scheduled evaluation simulation trigger */}
            <Card className="shadow-none border border-muted-foreground/10">
              <CardHeader>
                <CardTitle className="text-xs font-bold font-sans uppercase">Automatic Generator Simulator</CardTitle>
                <CardDescription className="text-[10px]">
                  Bypasses cron-job triggers to check which stores are due for reports right now, compile their data, generate PDFs, and initiate deliveries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This simulated cycle evaluates report intervals (Daily, Weekly, Monthly) based on each store's <code className="font-mono bg-muted p-0.5 rounded text-[10px]">lastSentAt</code> stamp. Daily reports are automatically restricted to Nexa Professional or Enterprise plans.
                </p>
                <Button
                  onClick={handleSimulateScheduledReports}
                  disabled={simulatingReports}
                  className="w-full text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold h-9 gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${simulatingReports ? "animate-spin" : ""}`} />
                  {simulatingReports ? "Processing Report Cycles..." : "Simulate Automated Report Cycle"}
                </Button>
              </CardContent>
            </Card>

            {/* Manual Test Generator form */}
            <Card className="shadow-none border border-muted-foreground/10">
              <CardHeader>
                <CardTitle className="text-xs font-bold font-sans uppercase">On-Demand Test Generator</CardTitle>
                <CardDescription className="text-[10px]">
                  Instantly compile sales statistics, build branded PDF reports, and deliver them to a custom test email address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground block">Target Store</label>
                    <select
                      value={testStoreId}
                      onChange={(e) => setTestStoreId(e.target.value)}
                      className="w-full text-xs border rounded p-1.5 h-8 bg-background"
                    >
                      <option value="">Select a Merchant...</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.storeName || s.name || s.id}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-muted-foreground block">Email Override</label>
                    <input
                      type="email"
                      placeholder="e.g. admin@test.com"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="w-full text-xs border rounded p-1.5 h-8 bg-background"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleTestReportGenerate}
                  disabled={testingReport}
                  className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold h-9 gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {testingReport ? "Generating PDF & Dispatching..." : "Generate and Send Test Report"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Delivery feed logs */}
          <Card className="shadow-none border border-muted-foreground/10">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-xs font-bold font-sans uppercase">Report Delivery Feed</CardTitle>
                <CardDescription className="text-[10px]">Real-time record of all business performance reports compiled and dispatched by NEXAOS.</CardDescription>
              </div>
              
              {/* Filter tools */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search merchant/email..."
                    value={reportSearchFilter}
                    onChange={(e) => setReportSearchFilter(e.target.value)}
                    className="text-xs border rounded px-2.5 py-1.5 w-44 bg-background"
                  />
                </div>
                <input
                  type="date"
                  value={reportDateFilter}
                  onChange={(e) => setReportDateFilter(e.target.value)}
                  className="text-xs border rounded px-2 py-1 bg-background"
                />
                {(reportSearchFilter || reportDateFilter) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReportSearchFilter("");
                      setReportDateFilter("");
                    }}
                    className="text-[10px] h-7 px-2"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left divide-y">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[9px] font-bold">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Merchant Store</th>
                      <th className="p-4">Recipient Email</th>
                      <th className="p-4">Frequency</th>
                      <th className="p-4">Summary Brief</th>
                      <th className="p-4">Quota Index</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-background font-sans">
                    {deliveries.filter(d => {
                      const matchesSearch = reportSearchFilter === "" || 
                        (d.storeId && d.storeId.toLowerCase().includes(reportSearchFilter.toLowerCase())) ||
                        (d.recipientEmail && d.recipientEmail.toLowerCase().includes(reportSearchFilter.toLowerCase()));
                      const matchesDate = reportDateFilter === "" || 
                        (d.sentAt && d.sentAt.startsWith(reportDateFilter));
                      return matchesSearch && matchesDate;
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No reports matched the specified criteria.
                        </td>
                      </tr>
                    ) : (
                      deliveries.filter(d => {
                        const matchesSearch = reportSearchFilter === "" || 
                          (d.storeId && d.storeId.toLowerCase().includes(reportSearchFilter.toLowerCase())) ||
                          (d.recipientEmail && d.recipientEmail.toLowerCase().includes(reportSearchFilter.toLowerCase()));
                        const matchesDate = reportDateFilter === "" || 
                          (d.sentAt && d.sentAt.startsWith(reportDateFilter));
                        return matchesSearch && matchesDate;
                      }).map(del => {
                        const store = stores.find(s => s.id === del.storeId);
                        const storeName = store ? (store.storeName || store.name) : del.storeId;
                        
                        return (
                          <tr key={del.id || del.sentAt} className="hover:bg-muted/5">
                            <td className="p-4 whitespace-nowrap text-muted-foreground font-mono text-[10px]">
                              {del.sentAt ? new Date(del.sentAt).toLocaleString() : "N/A"}
                            </td>
                            <td className="p-4 font-bold text-foreground">
                              {storeName}
                            </td>
                            <td className="p-4 text-muted-foreground font-mono text-[10px]">
                              {del.recipientEmail}
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="text-[9px] uppercase font-bold bg-teal-500/5 text-teal-600 border-teal-500/20">
                                {del.frequency}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {del.summary ? (
                                <span className="text-[10px] text-muted-foreground">
                                  Rev: ${(del.summary.revenueNgn || 0).toLocaleString()} | Sales: {del.summary.transactionCount || 0} | Low-Stock: {del.summary.lowStockCount || 0}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic text-[10px]">Failed compilation</span>
                              )}
                            </td>
                            <td className="p-4 font-mono text-[10px] text-muted-foreground">
                              {del.gmailQuotaUsedThisDay || 0} / 500
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] uppercase font-bold ${
                                    del.status === "delivered" 
                                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                      : del.status === "pending"
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                      : "bg-red-500/10 text-red-500 border-red-500/20"
                                  }`}
                                >
                                  {del.status}
                                </Badge>
                                {del.simulated && (
                                  <span className="text-[8px] text-indigo-500 font-bold uppercase">Sandbox Simulation</span>
                                )}
                                {del.error && (
                                  <span className="text-[8px] text-red-400 block max-w-xs truncate" title={del.error}>
                                    {del.error}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
