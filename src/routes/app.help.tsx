import { useState, useMemo } from "react";
import {
  Search,
  HelpCircle,
  BookOpen,
  Video,
  FileText,
  Lock,
  Share2,
  Sparkles,
  ShieldCheck,
  Send,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_DATA } from "@/lib/faq-data";
import { INITIAL_COURSE_MODULES, CourseModule } from "@/lib/course-data";
import { ProtectedTourGuideViewer } from "@/components/shared/ProtectedTourGuideViewer";
import { DemoPassGeneratorModal } from "@/components/shared/DemoPassGeneratorModal";
import { UserManualSection } from "@/components/shared/UserManualSection";
import { AppInteractiveTourModal } from "@/components/shared/AppInteractiveTourModal";
import { DemoModeHelpSection } from "@/components/shared/DemoModeHelpSection";
import { useRole } from "@/hooks/useRole";

export default HelpPage;

function HelpPage() {
  const { isSystemAdmin } = useRole();
  const [activeTab, setActiveTab] = useState<"faq" | "course" | "tour_guides" | "demo_sandbox">("faq");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseModule>(INITIAL_COURSE_MODULES[0]);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showInteractiveTour, setShowInteractiveTour] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_DATA;
    return FAQ_DATA
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [search]);

  const totalResults = filteredFaqs.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-muted-foreground/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
            <HelpCircle className="h-7 w-7 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-sans text-foreground">Help & Agent Marketing Portal</h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold uppercase">
                Field Marketing Toolkit
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Knowledge base, official PDF user manual, interactive guided tour, video training courses, and device demo passes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-bold h-9 border-primary/30 text-primary hover:bg-primary/10 gap-1.5 shadow-sm"
            onClick={() => setShowInteractiveTour(true)}
          >
            <Sparkles className="h-4 w-4 text-amber-500" /> Start Interactive Tour
          </Button>

          <Button
            variant="default"
            size="sm"
            className="text-xs font-bold h-9 bg-primary hover:bg-primary/95 text-primary-foreground gap-2 shadow-md"
            onClick={() => setShowDemoModal(true)}
          >
            <Lock className="h-4 w-4 text-amber-400" /> Generate 12h Demo Link
          </Button>
        </div>
      </div>

      {/* Official System PDF User Manual Section (Uploadable by Super Admin) */}
      <UserManualSection />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-muted-foreground/15 pb-3">
        <Button
          variant={activeTab === "faq" ? "default" : "outline"}
          size="sm"
          className="text-xs h-8 font-bold gap-1.5"
          onClick={() => setActiveTab("faq")}
        >
          <HelpCircle className="h-3.5 w-3.5" /> Merchant FAQ & Knowledge Base
        </Button>

        <Button
          variant={activeTab === "course" ? "default" : "outline"}
          size="sm"
          className="text-xs h-8 font-bold gap-1.5"
          onClick={() => setActiveTab("course")}
        >
          <Video className="h-3.5 w-3.5 text-rose-500" /> Training Video Courses ({INITIAL_COURSE_MODULES.length})
        </Button>

        <Button
          variant={activeTab === "tour_guides" ? "default" : "outline"}
          size="sm"
          className="text-xs h-8 font-bold gap-1.5"
          onClick={() => setActiveTab("tour_guides")}
        >
          <FileText className="h-3.5 w-3.5 text-blue-500" /> Protected Tour Guides
        </Button>

        <Button
          variant={activeTab === "demo_sandbox" ? "default" : "outline"}
          size="sm"
          className="text-xs h-8 font-bold gap-1.5"
          onClick={() => setActiveTab("demo_sandbox")}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Field Demo Sandbox & Pass
        </Button>
      </div>

      {/* TAB 1: FAQ & KNOWLEDGE BASE */}
      {activeTab === "faq" && (
        <div className="space-y-6">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search merchant questions or keywords..."
              className="h-10 pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="py-16 text-center bg-card rounded-xl border border-muted-foreground/10">
              <p className="text-xs text-muted-foreground">No matching questions found for "{search}"</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFaqs.map((category) => (
                <div key={category.title}>
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                    {category.title}
                  </h2>
                  <Accordion type="multiple" className="rounded-xl border border-border bg-card overflow-hidden">
                    {category.items.map((item, i) => (
                      <AccordionItem key={i} value={`${category.title}-${i}`} className="border-border px-1">
                        <AccordionTrigger className="px-4 py-3 text-xs font-semibold text-foreground hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
              {search && (
                <p className="text-xs text-muted-foreground text-center">
                  {totalResults} result{totalResults !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AGENT COURSE & VIDEO TRAINING HUB */}
      {activeTab === "course" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Module List Sidebar */}
          <div className="space-y-3 md:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Course Training Curriculum
            </span>
            <div className="space-y-2">
              {INITIAL_COURSE_MODULES.map((mod) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedCourse(mod)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    selectedCourse.id === mod.id
                      ? "bg-primary/10 border-primary text-foreground shadow-sm"
                      : "bg-card border-muted-foreground/15 hover:bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">
                      {mod.category}
                    </Badge>
                    <span className="text-[10px] font-mono">{mod.duration}</span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-2">{mod.title}</h3>
                </div>
              ))}
            </div>
          </div>

          {/* Active Module Details & Video Player */}
          <div className="space-y-4 md:col-span-2">
            <div className="p-6 bg-card border border-muted-foreground/15 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold uppercase mb-1">
                    <Video className="h-3 w-3 mr-1" /> Video Training Module
                  </Badge>
                  <h2 className="text-lg font-bold text-foreground font-sans">{selectedCourse.title}</h2>
                </div>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  Duration: {selectedCourse.duration}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {selectedCourse.description}
              </p>

              {/* Video Player Launcher Box */}
              <div className="aspect-video bg-black/90 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-3 border border-muted-foreground/20">
                <Video className="h-12 w-12 text-rose-500 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Module Video Tutorial</p>
                  <p className="text-xs text-zinc-400 font-mono max-w-sm truncate">{selectedCourse.videoUrl}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-xs"
                  onClick={() => setActiveVideoUrl(selectedCourse.videoUrl || null)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Watch Video Tutorial Now
                </Button>
              </div>

              {/* Pitch Script Section */}
              {selectedCourse.pitchScript && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-1">
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Field Agent Pitch Script
                  </span>
                  <p className="italic text-xs text-foreground leading-relaxed">
                    "{selectedCourse.pitchScript}"
                  </p>
                </div>
              )}
            </div>

            {/* Attached Tour Guide Viewer */}
            <ProtectedTourGuideViewer
              module={selectedCourse}
              agentName="Field Agent"
              onOpenVideo={(url) => setActiveVideoUrl(url)}
            />
          </div>
        </div>
      )}

      {/* TAB 3: PROTECTED TOUR GUIDES HUB */}
      {activeTab === "tour_guides" && (
        <div className="space-y-6">
          <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Protected Tour Guide Directory
              </h3>
              <p className="text-xs text-muted-foreground">
                Documents are served in-app without direct file download options to prevent raw asset leakage.
              </p>
            </div>
            <Button
              size="sm"
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              onClick={() => setShowDemoModal(true)}
            >
              <Lock className="h-3.5 w-3.5 text-amber-400" /> Generate Demo Link
            </Button>
          </div>

          <div className="grid gap-6">
            {INITIAL_COURSE_MODULES.map((mod) => (
              <ProtectedTourGuideViewer
                key={mod.id}
                module={mod}
                agentName="Official NexaStoreOS Agent"
                onOpenVideo={(url) => setActiveVideoUrl(url)}
              />
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FIELD DEMO SANDBOX & PASS GENERATOR */}
      {activeTab === "demo_sandbox" && <DemoModeHelpSection />}

      {/* Video Modal Player */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-muted-foreground/20 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" />
                <h3 className="font-bold text-base text-foreground">NexaStoreOS Video Course Lesson</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setActiveVideoUrl(null)}
              >
                ✕
              </Button>
            </div>

            <div className="aspect-video bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-3 border border-muted-foreground/20">
              <Video className="h-16 w-16 text-rose-500 animate-pulse" />
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Course Video Walkthrough</p>
                <p className="text-xs text-zinc-400 font-mono max-w-md truncate">{activeVideoUrl}</p>
              </div>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-xs"
                onClick={() => window.open(activeVideoUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Launch Video in New Window
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 12-Hour Device Demo Generator Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <DemoPassGeneratorModal
            defaultAgentName={isSystemAdmin ? "Super Admin" : "NexaStoreOS Agent"}
            onClose={() => setShowDemoModal(false)}
          />
        </div>
      )}

      {/* Interactive App Tour Modal */}
      <AppInteractiveTourModal
        open={showInteractiveTour}
        onOpenChange={setShowInteractiveTour}
      />
    </div>
  );
}
