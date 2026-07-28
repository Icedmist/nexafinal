import { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Share2, 
  Search, 
  ExternalLink, 
  Check, 
  Eye, 
  FileCheck, 
  Sparkles,
  FileSpreadsheet,
  FileCode,
  SlidersHorizontal,
  Video,
  Globe,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CourseModule,
  getCourseModules,
  initFirestoreResourceSync,
  trackResourceEvent,
} from "@/lib/course-data";
import { ProtectedTourGuideViewer } from "@/components/shared/ProtectedTourGuideViewer";

export function AgentResourcesView() {
  const [modules, setModules] = useState<CourseModule[]>(() => {
    return getCourseModules().filter((m) => m.published ?? true);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [previewResource, setPreviewResource] = useState<CourseModule | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubFirestore = initFirestoreResourceSync();

    const handleUpdate = () => {
      const active = getCourseModules().filter((m) => m.published ?? true);
      setModules(active);
    };

    window.addEventListener("stackwise_course_modules_updated", handleUpdate);
    return () => {
      unsubFirestore();
      window.removeEventListener("stackwise_course_modules_updated", handleUpdate);
    };
  }, []);

  const categories = ["All", "pitch", "Flyers", "onboarding", "objections", "Legal", "Hardware", "tour"];

  const filteredResources = modules.filter((res) => {
    const matchesCategory = selectedCategory === "All" || res.category === selectedCategory;
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (res: CourseModule) => {
    trackResourceEvent(res.id, "download");
    const contentText = res.tourGuideContent || res.pitchScript || res.description;
    const textContent = `--- ${res.title} ---\nCategory: ${res.category}\nUpdated: ${res.updatedAt}\n\n${contentText}`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const ext = (res.fileType || "PDF").toLowerCase();
    link.setAttribute("download", `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${res.title}...`);
  };

  const handleCopyShareLink = (res: CourseModule) => {
    trackResourceEvent(res.id, "share_tour");
    const shareUrl = `${window.location.origin}/agents?resource=${res.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(res.id);
    toast.success("Resource sharing link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#141528] via-[#1A1C36] to-[#0F1020] border border-white/10 rounded-2xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#2B5BFF]/20 text-[#2B5BFF] border-none text-[10px] uppercase font-bold">
              Official Collateral Repository
            </Badge>
            <Badge className="bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[10px] uppercase font-bold">
              Live Field Ready
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-sans text-white">
            Field Agent File &amp; Resource Management
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Access, preview, and download official NexaStoreOS pitch decks, merchant contracts, high-resolution flyers, hardware specifications, and video walkthroughs published by HQ.
          </p>
        </div>

        {modules.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => handleDownload(modules[0])}
              className="bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white font-bold text-xs h-9 gap-2 rounded-xl"
            >
              <Download className="h-4 w-4" /> Download Agent Starter Pack
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141528] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search flyers, contracts, pitch decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#00C4CF] text-[#0B0C1E] shadow-sm font-bold"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat === "pitch" ? "Pitch Scripts" : cat === "tour" ? "HQ Tours" : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => {
          const fType = res.fileType || "PDF";
          const fSize = res.fileSize || res.duration || "1.5 MB";

          return (
            <Card key={res.id} className="bg-[#141528] border border-white/10 hover:border-[#00C4CF]/40 transition-all rounded-2xl p-5 text-white flex flex-col justify-between group space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-white/5 group-hover:bg-[#00C4CF]/10 text-[#00C4CF] rounded-xl transition-colors">
                    {fType === "PDF" && <FileText className="h-6 w-6" />}
                    {fType === "PPTX" && <Sparkles className="h-6 w-6 text-amber-400" />}
                    {fType === "ZIP" && <FileSpreadsheet className="h-6 w-6 text-emerald-400" />}
                    {(fType === "DOCX" || fType === "PNG") && <FileCode className="h-6 w-6 text-blue-400" />}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="border-white/10 text-slate-300 text-[10px] uppercase font-mono">
                      {res.category}
                    </Badge>
                    <Badge className="bg-white/5 text-slate-400 border-none text-[10px]">
                      {fType} • {fSize}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-[#00C4CF] transition-colors line-clamp-1">
                    {res.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-1">
                    {res.description}
                  </p>
                </div>

                {res.videoUrl && (
                  <a
                    href={res.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackResourceEvent(res.id, "play_video")}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
                  >
                    <Video className="h-3.5 w-3.5" /> Watch Video Walkthrough
                  </a>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Updated {res.updatedAt}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      trackResourceEvent(res.id, "view");
                      setPreviewResource(res);
                    }}
                    className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg gap-1"
                  >
                    <Eye className="h-3.5 w-3.5 text-[#00C4CF]" /> Preview
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyShareLink(res)}
                    className="h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                    title="Copy share link"
                  >
                    {copiedId === res.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleDownload(res)}
                    className="h-8 px-2.5 text-xs bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white font-bold rounded-lg gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Get
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="p-12 text-center bg-[#141528] border border-white/10 rounded-2xl space-y-3">
          <div className="p-3 bg-white/5 text-slate-400 rounded-2xl w-fit mx-auto">
            <SlidersHorizontal className="h-8 w-8" />
          </div>
          <h4 className="text-sm font-bold text-white">No collateral matching search criteria</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or switching categories to browse all agent files.
          </p>
        </div>
      )}

      <Dialog open={!!previewResource} onOpenChange={() => setPreviewResource(null)}>
        <DialogContent className="sm:max-w-[700px] bg-[#141528] border border-white/10 text-white rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          {previewResource && (
            <div className="space-y-4">
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#00C4CF]/20 text-[#00C4CF] border-none text-[10px] uppercase font-bold">
                    {previewResource.category}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px]">
                    {previewResource.fileType || "PDF"} • {previewResource.fileSize || previewResource.duration || "1.5 MB"}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-white">
                  {previewResource.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {previewResource.description}
                </DialogDescription>
              </DialogHeader>

              {previewResource.tourGuideContent ? (
                <ProtectedTourGuideViewer module={previewResource} agentName="Agent Field View" />
              ) : (
                <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto">
                  {previewResource.pitchScript || previewResource.description || "File ready for field distribution."}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-xs text-slate-400">
                  Total Agent Downloads: {previewResource.downloadsCount || 0}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyShareLink(previewResource)}
                    className="border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-1.5 rounded-xl h-9"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Link
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      handleDownload(previewResource);
                      setPreviewResource(null);
                    }}
                    className="bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white text-xs font-bold gap-1.5 rounded-xl h-9"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
