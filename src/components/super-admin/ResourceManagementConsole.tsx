import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Video,
  FileText,
  Lock,
  Edit2,
  Trash2,
  Eye,
  Share2,
  Sparkles,
  TrendingUp,
  BarChart2,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  BookOpen,
  Search,
  Download,
  Globe,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  CourseModule,
  getCourseModules,
  getCourseResourceAnalytics,
  trackResourceEvent,
  saveModuleToFirestoreAndLocal,
  deleteModuleFromFirestoreAndLocal,
  initFirestoreResourceSync,
} from "@/lib/course-data";
import { ProtectedTourGuideViewer } from "@/components/shared/ProtectedTourGuideViewer";

export function ResourceManagementConsole() {
  const [modules, setModules] = useState<CourseModule[]>(() => getCourseModules());
  const [analytics, setAnalytics] = useState(() => getCourseResourceAnalytics());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Initialize Firestore live sync listener & event listener
  useEffect(() => {
    const unsubFirestore = initFirestoreResourceSync();

    const handleUpdate = () => {
      setModules(getCourseModules());
      setAnalytics(getCourseResourceAnalytics());
    };
    window.addEventListener("stackwise_course_modules_updated", handleUpdate);

    return () => {
      unsubFirestore();
      window.removeEventListener("stackwise_course_modules_updated", handleUpdate);
    };
  }, []);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [deletingModule, setDeletingModule] = useState<CourseModule | null>(null);
  const [previewModule, setPreviewModule] = useState<CourseModule | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CourseModule["category"]>("pitch");
  const [resourceType, setResourceType] = useState<NonNullable<CourseModule["resourceType"]>>("pitch");
  const [published, setPublished] = useState(true);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("5 mins");
  const [fileType, setFileType] = useState<NonNullable<CourseModule["fileType"]>>("PDF");
  const [fileSize, setFileSize] = useState("1.5 MB");
  const [videoUrl, setVideoUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [pitchScript, setPitchScript] = useState("");
  const [tourGuidePdfTitle, setTourGuidePdfTitle] = useState("");
  const [tourGuideContent, setTourGuideContent] = useState("");
  const [shareableTourSlug, setShareableTourSlug] = useState("");

  const resetForm = () => {
    setTitle("");
    setCategory("pitch");
    setResourceType("pitch");
    setPublished(true);
    setDescription("");
    setDuration("5 mins");
    setFileType("PDF");
    setFileSize("1.5 MB");
    setVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    setPitchScript("");
    setTourGuidePdfTitle("");
    setTourGuideContent("");
    setShareableTourSlug("");
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (mod: CourseModule) => {
    setEditingModule(mod);
    setTitle(mod.title);
    setCategory(mod.category);
    setResourceType(mod.resourceType || "pitch");
    setPublished(mod.published ?? true);
    setDescription(mod.description);
    setDuration(mod.duration || "5 mins");
    setFileType(mod.fileType || "PDF");
    setFileSize(mod.fileSize || "1.5 MB");
    setVideoUrl(mod.videoUrl || "");
    setPitchScript(mod.pitchScript || "");
    setTourGuidePdfTitle(mod.tourGuidePdfTitle || "");
    setTourGuideContent(mod.tourGuideContent || "");
    setShareableTourSlug(mod.shareableTourSlug || "");
  };

  const handleTogglePublish = async (mod: CourseModule) => {
    const nextStatus = !(mod.published ?? true);
    const updated: CourseModule = {
      ...mod,
      published: nextStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    await saveModuleToFirestoreAndLocal(updated);
    setModules(getCourseModules());
    setAnalytics(getCourseResourceAnalytics());
    toast.success(
      nextStatus
        ? `"${mod.title}" is now PUBLISHED to the Agent Portal!`
        : `"${mod.title}" is now moved to DRAFT mode (hidden from agents).`
    );
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Resource title is required.");
      return;
    }

    const newModule: CourseModule = {
      id: `mod-${Date.now()}`,
      title: title.trim(),
      category,
      resourceType,
      published,
      description: description.trim(),
      duration: duration.trim() || "5 mins",
      fileType,
      fileSize: fileSize.trim() || "1.5 MB",
      videoUrl: videoUrl.trim(),
      pitchScript: pitchScript.trim(),
      tourGuidePdfTitle: tourGuidePdfTitle.trim() || `${title.trim()}.pdf`,
      tourGuideContent: tourGuideContent.trim(),
      shareableTourSlug: shareableTourSlug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      updatedAt: new Date().toISOString().slice(0, 10),
      viewCount: 0,
      playCount: 0,
      shareCount: 0,
      downloadsCount: 0,
    };

    await saveModuleToFirestoreAndLocal(newModule);
    setModules(getCourseModules());
    setAnalytics(getCourseResourceAnalytics());
    setIsCreateOpen(false);
    resetForm();
    toast.success(`Resource "${newModule.title}" saved successfully!`);
  };

  const handleUpdateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;

    const updated: CourseModule = {
      ...editingModule,
      title: title.trim(),
      category,
      resourceType,
      published,
      description: description.trim(),
      duration: duration.trim(),
      fileType,
      fileSize: fileSize.trim(),
      videoUrl: videoUrl.trim(),
      pitchScript: pitchScript.trim(),
      tourGuidePdfTitle: tourGuidePdfTitle.trim(),
      tourGuideContent: tourGuideContent.trim(),
      shareableTourSlug: shareableTourSlug.trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    await saveModuleToFirestoreAndLocal(updated);
    setModules(getCourseModules());
    setAnalytics(getCourseResourceAnalytics());
    setEditingModule(null);
    toast.success(`Resource "${updated.title}" updated and synced successfully!`);
  };

  const handleDeleteModule = async () => {
    if (!deletingModule) return;
    await deleteModuleFromFirestoreAndLocal(deletingModule.id);
    setModules(getCourseModules());
    setAnalytics(getCourseResourceAnalytics());
    toast.success(`Resource "${deletingModule.title}" deleted.`);
    setDeletingModule(null);
  };

  // Filtered list
  const filteredModules = modules.filter((mod) => {
    const isPub = mod.published ?? true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && isPub) ||
      (statusFilter === "draft" && !isPub);

    const matchesCategory =
      categoryFilter === "all" || mod.category === categoryFilter;

    const matchesSearch =
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card & Global Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-muted-foreground/15 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-sans text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Super Admin Marketing &amp; Training Resources Console
            </h2>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
              Live HQ &amp; Portal Sync
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Publish, edit, unpublish, and manage video training, marketing collateral, field pitch scripts, and protected tour guides for agent portal.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          size="sm"
          className="text-xs font-bold h-9 bg-primary hover:bg-primary/95 text-primary-foreground gap-1.5 shrink-0 shadow"
        >
          <Plus className="h-4 w-4" /> Add New Marketing / Training Resource
        </Button>
      </div>

      {/* Analytics Tracking Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Resources</span>
              <p className="text-xl font-bold font-mono text-foreground">{analytics.totalModules}</p>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Published Live</span>
              <p className="text-xl font-bold font-mono text-emerald-600">{analytics.publishedModules}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Globe className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Agent Views</span>
              <p className="text-xl font-bold font-mono text-foreground">{analytics.totalViews}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Eye className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Video Plays</span>
              <p className="text-xl font-bold font-mono text-rose-500">{analytics.totalVideoPlays}</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <Video className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-muted-foreground/15">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Downloads</span>
              <p className="text-xl font-bold font-mono text-amber-500">{analytics.totalDownloads}</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Download className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Directory Controls & Table */}
      <Card className="shadow-none border border-muted-foreground/15 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-muted-foreground/10 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold font-sans flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Active Collateral &amp; Resource Directory ({filteredModules.length})
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
                className="h-8 px-2 rounded-md border border-input bg-background text-xs font-semibold"
              >
                <option value="all">Status: All</option>
                <option value="published">Status: Published</option>
                <option value="draft">Status: Draft</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-2 rounded-md border border-input bg-background text-xs font-semibold"
              >
                <option value="all">Category: All</option>
                <option value="pitch">Pitch Script</option>
                <option value="Flyers">Flyers</option>
                <option value="onboarding">Onboarding</option>
                <option value="objections">Objections</option>
                <option value="Legal">Legal Contracts</option>
                <option value="Hardware">Hardware</option>
                <option value="tour">HQ Tour</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-muted-foreground/10">
            {filteredModules.map((mod) => {
              const isPub = mod.published ?? true;

              return (
                <div key={mod.id} className="p-4 hover:bg-muted/10 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPub ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold uppercase gap-1">
                            <Globe className="h-3 w-3" /> Published
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] font-bold uppercase gap-1">
                            <EyeOff className="h-3 w-3" /> Draft
                          </Badge>
                        )}

                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                          {mod.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {mod.fileType || "PDF"} • {mod.fileSize || mod.duration || "1.5 MB"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {mod.id}</span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground font-sans">{mod.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                    </div>

                    {/* Actions & Metrics */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2.5 bg-muted/30 px-3 py-1 rounded-lg border text-[11px] font-mono text-muted-foreground">
                        <span title="Agent Views">👁️ {mod.viewCount || 0}</span>
                        <span title="Video Plays">▶️ {mod.playCount || 0}</span>
                        <span title="Downloads">📥 {mod.downloadsCount || 0}</span>
                      </div>

                      <Button
                        variant={isPub ? "outline" : "default"}
                        size="sm"
                        className={`h-8 text-xs font-bold gap-1 ${
                          isPub
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        onClick={() => handleTogglePublish(mod)}
                        title={isPub ? "Unpublish from agent portal" : "Publish to agent portal"}
                      >
                        {isPub ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                        {isPub ? "Unpublish" : "Publish Live"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 font-bold"
                        onClick={() => {
                          trackResourceEvent(mod.id, "view");
                          setPreviewModule(mod);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-500" /> Preview
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 font-bold"
                        onClick={() => handleOpenEdit(mod)}
                      >
                        <Edit2 className="h-3.5 w-3.5 text-amber-500" /> Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        onClick={() => setDeletingModule(mod)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Video URL & Script Quick Details */}
                  <div className="grid gap-2 sm:grid-cols-2 text-[11px] font-sans bg-muted/20 p-2.5 rounded-lg border border-muted-foreground/10">
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-bold flex items-center gap-1">
                        <Video className="h-3 w-3 text-rose-500" /> Video URL:
                      </span>
                      {mod.videoUrl ? (
                        <a
                          href={mod.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline truncate block font-mono hover:opacity-80"
                          onClick={() => trackResourceEvent(mod.id, "play_video")}
                        >
                          {mod.videoUrl}
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">None configured</span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-muted-foreground font-bold flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" /> Pitch Script / Preview Snippet:
                      </span>
                      <p className="italic text-foreground line-clamp-1">{mod.pitchScript || mod.tourGuideContent || "None configured"}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredModules.length === 0 && (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <SlidersHorizontal className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-xs font-semibold">No resources match search or filter criteria.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CREATE RESOURCE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Create New Marketing &amp; Training Resource
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new video training module, marketing flyer, sales pitch deck, or protected tour guide document for field agents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="font-semibold">Resource Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 3-Minute Quick Supermarket Pitch"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-semibold">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CourseModule["category"])}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="pitch">Pitch Script &amp; Sales</option>
                  <option value="Flyers">Marketing Flyers</option>
                  <option value="onboarding">Store Onboarding</option>
                  <option value="objections">Objection Handling</option>
                  <option value="Legal">Legal Contracts</option>
                  <option value="Hardware">Hardware Specs</option>
                  <option value="tour">HQ &amp; Chain Store Tour</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="published" className="font-semibold">Publishing Status</Label>
                <select
                  id="published"
                  value={published ? "published" : "draft"}
                  onChange={(e) => setPublished(e.target.value === "published")}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-bold"
                >
                  <option value="published">🟢 Published (Live in Portal)</option>
                  <option value="draft">🟡 Draft (Hidden from Agents)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fileType" className="font-semibold">File Document Format</Label>
                <select
                  id="fileType"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as NonNullable<CourseModule["fileType"]>)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="PPTX">PPTX Slide Deck</option>
                  <option value="DOCX">DOCX Word Document</option>
                  <option value="ZIP">ZIP Package</option>
                  <option value="PNG">PNG Image Flyer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fileSize" className="font-semibold">File Size / Duration</Label>
                <Input
                  id="fileSize"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="e.g. 2.4 MB or 5 mins"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="video-url" className="font-semibold">Video Tutorial URL (YouTube/Loom/Vimeo)</Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-semibold">Module Overview &amp; Objective *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what field agents will learn or download from this resource..."
                className="text-xs min-h-[60px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pitch-script" className="font-semibold">Agent Field Pitch Script</Label>
              <Textarea
                id="pitch-script"
                value={pitchScript}
                onChange={(e) => setPitchScript(e.target.value)}
                placeholder="Exact 2-3 sentence speech for field agents when speaking to retail business owners..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tour-content" className="font-semibold">Protected Document &amp; Tour Guide Text</Label>
              <Textarea
                id="tour-content"
                value={tourGuideContent}
                onChange={(e) => setTourGuideContent(e.target.value)}
                placeholder="=== NEXASTOREOS TOUR & DOCUMENT MANUAL ===&#10;1. POS Checkout Rules&#10;2. Expiry Alerts..."
                className="text-xs font-mono min-h-[100px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Save &amp; Sync Resource
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT RESOURCE DIALOG */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-500" /> Edit Resource Module
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateModule} className="space-y-4 text-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-semibold">Resource Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" required />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CourseModule["category"])}
                  className="w-full h-9 px-3 rounded-md border text-xs"
                >
                  <option value="pitch">Pitch Script</option>
                  <option value="Flyers">Flyers</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="objections">Objections</option>
                  <option value="Legal">Legal Contracts</option>
                  <option value="Hardware">Hardware</option>
                  <option value="tour">HQ Tour</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="font-semibold">Publishing Status</Label>
                <select
                  value={published ? "published" : "draft"}
                  onChange={(e) => setPublished(e.target.value === "published")}
                  className="w-full h-9 px-3 rounded-md border text-xs font-bold"
                >
                  <option value="published">🟢 Published (Live in Portal)</option>
                  <option value="draft">🟡 Draft (Hidden from Agents)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">File Format</Label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as NonNullable<CourseModule["fileType"]>)}
                  className="w-full h-9 px-3 rounded-md border text-xs"
                >
                  <option value="PDF">PDF</option>
                  <option value="PPTX">PPTX</option>
                  <option value="DOCX">DOCX</option>
                  <option value="ZIP">ZIP</option>
                  <option value="PNG">PNG</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">File Size / Duration</Label>
                <Input value={fileSize} onChange={(e) => setFileSize(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Video Tutorial URL</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="h-9 text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Overview &amp; Objective</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Pitch Script</Label>
              <Textarea value={pitchScript} onChange={(e) => setPitchScript(e.target.value)} className="text-xs min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Protected Tour / Document Text</Label>
              <Textarea value={tourGuideContent} onChange={(e) => setTourGuideContent(e.target.value)} className="text-xs font-mono min-h-[100px]" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingModule(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground font-bold">
                Update &amp; Sync Resource
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deletingModule} onOpenChange={() => setDeletingModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Confirm Resource Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete "{deletingModule?.title}"? This will permanently remove the resource for all field agents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingModule(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteModule}>
              Delete Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PREVIEW TOUR GUIDE DIALOG */}
      <Dialog open={!!previewModule} onOpenChange={() => setPreviewModule(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Live Protected Canvas Preview
            </DialogTitle>
          </DialogHeader>

          {previewModule && (
            <ProtectedTourGuideViewer module={previewModule} agentName="Super Admin Preview" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

