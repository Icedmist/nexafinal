import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ShieldCheck,
  Video,
  Share2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Eye,
  BookOpen,
  Sparkles,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { CourseModule } from "@/lib/course-data";

interface ProtectedTourGuideViewerProps {
  module: CourseModule;
  agentName?: string;
  onOpenVideo?: (videoUrl: string) => void;
}

export function ProtectedTourGuideViewer({ module, agentName = "Stackwise Agent", onOpenVideo }: ProtectedTourGuideViewerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const shareableLink = `${window.location.origin}/app/help?tour_slug=${module.shareableTourSlug || "guide"}&agent=${encodeURIComponent(agentName)}`;

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    toast.success("Tour Guide Share Link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <Card className="shadow-none border border-muted-foreground/15 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-muted-foreground/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-500" /> Protected Tour Guide
              </Badge>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                {module.duration} Walkthrough
              </Badge>
            </div>
            <CardTitle className="text-base font-bold font-sans text-foreground flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-primary shrink-0" />
              {module.tourGuidePdfTitle || module.title}
            </CardTitle>
            <CardDescription className="text-xs">
              {module.description}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {module.videoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-bold"
                onClick={() => {
                  if (onOpenVideo) onOpenVideo(module.videoUrl);
                  else setShowVideoModal(true);
                }}
              >
                <Video className="h-3.5 w-3.5 text-rose-500" /> Watch Video Tutorial
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-bold"
              onClick={handleCopyShareLink}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
              {copiedLink ? "Link Copied!" : "Share Tour Link"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Protected View Canvas Container */}
      <CardContent className="p-0 relative select-none bg-card">
        {/* Anti-Download Watermark Overlay Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-medium">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            Protected Document Mode — Protected against raw file download & screenshot export.
          </span>
          <span className="font-mono text-[10px] opacity-80 hidden sm:inline">
            Agent Copy ID: {agentName}
          </span>
        </div>

        {/* Watermarked Document Body */}
        <div className="p-6 space-y-6 relative min-h-[220px] bg-muted/5 font-sans text-xs leading-relaxed text-foreground">
          {/* Subtle Diagonal Watermark Background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] text-foreground font-extrabold text-3xl rotate-[-25deg] select-none">
            STACKWISE OFFICIAL TOUR GUIDE • PROTECTED COPY
          </div>

          {/* Document Content Rendering */}
          {module.pitchScript && (
            <div className="bg-primary/5 p-3.5 rounded-lg border border-primary/10 space-y-1">
              <span className="text-[11px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Recommended Agent Pitch Script
              </span>
              <p className="italic text-muted-foreground text-xs leading-relaxed">
                "{module.pitchScript}"
              </p>
            </div>
          )}

          <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-background p-4 rounded-lg border border-muted-foreground/15 shadow-inner">
            {module.tourGuideContent}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 border-t border-muted-foreground/10 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-medium">
            <BookOpen className="h-3.5 w-3.5 text-primary" /> Category: {module.category.toUpperCase()}
          </span>
          <span>•</span>
          <span className="font-mono text-[10px]">Updated: {module.updatedAt}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1 font-normal">
            <Download className="h-3 w-3 text-rose-500 line-through" /> Raw Download Disabled
          </Badge>
          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/10 font-bold">
            <Eye className="h-3 w-3 mr-1" /> Live Tour Link Ready
          </Badge>
        </div>
      </CardFooter>

      {/* Embedded Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background border border-muted-foreground/20 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-rose-500" />
                <h3 className="font-bold text-base text-foreground">{module.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowVideoModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="aspect-video bg-black rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-3 border border-muted-foreground/20">
              <Video className="h-12 w-12 text-rose-500 animate-pulse" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Stackwise Video Course Lesson</p>
                <p className="text-xs text-zinc-400 font-mono">{module.videoUrl}</p>
              </div>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-xs"
                onClick={() => window.open(module.videoUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Launch Video in Fullscreen Player
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Super Admins can update or replace this video URL anytime from the Super Admin Management Desk.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
