import { useState } from "react";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Download, 
  Sparkles, 
  Check, 
  FileText, 
  Award, 
  ChevronRight,
  Tv,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface VideoLesson {
  id: string;
  title: string;
  category: "Pitching" | "Onboarding" | "CSV Migration" | "Hardware" | "Commissions";
  duration: string;
  thumbnailUrl: string;
  videoUrl?: string;
  summary: string;
  keyTakeaways: string[];
  slidesFileName: string;
  isCompleted?: boolean;
}

export const SAMPLE_VIDEO_LESSONS: VideoLesson[] = [
  {
    id: "vid-101",
    title: "Field Agent 101: How to Pitch NexaStoreOS to Local Shop Keepers",
    category: "Pitching",
    duration: "6:45",
    thumbnailUrl: "https://images.unsplash.com/photo-1556742049-0a670f4a4591?auto=format&fit=crop&q=80&w=800",
    summary: "Learn the 3-minute pitch strategy designed for Nigerian supermarkets, pharmacies, and fashion boutiques. Focus on solving inventory leakage and staff theft.",
    keyTakeaways: [
      "Ask the merchant: 'How do you check your total store value right now?'",
      "Demonstrate offline receipt generation directly on an Android smartphone.",
      "Show how staff access is locked so cashiers cannot alter prices."
    ],
    slidesFileName: "nexa_pitching_101_slides.pdf"
  },
  {
    id: "vid-102",
    title: "Step-by-Step Merchant Stock CSV Migration & AI Cleaning",
    category: "CSV Migration",
    duration: "9:12",
    thumbnailUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    summary: "Master converting messy merchant stock books or raw Excel files into clean NexaStoreOS CSV files in under 5 minutes using our built-in AI prompt.",
    keyTakeaways: [
      "Ensure column headers match: name, sku, sellingPrice, costPrice, stockQuantity, category.",
      "Use our ready-made ChatGPT/Claude prompt for converting WhatsApp photo lists.",
      "Validate row counts before committing bulk CSV import."
    ],
    slidesFileName: "csv_migration_masterclass.pdf"
  },
  {
    id: "vid-103",
    title: "Connecting Bluetooth Barcode Scanners & 58mm Thermal Printers",
    category: "Hardware",
    duration: "7:30",
    thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
    summary: "A practical hands-on guide for pairing portable ESC/POS thermal printers and Bluetooth barcode scanners to NexaStoreOS web POS.",
    keyTakeaways: [
      "Enable Bluetooth pairing on Android tablet or PC.",
      "Select 'Nexa Thermal Print Service' in POS Checkout Settings.",
      "Test print a sample WhatsApp e-receipt."
    ],
    slidesFileName: "hardware_setup_guide.pdf"
  },
  {
    id: "vid-104",
    title: "Merchant Onboarding Walkthrough & Staff Role Assignment",
    category: "Onboarding",
    duration: "8:05",
    thumbnailUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800",
    summary: "Complete walkthrough of setting up store profile, tax settings, store locations, and inviting store managers or cashiers with restricted roles.",
    keyTakeaways: [
      "Configure store currency symbol and business type during onboarding.",
      "Generate custom staff invite links for cashier PIN logins.",
      "Guide store owner through their first test checkout."
    ],
    slidesFileName: "merchant_onboarding_checklist.pdf"
  },
  {
    id: "vid-105",
    title: "Maximizing Your Agent Monthly Commission & Territory Expansion",
    category: "Commissions",
    duration: "5:50",
    thumbnailUrl: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=800",
    summary: "Detailed breakdown of Nexa Agent payout structures: ₦10,000 upfront logistics bonus, ₦1,500 Pro referral bonus, and monthly recurring overrides.",
    keyTakeaways: [
      "Earn immediate ₦10k upon merchant completing 10 active sales.",
      "Receive automated monthly payout directly to your registered bank account.",
      "Track pending vs paid earnings in real-time on your Agent Dashboard."
    ],
    slidesFileName: "agent_commission_tier_policy.pdf"
  }
];

