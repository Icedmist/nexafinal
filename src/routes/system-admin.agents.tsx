import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Bot,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Send,
  Terminal,
  Loader2,
  MessageSquare,
  ShieldAlert,
  Activity,
  Edit2,
  Eye,
  Trash2,
  Users,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { ResourceManagementConsole } from "@/components/super-admin/ResourceManagementConsole";

interface AutonomousAgent {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  status: "running" | "idle" | "paused";
  lastExecuted: string;
  frequency: string;
  target: string;
  runCount: number;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: string;
}

interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  store: string;
  status: "success" | "warning" | "info" | "error";
}

export default function SystemAdminAgents() {
  const [agents, setAgents] = useState<AutonomousAgent[]>([
    {
      id: "agent-1",
      name: "Autonomous Reorder Suggester",
      description: "Scans inventory velocity across all branches. Automatically generates pending PO sheets for sub-optimal items.",
      icon: Activity,
      status: "running",
      lastExecuted: "2026-05-24 14:30:22",
      frequency: "Every 12 Hours",
      target: "All 4 Active Branches",
      runCount: 42
    },
    {
      id: "agent-2",
      name: "WhatsApp Sales Assistant Bot",
      description: "Auto-replies to customer product queries and processes manual WhatsApp order requests in real-time.",
      icon: MessageSquare,
      status: "idle",
      lastExecuted: "2026-05-24 15:18:11",
      frequency: "Real-time trigger",
      target: "Lekki Outlet, Abuja Hub",
      runCount: 184
    },
    {
      id: "agent-3",
      name: "SaaS Auditing & Security Auditor",
      description: "Passes log files through Gemini 3.5 Flash hourly to detect fraudulent adjustments, spikes, or anomalous hours.",
      icon: ShieldAlert,
      status: "running",
      lastExecuted: "2026-05-24 15:00:00",
      frequency: "Hourly Cron",
      target: "Consolidated Logs Node",
      runCount: 79
    },
    {
      id: "agent-4",
      name: "Market Sector Context Advisor",
      description: "Generates localized market suggestions, currency hedge advisories, and pricing guides for Nigeria retail.",
      icon: RefreshCw,
      status: "paused",
      lastExecuted: "2026-05-23 09:12:05",
      frequency: "Weekly",
      target: "Global System Scope",
      runCount: 8
    }
  ]);

  const [temperature, setTemperature] = useState<number>(0.7);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "You are Nexa Root System AI Coordinator. Monitor and balance stock movements, audits, and WhatsApp marketing configurations. Ensure Peak performance across all tenant stores."
  );

  const [activeTab, setActiveTab] = useState<"services" | "resources">("services");

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: "model",
      content: `### Welcome to the Nexa Root System AI Agent Deck\n\nI am the **Nexa System Coordinator**, grounded directly into your multi-tenant SaaS live state.\n\n**What would you like me to analyze?**\n* Try asking: *"Security Audit recent logs"* or *"Recommend stock rebalancing between Lekki and Ikeja"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingAgent, setViewingAgent] = useState<AutonomousAgent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AutonomousAgent | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<AutonomousAgent | null>(null);

  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentFrequency, setAgentFrequency] = useState("");
  const [agentTarget, setAgentTarget] = useState("");

  const openEditAgent = (agent: AutonomousAgent) => {
    setEditingAgent(agent);
    setAgentName(agent.name);
    setAgentDescription(agent.description);
    setAgentFrequency(agent.frequency);
    setAgentTarget(agent.target);
    setIsEditOpen(true);
  };

  const handleUpdateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setAgents(prev =>
      prev.map(a =>
        a.id === editingAgent.id
          ? { ...a, name: agentName, description: agentDescription, frequency: agentFrequency, target: agentTarget }
          : a
      )
    );

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Modified AI Agent configuration for "${agentName}"`,
      store: "AI Core",
      status: "success",
    };
    setDoc(doc(db, "system_logs", newLog.id), newLog).catch(err => console.error("Failed to log agent update:", err));

    toast.success(`Agent "${agentName}" updated successfully.`);
    setIsEditOpen(false);
    setEditingAgent(null);
  };

  const handleDeleteAgent = (agent: AutonomousAgent) => {
    setAgents(prev => prev.filter(a => a.id !== agent.id));

    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Terminated background agent thread: "${agent.name}"`,
      store: "AI Core",
      status: "warning",
    };
    setDoc(doc(db, "system_logs", newLog.id), newLog).catch(err => console.error("Failed to log agent delete:", err));

    toast.success(`Agent "${agent.name}" deleted successfully.`);
    setIsDeleteOpen(false);
    setDeletingAgent(null);
  };

  const handleToggleAgent = (agentId: string) => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id === agentId) {
          const nextStatusMap: Record<AutonomousAgent["status"], AutonomousAgent["status"]> = {
            running: "paused",
            paused: "running",
            idle: "paused"
          };
          const nextStatus = nextStatusMap[a.status];
          toast.success(`"${a.name}" status updated to ${nextStatus.toUpperCase()}`);

          const logId = `log-${Date.now()}`;
          setDoc(doc(db, "system_logs", logId), {
            id: logId,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Toggled AI Agent "${a.name}" status to [${nextStatus.toUpperCase()}]`,
            store: "AI System Deck",
            status: nextStatus === "running" ? "success" : "info"
          }).catch(err => console.error("Failed to log agent status toggle:", err));

          return { ...a, status: nextStatus };
        }
        return a;
      })
    );
  };

  const handleTriggerAgent = (agent: AutonomousAgent) => {
    setTriggeringId(agent.id);
    toast.loading(`Spinning up containers to run "${agent.name}"...`);

    setTimeout(async () => {
      setAgents(prev =>
        prev.map(a => {
          if (a.id === agent.id) {
            return {
              ...a,
              lastExecuted: new Date().toISOString().slice(0, 19).replace("T", " "),
              runCount: a.runCount + 1,
              status: a.status === "paused" ? "idle" : a.status
            };
          }
          return a;
        })
      );

      const logId = `log-${Date.now()}`;
      try {
        await setDoc(doc(db, "system_logs", logId), {
          id: logId,
          timestamp: new Date().toISOString(),
          user: "nexatechnologies.dev@gmail.com",
          action: `Autonomous AI Agent run triggered manually: "${agent.name}". Executed container verification, generated analytical recommendations.`,
          store: "AI System Deck",
          status: "success"
        });
      } catch (err) {
        console.error("Failed to log manual agent trigger:", err);
      }

      setTriggeringId(null);
      toast.dismiss();
      toast.success(`"${agent.name}" run completed. Action logged to events feed!`);
    }, 1500);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSending) return;

    const userMsg = userInput.trim();
    setUserInput("");
    setIsSending(true);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { role: "user", content: userMsg, timestamp: nowStr }]);

    // Mock echo response (no backend endpoint available)
    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        {
          role: "model",
          content: `**System Agent Response:**\n\nI received your query: *"${userMsg}"*\n\nThe AI backend endpoint is not configured in this environment. To enable full AI capabilities, connect the \`/api/super-admin/agent-chat\` proxy endpoint.\n\nCurrent system status: All agents operational. Try the suggested queries below for local operations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsSending(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-muted-foreground/15 pb-2">
        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "services"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Bot className="h-4 w-4" /> Autonomous Workers &amp; AI Auditor
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "resources"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <BookOpen className="h-4 w-4" /> 🎓 Field Marketing &amp; Resource Console
        </button>
      </div>

      {activeTab === "resources" ? (
        <ResourceManagementConsole />
      ) : (
        <>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-sans flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> Autonomous Background Services
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure schedules and manual triggers for automated AI micro-agents.</p>
            </div>
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-mono text-[10px] font-bold uppercase">
              {agents.filter(a => a.status === "running").length} Running
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map(agent => {
              const Icon = agent.icon;
              const isTriggering = triggeringId === agent.id;
              return (
                <Card key={agent.id} className="shadow-none border border-muted-foreground/10 flex flex-col justify-between hover:border-primary/25 transition-all">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold font-sans">{agent.name}</CardTitle>
                          <span className="text-[10px] text-muted-foreground block font-mono">Target: {agent.target}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <button onClick={() => handleToggleAgent(agent.id)} className="focus:outline-none">
                          {agent.status === "running" && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-[9px] font-bold uppercase">Active</Badge>
                          )}
                          {agent.status === "idle" && (
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 text-[9px] font-bold uppercase">Idle</Badge>
                          )}
                          {agent.status === "paused" && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 text-[9px] font-bold uppercase">Paused</Badge>
                          )}
                        </button>
                        <div className="flex gap-1">
                          <Button onClick={() => { setViewingAgent(agent); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-emerald-500" title="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => openEditAgent(agent)} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Edit agent settings">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => { setDeletingAgent(agent); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" title="Delete agent thread">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1 pb-3 text-xs text-muted-foreground leading-relaxed">
                    <p className="min-h-[40px]">{agent.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-muted-foreground/5 font-mono text-[10px]">
                      <div>
                        <span className="text-muted-foreground font-medium block">Schedule:</span>
                        <span className="text-foreground font-semibold">{agent.frequency}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground font-medium block">Last Run:</span>
                        <span className="text-foreground font-semibold truncate block" title={agent.lastExecuted}>
                          {agent.lastExecuted.slice(5)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 bg-muted/20 border-t border-muted-foreground/5 flex justify-between items-center">
                    <span className="text-[9px] font-mono text-muted-foreground">Total Runs: <strong className="text-foreground">{agent.runCount}</strong></span>
                    <div className="flex gap-1.5">
                      <Button onClick={() => handleToggleAgent(agent.id)} variant="ghost" size="sm" className="h-7 px-2 text-[10px]"
                        title={agent.status === "running" ? "Pause agent" : "Start agent"}>
                        {agent.status === "running" ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                        {agent.status === "running" ? "Pause" : "Resume"}
                      </Button>
                      <Button onClick={() => handleTriggerAgent(agent)} disabled={isTriggering} size="sm"
                        className="h-7 px-2 text-[10px] bg-primary text-white font-semibold hover:bg-primary/90">
                        {isTriggering ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Run Now
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="shadow-none border border-muted-foreground/10 flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-sm font-bold font-sans flex items-center gap-2">
                <Sliders className="h-4.5 w-4.5 text-primary" /> Prompt Parameters
              </CardTitle>
              <CardDescription>Calibrate model weights, Core System prompts and hyper-parameters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="model-select" className="text-[11px] font-semibold">Active LLM Model</Label>
                <select id="model-select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none">
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fast, optimal)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Heavy analytical reasoning)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <Label htmlFor="temp-slider">Temperature Calibration</Label>
                  <span className="font-mono text-primary font-bold">{temperature}</span>
                </div>
                <input id="temp-slider" type="range" min="0.1" max="1.0" step="0.1" value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" />
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                  <span>Deterministic (0.1)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="system-instruction" className="text-[11px] font-semibold">Base Agent Persona</Label>
                <Textarea id="system-instruction" rows={4} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                  className="text-xs leading-relaxed font-sans" placeholder="Insert custom core system context..." />
              </div>
            </CardContent>
          </div>
          <CardFooter className="pt-3 border-t border-muted-foreground/10 flex justify-between bg-muted/25 p-4">
            <span className="text-[10px] text-muted-foreground font-mono">Endpoint: /api/agent-chat</span>
            <Button onClick={() => toast.success("AI Prompt weights saved successfully!")} className="text-[10px] h-7 font-bold bg-secondary hover:bg-secondary/85 text-foreground">
              Save Weights
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="shadow-none border border-muted-foreground/10 flex flex-col h-[520px]">
        <CardHeader className="p-4 border-b border-muted-foreground/10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded">
              <Terminal className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-sans">Enterprise Live State AI Auditor</CardTitle>
              <p className="text-[10px] text-muted-foreground font-medium">Direct live natural-language pipeline feeding from consolidation logs and DB slices.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-500 font-bold uppercase">Root Secure Grounding Active</span>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 font-sans text-xs">
          {chatHistory.map((chat, idx) => {
            const isModel = chat.role === "model";
            return (
              <div key={idx} className={`flex ${isModel ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-lg p-3.5 space-y-1 shadow-sm leading-relaxed ${
                  isModel ? "bg-background border border-muted-foreground/10 text-foreground" : "bg-emerald-600 text-white font-medium"
                }`}>
                  <div className="flex items-center justify-between gap-4 border-b border-muted-foreground/5 pb-1 mb-1.5 text-[9px] font-mono opacity-60">
                    <span className="flex items-center gap-1">
                      {isModel ? <Bot className="h-3 w-3 text-emerald-500" /> : <Users className="h-3 w-3" />}
                      {isModel ? "NEXA ROOT AI COORDINATOR" : "SUPER ADMIN (ROOT)"}
                    </span>
                    <span>{chat.timestamp}</span>
                  </div>
                  <div className="space-y-1.5 break-words whitespace-pre-wrap">
                    {chat.content.split("\n").map((line, lIdx) => {
                      if (line.startsWith("### ")) {
                        return <h4 key={lIdx} className="text-sm font-bold font-sans text-foreground mt-2 pb-1 border-b border-muted-foreground/5">{line.replace("### ", "")}</h4>;
                      }
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={lIdx} className="font-bold text-foreground mt-1">{line.replace(/\*\*/g, "")}</p>;
                      }
                      if (line.startsWith("* ")) {
                        return (
                          <div key={lIdx} className="flex items-start gap-1.5 pl-2 mt-0.5">
                            <span className="text-emerald-500 mt-1">•</span>
                            <span>{line.replace("* ", "")}</span>
                          </div>
                        );
                      }
                      return <p key={lIdx}>{line}</p>;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-background border border-muted-foreground/10 text-foreground rounded-lg p-3 flex items-center gap-2 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">AI Coordinator is compiling logs & generating response...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-4 py-2 bg-muted/20 border-t border-muted-foreground/10 flex flex-wrap gap-1.5">
          <span className="text-[9px] text-muted-foreground font-mono font-medium py-1">Suggested telemetry requests:</span>
          <button onClick={() => setUserInput("Security Audit recent logs and flag anomalies")}
            className="text-[10px] bg-background hover:bg-secondary border border-muted-foreground/10 rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground font-medium transition-colors">
            Audit Recent Logs
          </button>
          <button onClick={() => setUserInput("Analyze balance valuation and suggest stock rebalancing suggestions")}
            className="text-[10px] bg-background hover:bg-secondary border border-muted-foreground/10 rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground font-medium transition-colors">
            Rebalance Branch Valuation
          </button>
          <button onClick={() => setUserInput("Suggest improvements to the WhatsApp Template or webhook health")}
            className="text-[10px] bg-background hover:bg-secondary border border-muted-foreground/10 rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground font-medium transition-colors">
            Optimise WhatsApp Hub
          </button>
        </div>

        <form onSubmit={handleSendChat} className="p-3 border-t border-muted-foreground/10 flex gap-2 bg-background rounded-b-lg">
          <Input value={userInput} onChange={e => setUserInput(e.target.value)}
            placeholder="Type operations query (e.g. 'Security Audit recent logs' or 'Perform inventory rebalance')"
            className="text-xs h-9" disabled={isSending} required />
          <Button type="submit" disabled={isSending || !userInput.trim()} className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm text-xs">
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        </form>
      </Card>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-500" /> Autonomous Agent Telemetry
            </DialogTitle>
            <DialogDescription>Detailed performance metrics and background parameters.</DialogDescription>
          </DialogHeader>
          {viewingAgent && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block font-medium">Agent Name</span>
                  <span className="font-semibold text-foreground">{viewingAgent.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Status State</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingAgent.status === "running" ? "bg-emerald-500/10 text-emerald-500" :
                    viewingAgent.status === "paused" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                  }`}>{viewingAgent.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Target Scope</span>
                  <span className="font-semibold">{viewingAgent.target}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Schedule / Interval</span>
                  <span className="font-semibold">{viewingAgent.frequency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Total Runs executed</span>
                  <span className="font-semibold font-mono">{viewingAgent.runCount} times</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Last Run Time</span>
                  <span className="font-semibold font-mono">{viewingAgent.lastExecuted}</span>
                </div>
              </div>
              <div className="space-y-2 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <h4 className="font-semibold text-foreground border-b border-muted-foreground/10 pb-1">Operational Description</h4>
                <p className="text-muted-foreground leading-relaxed">{viewingAgent.description}</p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">Close Telemetry</Button>
                <Button type="button" onClick={() => { setIsViewOpen(false); openEditAgent(viewingAgent); }}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Configure Parameters</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Configure Autonomous Agent</DialogTitle>
            <DialogDescription>Modify background schedule, target data slice, and system details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAgent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agent-edit-name" className="text-xs font-semibold">Agent Name</Label>
              <Input id="agent-edit-name" value={agentName} onChange={e => setAgentName(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-edit-desc" className="text-xs font-semibold">Operational Description</Label>
              <Textarea id="agent-edit-desc" value={agentDescription} onChange={e => setAgentDescription(e.target.value)} className="text-xs min-h-[80px]" required />
            </div>
            <div className="space-y-1.5 font-sans">
              <Label htmlFor="agent-edit-freq" className="text-xs font-semibold">Schedule / Interval</Label>
              <Input id="agent-edit-freq" value={agentFrequency} onChange={e => setAgentFrequency(e.target.value)} placeholder="e.g. Every 12 Hours, Hourly Cron" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agent-edit-target" className="text-xs font-semibold">Target Scope Nodes</Label>
              <Input id="agent-edit-target" value={agentTarget} onChange={e => setAgentTarget(e.target.value)} placeholder="e.g. All 4 Active Branches" className="text-xs h-9" required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs h-9">Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-primary hover:bg-primary/95 text-white font-semibold">Save Settings</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Terminate AI Background Worker
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive. Deleting a background agent halts its cron triggers and clears its state context.
            </DialogDescription>
          </DialogHeader>
          {deletingAgent && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to delete <span className="font-bold underline">"{deletingAgent.name}"</span>?
                All automated workflows assigned to this worker will stop.
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-9">Cancel</Button>
                <Button type="button" onClick={() => handleDeleteAgent(deletingAgent)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold">Terminate Worker Thread</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