export function AgentVideoAcademyView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [completedLessons, setCompletedLessons] = useState<string[]>(["vid-101"]);
  const [activeVideoModal, setActiveVideoModal] = useState<VideoLesson | null>(null);

  const categories = ["All", "Pitching", "Onboarding", "CSV Migration", "Hardware", "Commissions"];

  const filteredLessons = SAMPLE_VIDEO_LESSONS.filter((vid) => {
    return selectedCategory === "All" || vid.category === selectedCategory;
  });

  const toggleLessonComplete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCompletedLessons((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        toast.info("Marked lesson as uncompleted");
        return prev.filter((item) => item !== id);
      } else {
        toast.success("Lesson completed! Progress saved.");
        return [...prev, id];
      }
    });
  };

  const completionPercentage = Math.round((completedLessons.length / SAMPLE_VIDEO_LESSONS.length) * 100);

  const handleDownloadSlides = (vid: VideoLesson) => {
    const textContent = `--- SLIDES SUMMARY: ${vid.title} ---\nCategory: ${vid.category}\nDuration: ${vid.duration}\n\nSUMMARY:\n${vid.summary}\n\nKEY TAKEAWAYS:\n${vid.keyTakeaways.map((k, i) => `${i + 1}. ${k}`).join("\n")}`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", vid.slidesFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading slides: ${vid.slidesFileName}`);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-[#141528] via-[#1A1C36] to-[#0F1020] border border-white/10 rounded-2xl text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#00C4CF]/20 text-[#00C4CF] border-none text-[10px] uppercase font-bold">
                Nexa Agent Academy
              </Badge>
              <Badge className="bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[10px] uppercase font-bold">
                HD Video Masterclasses
              </Badge>
            </div>
            <h2 className="text-xl font-bold font-['Bricolage_Grotesque'] text-white">
              Video Educational Training &amp; Field Mastery
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Watch step-by-step video lessons to master merchant pitching, POS hardware pairing, CSV inventory migration, and maximizing your monthly commission payouts.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-2 min-w-[240px]">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Course Completion</span>
              <span className="text-[#00C4CF] font-bold">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2 bg-white/10 [&>div]:bg-[#00C4CF]" />
            <p className="text-[10px] text-slate-400">
              {completedLessons.length} of {SAMPLE_VIDEO_LESSONS.length} modules completed
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-[#141528] border border-white/10 p-3 rounded-2xl">
        <span className="text-xs text-slate-400 font-semibold px-2">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-[#2B5BFF] text-white shadow-md font-bold"
                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLessons.map((vid) => {
          const isDone = completedLessons.includes(vid.id);

          return (
            <Card
              key={vid.id}
              onClick={() => setActiveVideoModal(vid)}
              className="bg-[#141528] border border-white/10 hover:border-[#2B5BFF]/50 transition-all rounded-2xl overflow-hidden text-white cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={vid.thumbnailUrl}
                    alt={vid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 bg-[#2B5BFF] group-hover:bg-[#1B4BEE] text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge className="bg-black/60 backdrop-blur-md text-[#00C4CF] border-none text-[10px] font-bold">
                      {vid.category}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-300" />
                    {vid.duration}
                  </div>

                  {isDone && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#00C4CF] transition-colors leading-snug line-clamp-2">
                    {vid.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {vid.summary}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-white/5 mt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={(e) => toggleLessonComplete(vid.id, e)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    isDone
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 ${isDone ? "text-emerald-400 fill-emerald-400/20" : ""}`} />
                  {isDone ? "Completed" : "Mark Complete"}
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadSlides(vid);
                  }}
                  className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg gap-1"
                >
                  <Download className="h-3.5 w-3.5 text-[#00C4CF]" /> Slides
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!activeVideoModal} onOpenChange={() => setActiveVideoModal(null)}>
        <DialogContent className="sm:max-w-[720px] bg-[#141528] border border-white/10 text-white rounded-3xl p-6 overflow-hidden">
          {activeVideoModal && (
            <div className="space-y-5">
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#2B5BFF]/20 text-[#2B5BFF] border-none text-[10px] uppercase font-bold">
                    {activeVideoModal.category}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px]">
                    <Clock className="h-3 w-3 mr-1 inline" /> {activeVideoModal.duration}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-white">
                  {activeVideoModal.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {activeVideoModal.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center group">
                <img
                  src={activeVideoModal.thumbnailUrl}
                  alt={activeVideoModal.title}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute text-center space-y-3 p-4">
                  <div className="h-16 w-16 bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white rounded-full flex items-center justify-center mx-auto shadow-2xl transition-transform hover:scale-110 cursor-pointer">
                    <Play className="h-7 w-7 fill-current ml-1" />
                  </div>
                  <p className="text-xs font-bold text-white drop-shadow">
                    Click to Play Interactive HD Video Lesson ({activeVideoModal.duration})
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-white/5 border border-white/10 p-4 rounded-2xl text-xs">
                <span className="font-bold text-[#00C4CF] flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> Lesson Key Takeaways &amp; Field Rules:
                </span>
                <ul className="space-y-1.5 text-slate-300">
                  {activeVideoModal.keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#4DE89A] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownloadSlides(activeVideoModal)}
                  className="border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-1.5 rounded-xl h-9"
                >
                  <Download className="h-3.5 w-3.5 text-[#00C4CF]" /> Download Lesson PDF Slides
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    toggleLessonComplete(activeVideoModal.id);
                    setActiveVideoModal(null);
                  }}
                  className={`text-xs font-bold gap-1.5 rounded-xl h-9 ${
                    completedLessons.includes(activeVideoModal.id)
                      ? "bg-slate-700 text-white"
                      : "bg-[#4DE89A] hover:bg-[#3CD789] text-slate-950"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completedLessons.includes(activeVideoModal.id) ? "Mark Uncompleted" : "Complete Lesson"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
