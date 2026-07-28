import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Check, 
  LogOut, 
  Settings, 
  Layers, 
  ChevronRight, 
  ShieldAlert, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightLeft, 
  UserPlus, 
  LogIn, 
  Calculator,
  Award,
  Clock,
  Briefcase,
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckSquare,
  Globe,
  ChevronDown,
  Building2,
  FileText,
  HelpCircle,
  Eye,
  EyeOff,
  Video,
  Lock,
  BookOpen,
  ExternalLink,
  Share2,
  Rocket,
  User as UserIcon,
  BarChart3,
  Link,
  ClipboardList,
  Banknote,
  Calendar,
  Gift,
  Zap,
  RefreshCw,
  Landmark,
  Shield,
  FileEdit,
  Store,
  Handshake,
  Ban,
  GraduationCap,
  X,
  Smartphone,
  CheckCircle,
  MessageCircle,
  FileSpreadsheet,
  Plus,
  Wallet,
  QrCode,
  Search,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import gsap from "gsap";
import "@/styles/landing.css";
import { INITIAL_COURSE_MODULES, CourseModule } from "@/lib/course-data";
import { ProtectedTourGuideViewer } from "@/components/shared/ProtectedTourGuideViewer";
import { DemoPassGeneratorModal } from "@/components/shared/DemoPassGeneratorModal";
import { CSVImportGuideContent } from "@/components/data/CSVImportGuideModal";
import { AgentSidebar, type AgentTabType } from "@/components/agents/AgentSidebar";
import { AgentHeader } from "@/components/agents/AgentHeader";
import { AgentResourcesView } from "@/components/agents/AgentResourcesView";
import { AgentVideoAcademyView } from "@/components/agents/AgentVideoAcademyView";
import { OnboardMerchantModal } from "@/components/agents/OnboardMerchantModal";
import { ClaimPayoutModal } from "@/components/agents/ClaimPayoutModal";
import { FieldPitchPlaybook } from "@/components/agents/FieldPitchPlaybook";
import { AgentQrFlyerModal } from "@/components/agents/AgentQrFlyerModal";
import { LogVisitModal } from "@/components/agents/LogVisitModal";

interface AgentProfile {
  agentId: string;
  fullName: string;
  email: string;
  phone?: string;
  region?: string;
  bank?: string;
  accountNumber?: string;
  accountName?: string;
  referralCode: string;
  referralLink: string;
  status: "pending" | "approved" | "suspended";
  commissionRulesApplied: string;
  earnings: {
    pending: number;
    paid: number;
    reversed: number;
  };
  createdAt: string;
}

interface ReferralRecord {
  id: string;
  agentId: string;
  storeId: string;
  status: "pending" | "converted" | "churned";
  createdAt: string;
  convertedAt?: string;
  churnedAt?: string;
  storeName?: string;
  planName?: string;
  ownerName?: string;
  ownerPhone?: string;
  location?: string;
}

interface EarningRecord {
  id: string;
  agentId: string;
  referralId: string;
  storeId: string;
  subscriptionEventId: string;
  amount: number;
  commissionType: "onboarding_bonus" | "recurring_residual" | "clawback";
  status: "pending" | "paid" | "reversed";
  timestamp: string;
  storeName?: string;
}

const NIGERIAN_STATES = [
  "Taraba State", "Adamawa State", "Borno State", "Yobe State", "Gombe State",
  "Bauchi State", "Plateau State", "Nasarawa State", "Benue State", "Kogi State",
  "Kwara State", "Niger State", "FCT Abuja", "Lagos State", "Ogun State",
  "Oyo State", "Kano State", "Kaduna State", "Sokoto State", "Kebbi State",
  "Zamfara State", "Katsina State", "Jigawa State", "Enugu State", "Anambra State",
  "Imo State", "Abia State", "Ebonyi State", "Edo State", "Delta State",
  "Rivers State", "Cross River State", "Akwa Ibom State", "Bayelsa State", "Ekiti State",
  "Osun State", "Ondo State"
];

const NIGERIAN_BANKS = [
  "Access Bank", "GTBank", "First Bank of Nigeria", "UBA (United Bank for Africa)",
  "Zenith Bank", "Fidelity Bank", "Stanbic IBTC Bank", "Union Bank", "Sterling Bank",
  "Wema Bank", "OPay", "PalmPay", "Kuda Bank", "Moniepoint Microfinance Bank",
  "Ecobank", "Heritage Bank", "Keystone Bank", "Polaris Bank", "Jaiz Bank", "Other Bank"
];

export function AgentsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stats calculation
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);

  // Auth Inputs & Steps
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [ninInput, setNinInput] = useState("");
  const [stateInput, setStateInput] = useState("");
  const [lgaInput, setLgaInput] = useState("");
  const [bankInput, setBankInput] = useState("");
  const [accountNoInput, setAccountNoInput] = useState("");
  const [whyInput, setWhyInput] = useState("");
  const [customRefCodeInput, setCustomRefCodeInput] = useState("");
  const [registerStep, setRegisterStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Application Success Banner
  const [appSubmittedSuccess, setAppSubmittedSuccess] = useState<null | {
    agentId: string;
    message: string;
  }>(null);

  // Settings state
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsRegion, setSettingsRegion] = useState("");
  const [settingsRefCode, setSettingsRefCode] = useState("");
  const [activeTab, setActiveTab] = useState<AgentTabType>("performance");
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Action Modals State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showClaimPayoutModal, setShowClaimPayoutModal] = useState(false);
  const [showQrFlyerModal, setShowQrFlyerModal] = useState(false);
  const [selectedVisitStore, setSelectedVisitStore] = useState<{ id: string; name: string } | null>(null);

  // Search & Filters State
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantStatusFilter, setMerchantStatusFilter] = useState<"all" | "converted" | "pending">("all");
  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<"all" | "onboarding_bonus" | "recurring_residual">("all");

  // Academy & Demo Pass Modal State
  const [showAgentDemoModal, setShowAgentDemoModal] = useState(false);
  const [selectedAcademyCourse, setSelectedAcademyCourse] = useState<CourseModule>(INITIAL_COURSE_MODULES[0]);
  const [agentVideoUrl, setAgentVideoUrl] = useState<string | null>(null);

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Interactive Calculator State
  const [calcPlan, setCalcPlan] = useState<"pro" | "enterprise" | "mix">("pro");
  const [calcProCount, setCalcProCount] = useState(20);
  const [calcEntCount, setCalcEntCount] = useState(5);
  const [calcMixPro, setCalcMixPro] = useState(15);
  const [calcMixEnt, setCalcMixEnt] = useState(3);
  const [calcMonths, setCalcMonths] = useState(12);

  // FAQ Open State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Nav Scroll effect
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mouse 3D tilt effect on Agent Wallet Card
  const walletCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!walletCardRef.current) return;
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      gsap.to(walletCardRef.current, {
        rotateX: 10 - dy * 5,
        rotateY: -2 + dx * 5,
        duration: 0.8,
        ease: "power2.out"
      });
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Load user session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check super admin status
        const isBootstrappedAdmin = 
          user.email === "nexatechnologies.dev@gmail.com" ||
          user.email === "operations@nexa.com" ||
          user.email === "support@nexa.com";
        
        if (isBootstrappedAdmin) {
          setIsSuperAdmin(true);
        } else {
          getDoc(doc(db, "super_admins", user.uid)).then((docSnap) => {
            if (docSnap.exists() && docSnap.data()?.active !== false) {
              setIsSuperAdmin(true);
            } else {
              setIsSuperAdmin(false);
            }
          }).catch(() => {
            setIsSuperAdmin(false);
          });
        }

        // Fetch Agent profile
        const agentDocRef = doc(db, "agents", user.uid);
        const unsubscribeProfile = onSnapshot(agentDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AgentProfile;
            setAgentProfile(data);
            setSettingsName(data.fullName);
            setSettingsPhone(data.phone || "");
            setSettingsRegion(data.region || "");
            setSettingsRefCode(data.referralCode);
          } else {
            setAgentProfile(null);
          }
          setLoading(false);
        });

        // Fetch Referrals
        const referralsQuery = query(collection(db, "referrals"), where("agentId", "==", user.uid));
        const unsubscribeReferrals = onSnapshot(referralsQuery, async (snap) => {
          const rawRefs: ReferralRecord[] = [];
          for (const d of snap.docs) {
            const data = d.data();
            let storeName = "Nexa Store";
            let planName = "Starter";

            try {
              const storeSnap = await getDoc(doc(db, "stores", data.storeId));
              if (storeSnap.exists()) {
                const sData = storeSnap.data();
                storeName = sData.storeName || "Nexa Store";
                planName = sData.subscriptionTier || "Starter";
              }
            } catch (err) {
              console.warn("Failed to fetch store detail for referral:", err);
            }

            rawRefs.push({
              id: d.id,
              agentId: data.agentId,
              storeId: data.storeId,
              status: data.status,
              createdAt: data.createdAt,
              convertedAt: data.convertedAt,
              churnedAt: data.churnedAt,
              storeName,
              planName
            });
          }
          setReferrals(rawRefs);
        });

        // Fetch Earnings
        const earningsQuery = query(collection(db, "agentEarnings"), where("agentId", "==", user.uid));
        const unsubscribeEarnings = onSnapshot(earningsQuery, async (snap) => {
          const rawEarn: EarningRecord[] = [];
          for (const d of snap.docs) {
            const data = d.data();
            let storeName = "Nexa Store";
            try {
              const storeSnap = await getDoc(doc(db, "stores", data.storeId));
              if (storeSnap.exists()) {
                storeName = storeSnap.data().storeName || "Nexa Store";
              }
            } catch (err) {
              console.warn("Failed to fetch store name for earnings:", err);
            }

            rawEarn.push({
              id: d.id,
              agentId: data.agentId,
              referralId: data.referralId,
              storeId: data.storeId,
              subscriptionEventId: data.subscriptionEventId,
              amount: data.amount,
              commissionType: data.commissionType,
              status: data.status,
              timestamp: data.timestamp,
              storeName
            });
          }
          rawEarn.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setEarnings(rawEarn);
        });

        return () => {
          unsubscribeProfile();
          unsubscribeReferrals();
          unsubscribeEarnings();
        };
      } else {
        setAgentProfile(null);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Calculated Earnings Projection
  const calculatedIncome = useMemo(() => {
    let bonus = 0;
    let residual = 0;
    if (calcPlan === "pro") {
      bonus = calcProCount * 1500;
      residual = calcProCount * 500;
    } else if (calcPlan === "enterprise") {
      bonus = calcEntCount * 5000;
      residual = calcEntCount * 1000;
    } else {
      bonus = (calcMixPro * 1500) + (calcMixEnt * 5000);
      residual = (calcMixPro * 500) + (calcMixEnt * 1000);
    }
    const fieldAllowance = 10000;
    const yearTotal = fieldAllowance + bonus + (residual * calcMonths);

    return {
      fieldAllowance,
      bonus,
      residual,
      yearTotal
    };
  }, [calcPlan, calcProCount, calcEntCount, calcMixPro, calcMixEnt, calcMonths]);

  // Copy to clipboard actions
  const copyReferralLink = () => {
    if (!agentProfile) return;
    navigator.clipboard.writeText(agentProfile.referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyReferralCode = () => {
    if (!agentProfile) return;
    navigator.clipboard.writeText(agentProfile.referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const scrollToSection = (id: string) => {
    const el = document.querySelector(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Submit Application
  const handleApplyFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameInput.trim() || !phoneInput.trim() || !stateInput || !lgaInput.trim() || !bankInput || !accountNoInput.trim() || !whyInput.trim()) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions to proceed.");
      return;
    }

    setSubmitting(true);
    try {
      const generatedCode = (customRefCodeInput.trim() || nameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(100 + Math.random() * 900)).toUpperCase();
      const statePrefix = stateInput.substring(0, 3).toUpperCase();
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const agentId = `NEXA-${randomId}-${statePrefix}`;

      // Check if user already logged in or if we generate account
      let userId = currentUser?.uid;

      if (!currentUser) {
        const dummyEmail = emailInput.trim() || `${nameInput.toLowerCase().replace(/[^a-z0-9]/g, "")}.${randomId.toLowerCase()}@nexaagent.ng`;
        const dummyPassword = passwordInput || `NexaPass#${Math.floor(1000 + Math.random() * 9000)}`;

        const userCred = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
        userId = userCred.user.uid;
        await updateProfile(userCred.user, { displayName: nameInput.trim() });
      }

      if (userId) {
        const refLink = `${window.location.origin}/?ref=${generatedCode}`;

        await setDoc(doc(db, "users", userId), {
          id: userId,
          name: nameInput.trim(),
          email: emailInput.trim() || `${nameInput.toLowerCase().replace(/[^a-z0-9]/g, "")}@nexaagent.ng`,
          phone: phoneInput.trim(),
          nin: ninInput.trim(),
          state: stateInput,
          lga: lgaInput.trim(),
          bank: bankInput,
          accountNumber: accountNoInput.trim(),
          whyJoined: whyInput.trim(),
          role: "agent",
          onboardingCompleted: true,
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(db, "agents", userId), {
          agentId,
          fullName: nameInput.trim(),
          email: emailInput.trim() || `${nameInput.toLowerCase().replace(/[^a-z0-9]/g, "")}@nexaagent.ng`,
          phone: phoneInput.trim(),
          nin: ninInput.trim(),
          region: `${stateInput} (${lgaInput.trim()})`,
          state: stateInput,
          lga: lgaInput.trim(),
          bank: bankInput,
          accountNumber: accountNoInput.trim(),
          whyJoined: whyInput.trim(),
          referralCode: generatedCode,
          referralLink: refLink,
          status: "pending",
          commissionRulesApplied: "default",
          earnings: { pending: 0, paid: 0, reversed: 0 },
          createdAt: new Date().toISOString()
        });

        const welcomeMsg = `Welcome, ${nameInput.trim()}! Your application for the NexaStoreOS Growth Partner Program in ${stateInput} (${lgaInput.trim()}) has been received and registered. Your assigned Agent ID is ${agentId}. Your State Lead will reach out to you at ${phoneInput.trim()} within 48 hours to complete orientation and dispatch your ₦10,000 logistics allowance. Welcome to the team! — Nexa Agent Operations Team, Jalingo, Taraba State.`;

        setAppSubmittedSuccess({
          agentId,
          message: welcomeMsg
        });

        toast.success("Agent application submitted successfully!");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      toast.error("Please enter email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      toast.success("Welcome back to NexaStoreOS Agent Workspace!");
      setShowAuthModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Sign Up Handler from Modal
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim() || !phoneInput.trim() || !passwordInput) {
      toast.error("Please fill in Name, Email, Phone, and Password.");
      return;
    }
    if (passwordInput.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const generatedCode = (customRefCodeInput.trim() || nameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(100 + Math.random() * 900)).toUpperCase();
      const stateSelected = stateInput || "Taraba State";
      const statePrefix = stateSelected.substring(0, 3).toUpperCase();
      const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const agentId = `NEXA-${randomId}-${statePrefix}`;

      const userCred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const userId = userCred.user.uid;
      await updateProfile(userCred.user, { displayName: nameInput.trim() });

      const refLink = `${window.location.origin}/?ref=${generatedCode}`;

      await setDoc(doc(db, "users", userId), {
        id: userId,
        name: nameInput.trim(),
        email: emailInput.trim(),
        phone: phoneInput.trim(),
        nin: ninInput.trim() || "",
        state: stateSelected,
        lga: lgaInput.trim() || stateSelected,
        bank: bankInput || "Pending",
        accountNumber: accountNoInput.trim() || "Pending",
        whyJoined: whyInput.trim() || "Growth Partner Agent",
        role: "agent",
        onboardingCompleted: true,
        createdAt: new Date().toISOString()
      });

      await setDoc(doc(db, "agents", userId), {
        agentId,
        fullName: nameInput.trim(),
        email: emailInput.trim(),
        phone: phoneInput.trim(),
        nin: ninInput.trim() || "",
        region: stateSelected,
        state: stateSelected,
        lga: lgaInput.trim() || stateSelected,
        bank: bankInput || "Pending",
        accountNumber: accountNoInput.trim() || "Pending",
        referralCode: generatedCode,
        referralLink: refLink,
        status: "approved",
        commissionRulesApplied: "default_v1",
        earnings: {
          pending: 0,
          paid: 0,
          reversed: 0
        },
        createdAt: new Date().toISOString()
      });

      toast.success("Agent account created successfully! Welcome to your workspace.");
      setShowAuthModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !agentProfile) return;

    if (!settingsName.trim() || !settingsRefCode.trim()) {
      toast.error("Full Name and Referral Code cannot be empty.");
      return;
    }

    const uppercaseCode = settingsRefCode.trim().toUpperCase();

    try {
      if (uppercaseCode !== agentProfile.referralCode) {
        const querySnap = await getDocs(query(collection(db, "agents"), where("referralCode", "==", uppercaseCode)));
        if (!querySnap.empty) {
          toast.error("This referral code is already taken. Please choose another one.");
          return;
        }
      }

      const updatedLink = `${window.location.origin}/?ref=${uppercaseCode}`;

      await updateDoc(doc(db, "users", currentUser.uid), {
        name: settingsName.trim()
      });

      await updateDoc(doc(db, "agents", currentUser.uid), {
        fullName: settingsName.trim(),
        phone: settingsPhone.trim(),
        region: settingsRegion.trim(),
        referralCode: uppercaseCode,
        referralLink: updatedLink
      });

      toast.success("Agent profile settings updated successfully!");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Sign out
  const handleLogout = async () => {
    await signOut(auth);
    setIsSuperAdmin(false);
    toast.success("Logged out successfully.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C1E] flex items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#2B5BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Synchronizing Agent Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C1E] text-[#F1F0FF] font-sans selection:bg-[#2B5BFF]/30 relative overflow-x-hidden">
      
      {/* GRID BG & AMBIENT ORBS */}
      <div className="grid-bg pointer-events-none fixed inset-0 z-0 opacity-80" />
      <div className="ambient pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
      </div>

      {/* NAV */}
      <nav id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <div className="nav-brand" onClick={() => navigate("/")}>
            <div className="nav-logo">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path d="M4 4L10 4L14 12L10 20H4L8 12L4 4Z" fill="white" opacity=".9"/>
                <path d="M12 4H20L16 12L20 20H12L16 12L12 4Z" fill="white" opacity=".5"/>
              </svg>
            </div>
            <span className="nav-name">NexaStoreOS<span> Agent</span></span>
            <span className="nav-tag">Growth Partner</span>
          </div>

          <ul className="nav-links hidden md:flex">
            <li><button onClick={() => scrollToSection("#income")} className="cursor-pointer">Income</button></li>
            <li><button onClick={() => scrollToSection("#commissions")} className="cursor-pointer">Commissions</button></li>
            <li><button onClick={() => scrollToSection("#how-it-works")} className="cursor-pointer">How It Works</button></li>
            <li><button onClick={() => scrollToSection("#terms")} className="cursor-pointer">T&amp;Cs</button></li>
            <li><button onClick={() => scrollToSection("#faq")} className="cursor-pointer">FAQ</button></li>
          </ul>

          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <Button 
                onClick={() => navigate("/agents")}
                className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs rounded-full px-3 py-1"
              >
                Super Admin
              </Button>
            )}

            {currentUser ? (
              <Button onClick={handleLogout} variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs rounded-full">
                Sign Out ({agentProfile?.fullName.split(" ")[0] || "Agent"})
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    showAuthModal && authTab === "login"
                      ? "text-white bg-white/20"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => {
                    setAuthTab("login");
                    setShowAuthModal(true);
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="nav-cta text-xs px-4 py-1.5 font-bold rounded-full bg-gradient-to-r from-[#2B5BFF] to-[#00C4CF] text-white hover:opacity-90 transition-all cursor-pointer shadow-md"
                  onClick={() => {
                    setAuthTab("register");
                    setShowAuthModal(true);
                  }}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* RENDER VIEW: IF NOT LOGGED IN OR LANDING PAGE VIEW */}
      {!currentUser ? (
        <div className="relative z-10 space-y-0">
          
          {/* HERO SECTION */}
          <section className="hero" id="hero">
            <div className="hs hs1" /><div className="hs hs2" /><div className="hs hs3" /><div className="hs hs4" />
            
            <div className="hero-kicker">
              <span className="hk-live" />Agent Portal Open · Applications Live · Nigeria-Wide
            </div>

            <h1 className="xl tw text-center">
              Earn Lifetime<br />
              Residual Income<br />
              <span className="gg">Selling NexaOS.</span>
            </h1>

            <p className="body-l text-center max-w-2xl mx-auto mt-6 mb-10">
              Become a NexaStoreOS Growth Partner. Onboard local retailers, collect bonuses instantly, and earn ₦500–₦1,000 per merchant every month — forever — while they stay subscribed.
            </p>

            <div className="hero-btns flex flex-wrap justify-center gap-4 mb-20">
              <button className="btn btn-green cursor-pointer" onClick={() => scrollToSection("#apply")}>
                <Rocket className="h-4 w-4 inline" />Apply as Field Agent
              </button>
              <button className="btn btn-ghost cursor-pointer" onClick={() => scrollToSection("#income")}>
                See Income Potential →
              </button>
            </div>

            {/* AGENT WALLET DASHBOARD (3D TILT) */}
            <div className="hero-wallet-scene w-full max-w-5xl mx-auto relative perspective-1200">
              <div ref={walletCardRef} className="wallet-3d transition-transform duration-300">
                <div className="wallet-frame bg-[#141528] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  
                  {/* TOPBAR */}
                  <div className="wf-topbar grid grid-cols-3 items-center px-6 py-4 bg-white/[0.02] border-b border-white/10 text-xs">
                    <div className="wf-brand font-black text-white">NexaStoreOS<span className="text-[#00C4CF]"> Agent</span></div>
                    <div className="wf-title text-center text-slate-400 font-medium">Growth Partner Dashboard · Field Agent Portal</div>
                    <div className="wf-status flex items-center justify-end gap-1.5 text-emerald-400 font-semibold">
                      <span className="wf-live" />Live · Synced
                    </div>
                  </div>

                  {/* BODY */}
                  <div className="wf-body grid md:grid-cols-[260px_1fr] min-h-[420px]">
                    
                    {/* SIDEBAR */}
                    <div className="wf-side bg-white/[0.018] border-r border-white/10 p-5 flex flex-col gap-3">
                      <div className="wfs-agent p-3.5 rounded-xl bg-gradient-to-br from-[#2B5BFF]/15 to-[#00C4CF]/5 border border-[#2B5BFF]/20">
                        <div className="wfs-avatar w-9 h-9 rounded-full bg-gradient-to-br from-[#2B5BFF] to-[#00C4CF] flex items-center justify-center text-base mb-2"><UserIcon className="h-4 w-4" /></div>
                        <div className="wfs-name font-bold text-white text-sm">Aminu Lawal</div>
                        <div className="wfs-id font-mono text-[10px] text-[#00C4CF] tracking-wider">ID: LAGOSDEALS-2024</div>
                        <div className="wfs-state text-[10px] text-slate-400 mt-0.5">Taraba State · Field Agent</div>
                      </div>

                      <div className="wf-nav flex flex-col gap-1 text-xs">
                        <div className="wfn on flex items-center gap-2 p-2.5 rounded-lg bg-[#2B5BFF]/15 text-[#7B9FFF] border border-[#2B5BFF]/20 font-semibold">
                          <span className="wfn-ico wi-g font-bold">₦</span>Earnings
                        </div>
                        <div className="wfn flex items-center gap-2 p-2.5 rounded-lg text-slate-300 hover:bg-white/5">
                          <Users className="h-4 w-4" />My Merchants
                        </div>
                        <div className="wfn flex items-center gap-2 p-2.5 rounded-lg text-slate-300 hover:bg-white/5">
                          <BarChart3 className="h-4 w-4" />Performance
                        </div>
                        <div className="wfn flex items-center gap-2 p-2.5 rounded-lg text-slate-300 hover:bg-white/5">
                          <Link className="h-4 w-4" />Referral Link
                        </div>
                        <div className="wfn flex items-center gap-2 p-2.5 rounded-lg text-slate-300 hover:bg-white/5">
                          <ClipboardList className="h-4 w-4" />Disbursements
                        </div>
                      </div>
                    </div>

                    {/* MAIN DASHBOARD PREVIEW */}
                    <div className="wf-main p-6 space-y-5">
                      <div className="wfm-head flex justify-between items-start">
                        <div>
                          <div className="wfm-title font-bold text-white text-base">Earnings Dashboard</div>
                          <div className="wfm-sub text-xs text-slate-400">Aminu Lawal · July 2025</div>
                        </div>
                        <span className="wfm-month bg-emerald-500/10 border border-emerald-500/20 text-[#4DE89A] px-3 py-1 rounded-full text-xs font-bold">
                          July 2025
                        </span>
                      </div>

                      {/* KPI ROW */}
                      <div className="income-row grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="ic bg-white/[0.04] border border-white/10 rounded-xl p-3">
                          <div className="ic-lbl text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Total Earnings</div>
                          <div className="ic-val font-mono text-base font-bold text-white">₦47,500</div>
                          <span className="ic-delta up text-[9px] font-bold bg-emerald-500/10 text-[#4DE89A] px-1.5 py-0.5 rounded-full">↑ +23%</span>
                        </div>
                        <div className="ic bg-white/[0.04] border border-white/10 rounded-xl p-3">
                          <div className="ic-lbl text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Active Merchants</div>
                          <div className="ic-val font-mono text-base font-bold text-white">38</div>
                          <span className="ic-delta up text-[9px] font-bold bg-emerald-500/10 text-[#4DE89A] px-1.5 py-0.5 rounded-full">+6 this month</span>
                        </div>
                        <div className="ic bg-white/[0.04] border border-white/10 rounded-xl p-3">
                          <div className="ic-lbl text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Monthly Residuals</div>
                          <div className="ic-val font-mono text-base font-bold text-white">₦22,000</div>
                          <span className="ic-delta up text-[9px] font-bold bg-emerald-500/10 text-[#4DE89A] px-1.5 py-0.5 rounded-full">↑ +₦3,000</span>
                        </div>
                        <div className="ic bg-white/[0.04] border border-white/10 rounded-xl p-3">
                          <div className="ic-lbl text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Field Allowance</div>
                          <div className="ic-val font-mono text-base font-bold text-white">₦10,000</div>
                          <span className="ic-delta neutral text-[9px] font-bold bg-blue-500/10 text-[#7B9FFF] px-1.5 py-0.5 rounded-full">Paid <Check className="h-3 w-3 inline" /></span>
                        </div>
                      </div>

                      {/* TRANSACTION LEDGER */}
                      <div className="ledger bg-white/[0.025] border border-white/10 rounded-xl">
                        <div className="ledger-head flex justify-between items-center p-3 border-b border-white/10 text-xs font-bold text-slate-300">
                          <span>Transaction Ledger</span>
                          <span className="text-[10px] text-slate-400 font-normal">July 2025</span>
                        </div>
                        <div className="ledger-body text-xs divide-y divide-white/5">
                          <div className="l-row flex items-center p-2.5">
                            <span className="l-type l-green" />
                            <span className="l-desc text-slate-200 font-medium flex-1 pl-2">Merchant Onboarding Bonus — Hassan Bala Store</span>
                            <span className="l-code font-mono text-[10px] text-slate-400 px-3">TXN-00481</span>
                            <span className="l-amount pos font-mono font-bold text-[#4DE89A]">+₦1,500</span>
                          </div>
                          <div className="l-row flex items-center p-2.5">
                            <span className="l-type l-blue" />
                            <span className="l-desc text-slate-200 font-medium flex-1 pl-2">Monthly Residual — 22 Pro Plan Merchants</span>
                            <span className="l-code font-mono text-[10px] text-slate-400 px-3">RES-07-PRO</span>
                            <span className="l-amount pos font-mono font-bold text-[#4DE89A]">+₦11,000</span>
                          </div>
                          <div className="l-row flex items-center p-2.5">
                            <span className="l-type l-blue" />
                            <span className="l-desc text-slate-200 font-medium flex-1 pl-2">Monthly Residual — 10 Pro Plan Merchants</span>
                            <span className="l-code font-mono text-[10px] text-slate-400 px-3">RES-07-PRO</span>
                            <span className="l-amount pos font-mono font-bold text-[#4DE89A]">+₦5,000</span>
                          </div>
                          <div className="l-row flex items-center p-2.5">
                            <span className="l-type l-amber" />
                            <span className="l-desc text-slate-200 font-medium flex-1 pl-2">Enterprise Onboarding — Jalingo Superstore</span>
                            <span className="l-code font-mono text-[10px] text-slate-400 px-3">ENT-00092</span>
                            <span className="l-amount pos font-mono font-bold text-[#4DE89A]">+₦5,000</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              {/* FLOATING NOTIFS */}
              <div className="wf-notif wn1 hidden lg:flex">
                <Banknote className="h-4 w-4" />
                <div>
                  <div className="wno-txt text-[10px] text-slate-400">Bonus credited</div>
                  <div className="wno-val wno-green font-mono font-bold text-xs text-[#4DE89A]">+₦1,500 onboarding</div>
                </div>
              </div>
              <div className="wf-notif wn2 hidden lg:flex">
                <Calendar className="h-4 w-4" />
                <div>
                  <div className="wno-txt text-[10px] text-slate-400">Monthly settlement</div>
                  <div className="wno-val font-mono font-bold text-xs text-white">₦22,000 — Aug 1st</div>
                </div>
              </div>
              <div className="wf-notif wn3 hidden lg:flex">
                <Sparkles className="h-4 w-4" />
                <div>
                  <div className="wno-txt text-[10px] text-slate-400">New merchant onboarded</div>
                  <div className="wno-val wno-blue font-mono font-bold text-xs text-[#7B9FFF]">Fatima's Store <Check className="h-3 w-3 inline" /></div>
                </div>
              </div>
            </div>
          </section>

          {/* PROOF STRIP */}
          <div className="proof-strip my-12">
            <div className="proof-inner">
              <div className="proof-item"><div className="proof-num" style={{ color: "#4DE89A" }}>₦10k</div><div className="proof-lbl">Field allowance on verification</div></div>
              <div className="proof-sep" />
              <div className="proof-item"><div className="proof-num" style={{ color: "#7B9FFF" }}>₦1,500</div><div className="proof-lbl">Per Pro/Basic onboarding bonus</div></div>
              <div className="proof-sep" />
              <div className="proof-item"><div className="proof-num" style={{ color: "#F5C842" }}>₦5,000</div><div className="proof-lbl">Per Enterprise onboarding bonus</div></div>
              <div className="proof-sep" />
              <div className="proof-item"><div className="proof-num" style={{ color: "#4DE89A" }}>₦500/mo</div><div className="proof-lbl">Residual per Pro merchant forever</div></div>
              <div className="proof-sep" />
              <div className="proof-item"><div className="proof-num" style={{ color: "#4DD9E0" }}>₦1k/mo</div><div className="proof-lbl">Residual per Enterprise merchant</div></div>
              <div className="proof-sep" />
              <div className="proof-item"><div className="proof-num" style={{ color: "#fff" }}>1st</div><div className="proof-lbl">Monthly bank transfer date</div></div>
            </div>
          </div>

          {/* INCOME CALCULATOR */}
          <section className="sec" id="income">
            <div className="wrap">
              <div className="center text-center mb-12">
                <div className="eye eye-g inline-flex items-center gap-2"><span className="ey-dot" />Income Calculator</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  Calculate Your<br /><span className="gg">Monthly Earnings.</span>
                </h2>
                <p className="body-m text-slate-400 max-w-xl mx-auto mt-3">
                  Move the sliders to see exactly how much you'll earn based on the merchants you onboard and the plans they choose.
                </p>
              </div>

              <div className="calc-wrap max-w-5xl mx-auto">
                <div className="calc-grid grid md:grid-cols-2 gap-10 items-start">
                  
                  {/* INPUTS */}
                  <div className="calc-inputs space-y-6">
                    <div className="plan-toggle flex gap-2">
                      <button 
                        className={`pt-btn flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${calcPlan === "pro" ? "on bg-[#2B5BFF]/15 border-[#2B5BFF]/40 text-[#7B9FFF]" : "border-white/10 text-slate-400"}`}
                        onClick={() => setCalcPlan("pro")}
                      >
                        Pro / Basic Plan
                      </button>
                      <button 
                        className={`pt-btn flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${calcPlan === "enterprise" ? "on bg-[#2B5BFF]/15 border-[#2B5BFF]/40 text-[#7B9FFF]" : "border-white/10 text-slate-400"}`}
                        onClick={() => setCalcPlan("enterprise")}
                      >
                        Enterprise Plan
                      </button>
                      <button 
                        className={`pt-btn flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${calcPlan === "mix" ? "on bg-[#2B5BFF]/15 border-[#2B5BFF]/40 text-[#7B9FFF]" : "border-white/10 text-slate-400"}`}
                        onClick={() => setCalcPlan("mix")}
                      >
                        Mixed Plans
                      </button>
                    </div>

                    {calcPlan === "pro" && (
                      <div className="calc-input-group space-y-2">
                        <div className="calc-label flex justify-between text-xs font-bold text-slate-300">
                          <span>Pro/Basic Merchants Onboarded</span>
                          <span className="calc-val-display font-mono text-[#00C4CF]">{calcProCount} Stores</span>
                        </div>
                        <input 
                          type="range" min="1" max="100" value={calcProCount} 
                          onChange={(e) => setCalcProCount(parseInt(e.target.value))}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2B5BFF]"
                        />
                      </div>
                    )}

                    {calcPlan === "enterprise" && (
                      <div className="calc-input-group space-y-2">
                        <div className="calc-label flex justify-between text-xs font-bold text-slate-300">
                          <span>Enterprise Merchants Onboarded</span>
                          <span className="calc-val-display font-mono text-[#00C4CF]">{calcEntCount} Stores</span>
                        </div>
                        <input 
                          type="range" min="1" max="30" value={calcEntCount} 
                          onChange={(e) => setCalcEntCount(parseInt(e.target.value))}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2B5BFF]"
                        />
                      </div>
                    )}

                    {calcPlan === "mix" && (
                      <div className="space-y-4">
                        <div className="calc-input-group space-y-2">
                          <div className="calc-label flex justify-between text-xs font-bold text-slate-300">
                            <span>Pro/Basic Merchants</span>
                            <span className="calc-val-display font-mono text-[#00C4CF]">{calcMixPro} Stores</span>
                          </div>
                          <input 
                            type="range" min="1" max="80" value={calcMixPro} 
                            onChange={(e) => setCalcMixPro(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2B5BFF]"
                          />
                        </div>

                        <div className="calc-input-group space-y-2">
                          <div className="calc-label flex justify-between text-xs font-bold text-slate-300">
                            <span>Enterprise Merchants</span>
                            <span className="calc-val-display font-mono text-[#00C4CF]">{calcMixEnt} Stores</span>
                          </div>
                          <input 
                            type="range" min="1" max="20" value={calcMixEnt} 
                            onChange={(e) => setCalcMixEnt(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2B5BFF]"
                          />
                        </div>
                      </div>
                    )}

                    <div className="calc-input-group space-y-2">
                      <div className="calc-label flex justify-between text-xs font-bold text-slate-300">
                        <span>Months Active (for residual projection)</span>
                        <span className="calc-val-display font-mono text-[#00C4CF]">{calcMonths} Months</span>
                      </div>
                      <input 
                        type="range" min="1" max="36" value={calcMonths} 
                        onChange={(e) => setCalcMonths(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#2B5BFF]"
                      />
                    </div>

                    <div className="bg-[#2B5BFF]/10 border border-[#2B5BFF]/20 rounded-xl p-4">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Your Referral Code Preview</div>
                      <div className="font-mono text-base font-bold text-[#00C4CF] tracking-widest">
                        NEXAAGENT-FIELD2025
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">Generated upon registration — unique to you</div>
                    </div>
                  </div>

                  {/* RESULT PANEL */}
                  <div className="income-panel bg-[#0F1020] border border-emerald-500/20 rounded-2xl p-6 space-y-5">
                    <div className="ip-title text-xs font-bold text-slate-400 uppercase tracking-wider">Projected Monthly Residual</div>
                    <div className="ip-main-val font-mono text-4xl font-bold text-[#4DE89A]">
                      ₦{calculatedIncome.residual.toLocaleString()}
                    </div>
                    <div className="ip-main-lbl text-xs text-slate-400">Per month (at full residual maturity)</div>

                    <div className="ip-rows space-y-2 text-xs">
                      <div className="ip-row flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="ip-row-lbl text-slate-300"><Gift className="h-4 w-4 inline mr-1" />Field Logistics Allowance</span>
                        <span className="ip-row-val green font-mono font-bold text-[#4DE89A]">₦10,000</span>
                      </div>
                      <div className="ip-row flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="ip-row-lbl text-slate-300"><Zap className="h-4 w-4 inline mr-1" />One-time Onboarding Bonuses</span>
                        <span className="ip-row-val font-mono font-bold text-white">₦{calculatedIncome.bonus.toLocaleString()}</span>
                      </div>
                      <div className="ip-row flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="ip-row-lbl text-slate-300"><RefreshCw className="h-4 w-4 inline mr-1" />Monthly Residual Income</span>
                        <span className="ip-row-val green font-mono font-bold text-[#4DE89A]">₦{calculatedIncome.residual.toLocaleString()}</span>
                      </div>
                      <div className="ip-row flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5">
                        <span className="ip-row-lbl text-slate-300"><Calendar className="h-4 w-4 inline mr-1" />Settlement Date</span>
                        <span className="ip-row-val font-mono font-bold text-white">1st of every month</span>
                      </div>
                    </div>

                    <div className="ip-year bg-[#2B5BFF]/10 border border-[#2B5BFF]/20 rounded-xl p-4 text-center">
                      <div className="ip-year-lbl text-[10px] text-slate-400 mb-1">Projected First-Year Total Earnings</div>
                      <div className="ip-year-val font-mono text-2xl font-bold text-[#7B9FFF]">
                        ₦{calculatedIncome.yearTotal.toLocaleString()}
                      </div>
                    </div>

                    <button className="btn btn-green w-full py-3.5 text-sm cursor-pointer" onClick={() => scrollToSection("#apply")}>
                      Apply Now — Start Earning
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* COMMISSIONS TABLE & ALLOWANCE */}
          <section className="sec" id="commissions">
            <div className="wrap max-w-5xl mx-auto">
              <div className="center text-center mb-12">
                <div className="eye eye-a inline-flex items-center gap-2"><span className="ey-dot" />Commission Structure</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  Every Merchant You<br />Onboard <span className="gp">Pays You Forever.</span>
                </h2>
                <p className="body-m text-slate-400 max-w-xl mx-auto mt-3">
                  Fixed bonuses on signup. Monthly residuals for the lifetime of the merchant's subscription. No cap. No expiry.
                </p>
              </div>

              {/* TABLE */}
              <div className="comm-table bg-[#141528] border border-white/10 rounded-2xl overflow-hidden mb-12">
                <div className="ct-head grid grid-cols-4 p-4 bg-white/5 border-b border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div>Plan Type</div><div>Onboarding Bonus</div><div>Monthly Residual</div><div>Annual Residual</div>
                </div>
                <div className="ct-row grid grid-cols-4 p-5 border-b border-white/5 items-center">
                  <div>
                    <div className="ct-plan font-bold text-white text-base">Pro / Basic Plan</div>
                    <div className="ct-plan-sub text-xs text-slate-400">Standard retail &amp; provision stores</div>
                  </div>
                  <div>
                    <div className="ct-val blue font-mono font-bold text-[#7B9FFF] text-base">₦1,500</div>
                    <div className="text-[10px] text-slate-400">One-time on first payment</div>
                  </div>
                  <div>
                    <div className="ct-val green font-mono font-bold text-[#4DE89A] text-base">₦500/mo</div>
                    <div className="text-[10px] text-slate-400">Lifetime while subscribed</div>
                  </div>
                  <div>
                    <div className="ct-val font-mono font-bold text-[#F5C842] text-base">₦6,000</div>
                    <div className="text-[10px] text-slate-400">Per merchant per year</div>
                  </div>
                </div>

                <div className="ct-row grid grid-cols-4 p-5 items-center bg-[#2B5BFF]/5">
                  <div>
                    <div className="ct-plan font-bold text-white text-base">Enterprise Plan</div>
                    <div className="ct-plan-sub text-xs text-slate-400">Warehouses, chains &amp; multi-branch</div>
                  </div>
                  <div>
                    <div className="ct-val blue font-mono font-bold text-[#7B9FFF] text-base">₦5,000</div>
                    <div className="text-[10px] text-slate-400">One-time on activation</div>
                  </div>
                  <div>
                    <div className="ct-val green font-mono font-bold text-[#4DE89A] text-base">₦1,000/mo</div>
                    <div className="text-[10px] text-slate-400">Lifetime while subscribed</div>
                  </div>
                  <div>
                    <div className="ct-val font-mono font-bold text-[#F5C842] text-base">₦12,000</div>
                    <div className="text-[10px] text-slate-400">Per merchant per year</div>
                  </div>
                </div>
              </div>

              {/* ALLOWANCE CARD */}
              <div className="allowance-card bg-gradient-to-br from-[#2B5BFF]/12 to-[#6E40C9]/8 border border-[#2B5BFF]/20 rounded-3xl p-8 mb-12">
                <div className="ac-grid grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="eye eye-v inline-flex items-center gap-2 mb-3"><span className="ey-dot" />Logistics Allowance</div>
                    <div className="ac-val font-mono text-5xl font-bold text-[#7B9FFF] mb-1">₦10,000</div>
                    <div className="ac-label text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Fixed Field Logistics Allowance</div>
                    <div className="ac-list space-y-3 text-sm text-slate-300">
                      <div className="ac-item flex items-center gap-3"><CheckCircle className="h-4 w-4 inline text-[#7B9FFF]" />Paid upon successful field profile verification by your State Lead</div>
                      <div className="ac-item flex items-center gap-3"><CheckCircle className="h-4 w-4 inline text-[#7B9FFF]" />Covers transportation costs to merchant locations</div>
                      <div className="ac-item flex items-center gap-3"><CheckCircle className="h-4 w-4 inline text-[#7B9FFF]" />Covers printing of promotional materials &amp; brochures</div>
                      <div className="ac-item flex items-center gap-3"><CheckCircle className="h-4 w-4 inline text-[#7B9FFF]" />Covers mobile data subscriptions for demo sessions</div>
                      <div className="ac-item flex items-center gap-3"><CheckCircle className="h-4 w-4 inline text-[#7B9FFF]" />One-time disbursement — separate from commissions</div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Verification Requirements</div>
                    <div className="t-items space-y-2 text-xs">
                      <div className="t-item p-3 bg-white/5 rounded-xl flex gap-3"><div className="t-ico-b text-[#7B9FFF] font-bold">1</div><div>Complete online agent registration form</div></div>
                      <div className="t-item p-3 bg-white/5 rounded-xl flex gap-3"><div className="t-ico-b text-[#7B9FFF] font-bold">2</div><div>Submit valid Nigerian national ID or NIN slip</div></div>
                      <div className="t-item p-3 bg-white/5 rounded-xl flex gap-3"><div className="t-ico-b text-[#7B9FFF] font-bold">3</div><div>Attend mandatory State Lead orientation session</div></div>
                      <div className="t-item p-3 bg-white/5 rounded-xl flex gap-3"><div className="t-ico-b text-[#7B9FFF] font-bold">4</div><div>Submit active Nigerian bank account details</div></div>
                      <div className="t-item p-3 bg-white/5 rounded-xl flex gap-3"><div className="t-ico-b text-[#7B9FFF] font-bold">5</div><div>Allowance disbursed within 3–5 business days of approval</div></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE CARDS */}
              <div className="disburse-timeline grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="dt-card bg-[#141528] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                  <div className="dt-ico text-3xl"><Landmark className="h-8 w-8" /></div>
                  <div className="dt-title font-bold text-white text-sm">Bank Transfer</div>
                  <div className="dt-body text-xs text-slate-400">Direct electronic bank transfer to your verified Nigerian bank account. No cash. No delays.</div>
                  <div className="dt-date font-mono text-xs text-[#4DE89A] font-bold">Secure &amp; Instant</div>
                </div>
                <div className="dt-card bg-[#141528] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                  <div className="dt-ico text-3xl"><Calendar className="h-8 w-8" /></div>
                  <div className="dt-title font-bold text-white text-sm">Monthly Settlement</div>
                  <div className="dt-body text-xs text-slate-400">All monthly residuals and pending bonuses are settled on the 1st day of every month.</div>
                  <div className="dt-date font-mono text-xs text-[#4DE89A] font-bold">1st of Every Month</div>
                </div>
                <div className="dt-card bg-[#141528] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                  <div className="dt-ico text-3xl"><Zap className="h-8 w-8" /></div>
                  <div className="dt-title font-bold text-white text-sm">Instant Bonuses</div>
                  <div className="dt-body text-xs text-slate-400">Onboarding bonuses (₦1,500 / ₦5,000) are queued immediately upon merchant verification.</div>
                  <div className="dt-date font-mono text-xs text-[#4DE89A] font-bold">Within 24–48 Hours</div>
                </div>
                <div className="dt-card bg-[#141528] border border-white/10 rounded-2xl p-6 text-center space-y-3">
                  <div className="dt-ico text-3xl"><Shield className="h-8 w-8" /></div>
                  <div className="dt-title font-bold text-white text-sm">Verified Accounts Only</div>
                  <div className="dt-body text-xs text-slate-400">Bank details verified by State Lead before first disbursement. NIN + account number required.</div>
                  <div className="dt-date font-mono text-xs text-[#4DE89A] font-bold">Secure &amp; Compliant</div>
                </div>
              </div>

            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="sec" id="how-it-works">
            <div className="wrap max-w-5xl mx-auto">
              <div className="center text-center mb-12">
                <div className="eye eye-t inline-flex items-center gap-2"><span className="ey-dot" />Mode of Operation</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  How the Agent<br /><span className="gb">Program Works.</span>
                </h2>
                <p className="body-m text-slate-400 max-w-xl mx-auto mt-3">
                  Five clear steps from registration to your first bank transfer. Every step is supported by your State Lead.
                </p>
              </div>

              <div className="steps-row grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center mb-16">
                <div className="step space-y-3">
                  <div className="step-circle s-1 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl border border-white/10 bg-[#2B5BFF]/20"><FileEdit className="h-6 w-6" /></div>
                  <div className="step-title font-bold text-white text-sm">1. Apply Online</div>
                  <div className="step-body text-xs text-slate-400">Fill in the agent application form with NIN, bank details, and state.</div>
                </div>
                <div className="step space-y-3">
                  <div className="step-circle s-2 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl border border-white/10 bg-[#00C4CF]/20"><CheckCircle className="h-6 w-6" /></div>
                  <div className="step-title font-bold text-white text-sm">2. State Lead Verifies</div>
                  <div className="step-body text-xs text-slate-400">State Lead reviews application &amp; conducts orientation within 48 hours.</div>
                </div>
                <div className="step space-y-3">
                  <div className="step-circle s-3 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl border border-white/10 bg-[#12D176]/20">₦</div>
                  <div className="step-title font-bold text-white text-sm">3. Receive ₦10k Allowance</div>
                  <div className="step-body text-xs text-slate-400">₦10,000 field logistics allowance transferred to your account in 3–5 days.</div>
                </div>
                <div className="step space-y-3">
                  <div className="step-circle s-4 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl border border-white/10 bg-[#F5A623]/20"><Store className="h-6 w-6" /></div>
                  <div className="step-title font-bold text-white text-sm">4. Onboard Merchants</div>
                  <div className="step-body text-xs text-slate-400">Visit retailers, demo NexaStoreOS, and help them subscribe.</div>
                </div>
                <div className="step space-y-3">
                  <div className="step-circle s-5 w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl border border-white/10 bg-[#12D176]/30"><RefreshCw className="h-6 w-6" /></div>
                  <div className="step-title font-bold text-white text-sm">5. Earn Every Month</div>
                  <div className="step-body text-xs text-slate-400">Earn ₦500–₦1,000 per merchant every month. Automatically. Forever.</div>
                </div>
              </div>

              {/* CODE OF CONDUCT */}
              <div className="space-y-6">
                <div className="text-center">
                  <div className="eye eye-b inline-flex items-center gap-2 mb-2"><span className="ey-dot" />Agent Code of Conduct</div>
                  <h3 className="md tw text-2xl font-extrabold">What's Expected of Every Growth Partner.</h3>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <Handshake className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">Honest Representation</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">Always represent NexaStoreOS accurately. Do not make income claims or promises not contained in official materials.</p>
                  </div>
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <BarChart3 className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">Active Field Engagement</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">Conduct at least 4 merchant visits per week and maintain active WhatsApp communication with your State Lead.</p>
                  </div>
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <Lock className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">Data Confidentiality</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">All merchant information and Nexa business data shared with agents is strictly confidential.</p>
                  </div>
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <Smartphone className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">Merchant Onboarding Support</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">Assist each onboarded merchant through their first login, basic product setup, and first sales entry.</p>
                  </div>
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <Ban className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">No Unauthorized Sub-Agents</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">Agents may not recruit or pay sub-agents without explicit written authorization from a Regional Manager.</p>
                  </div>
                  <div className="bg-[#141528] border border-white/10 rounded-2xl p-6 space-y-3">
                    <ClipboardList className="h-8 w-8" />
                    <div className="sm tw font-bold text-white text-base">Weekly Activity Reporting</div>
                    <p className="body-s text-xs text-slate-400 leading-relaxed">Submit a weekly field activity report via the agent portal every Friday before 6 PM.</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* TERMS & CONDITIONS LEGAL AGREEMENT */}
          <section className="sec" id="terms">
            <div className="wrap max-w-5xl mx-auto">
              <div className="center text-center mb-12">
                <div className="eye eye-r inline-flex items-center gap-2"><span className="ey-dot" />Legal Agreement</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  Terms &amp; <span className="gv">Conditions.</span>
                </h2>
                <p className="body-m text-slate-400 max-w-xl mx-auto mt-3">
                  Please read the full Agent Partnership Agreement before applying. By submitting your application, you agree to all terms below.
                </p>
              </div>

              <div className="terms-wrap bg-[#141528] border border-white/10 rounded-3xl overflow-hidden">
                <div className="terms-header p-6 bg-white/[0.02] border-b border-white/10">
                  <div className="terms-title text-xl font-extrabold text-white">NexaStoreOS Growth Partner Agent Agreement</div>
                  <div className="terms-sub text-xs text-slate-400 mt-1">Nexa Digital Solutions LTD · Jalingo, Taraba State, Nigeria</div>
                  <div className="terms-version font-mono text-[10px] text-[#00C4CF] mt-1">Version 1.0 · Effective: 2025 · RC: Federal Republic of Nigeria</div>
                </div>

                <div className="terms-body p-8 space-y-8 text-xs text-slate-300 leading-relaxed">
                  
                  {/* SECTION 1 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 01</div>
                    <div className="t-section-title font-bold text-white text-base">Definitions &amp; Parties</div>
                    <p>
                      In this Agreement: <strong className="text-white">"Company"</strong> refers to Nexa Digital Solutions LTD, a duly registered Nigerian limited liability company located at Lamurde Street, Barade, Jalingo, Taraba State. <strong className="text-white">"Agent"</strong> or <strong className="text-white">"Growth Partner"</strong> refers to any individual accepted into the NexaStoreOS Field Agent Program. <strong className="text-white">"Merchant"</strong> refers to any retail business subscribing to NexaStoreOS through the Agent's referral.
                    </p>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#4DE89A]">
                      This agreement governs your relationship with Nexa Digital Solutions LTD as an independent field agent — not as an employee or partner of the Company.
                    </div>
                  </div>

                  {/* SECTION 2 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 02</div>
                    <div className="t-section-title font-bold text-white text-base">Field Logistics Allowance (₦10,000)</div>
                    <p>
                      The Company shall pay a one-time fixed Field Logistics Allowance of ₦10,000 to each verified Agent upon successful completion of the verification and orientation process.
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc text-slate-300">
                      <li><strong>Eligibility:</strong> Complete online registration, submit NIN, and attend mandatory State Lead orientation.</li>
                      <li><strong>Purpose:</strong> Transport, promotional printing, and mobile internet data for demos.</li>
                      <li><strong>Timeline:</strong> Disbursed within 3–5 working days of approval.</li>
                    </ul>
                  </div>

                  {/* SECTION 3 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 03</div>
                    <div className="t-section-title font-bold text-white text-base">Merchant Onboarding Bonuses</div>
                    <p>
                      Upon each merchant's first subscription payment, the Agent responsible receives a one-time activation bonus: <strong>₦1,500</strong> for Pro/Basic plans and <strong>₦5,000</strong> for Enterprise plans.
                    </p>
                  </div>

                  {/* SECTION 4 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 04</div>
                    <div className="t-section-title font-bold text-white text-base">Monthly Recurring Residuals</div>
                    <p>
                      Agents earn a monthly recurring residual income for every active paying merchant: <strong>₦500/month</strong> for Pro/Basic merchants and <strong>₦1,000/month</strong> for Enterprise merchants, for life.
                    </p>
                  </div>

                  {/* SECTION 5 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 05</div>
                    <div className="t-section-title font-bold text-white text-base">Disbursement Cycle &amp; Payment Terms</div>
                    <p>
                      All earnings are settled monthly on the <strong>1st day of every month</strong> via direct bank transfer to verified Nigerian commercial bank accounts.
                    </p>
                  </div>

                  {/* SECTION 6 */}
                  <div className="t-section border-b border-white/10 pb-6 space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 06</div>
                    <div className="t-section-title font-bold text-white text-base">Agent Conduct &amp; Program Integrity</div>
                    <p>
                      Agents must represent NexaStoreOS honestly, submit weekly reports, and refrain from fraudulent registrations. Fraud results in immediate termination and forfeiture of pending earnings.
                    </p>
                  </div>

                  {/* SECTION 7 & 8 */}
                  <div className="t-section space-y-3">
                    <div className="t-section-num font-mono text-[11px] text-[#7B9FFF] font-bold">SECTION 07 &amp; 08</div>
                    <div className="t-section-title font-bold text-white text-base">Termination &amp; Governing Law</div>
                    <p>
                      Either party may terminate with 14 days notice. Governed by the laws of the Federal Republic of Nigeria.
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="sec" id="faq">
            <div className="wrap max-w-4xl mx-auto">
              <div className="center text-center mb-12">
                <div className="eye eye-t inline-flex items-center gap-2"><span className="ey-dot" />Frequently Asked Questions</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  Agent Program <span className="gb">FAQ.</span>
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  { q: "How soon do I get the ₦10,000 field allowance?", a: "Within 3–5 working days after your State Lead confirms your verification and you have attended the mandatory orientation session." },
                  { q: "Do my residuals ever expire or stop?", a: "No. Your monthly residuals are lifetime passive income tied to each merchant's active subscription." },
                  { q: "What if a merchant I onboarded cancels their subscription?", a: "If a merchant cancels, their monthly residual contribution stops from the next billing cycle. Your other merchants are not affected." },
                  { q: "Can I be an agent in multiple states?", a: "Yes. However, you will only receive one Field Logistics Allowance in total — not one per state." },
                  { q: "How many merchants do I need to onboard to be successful?", a: "There's no minimum. As a guide: 20 active Pro merchants = ₦10,000/month in residuals alone. Top agents onboard 5–8 merchants per month." },
                  { q: "Is there a cost to join the agent program?", a: "Absolutely not. Joining the NexaStoreOS Growth Partner Program is completely free. We pay you!" },
                  { q: "When Data/Money is transferred to my account?", a: "Monthly residuals and pending bonuses are settled on the 1st day of every calendar month via direct bank transfer." }
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#141528] border border-white/10 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left font-semibold text-sm text-slate-200 hover:text-white"
                    >
                      <span>{item.q}</span>
                      <span className="text-lg font-bold text-[#2B5BFF]">{openFaq === idx ? "−" : "+"}</span>
                    </button>
                    {openFaq === idx && (
                      <div className="p-4 pt-0 text-xs text-slate-400 border-t border-white/5 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* APPLICATION FORM SECTION */}
          <section className="sec" id="apply">
            <div className="wrap max-w-4xl mx-auto">
              <div className="center text-center mb-12">
                <div className="eye eye-g inline-flex items-center gap-2"><span className="ey-dot" />Join the Program</div>
                <h2 className="lg tw text-3xl md:text-5xl font-extrabold mt-3">
                  Apply to Become a<br /><span className="gg">Growth Partner Agent.</span>
                </h2>
              </div>

              <div className="apply-card bg-[#141528] border border-white/10 rounded-3xl p-8 md:p-12">
                
                {appSubmittedSuccess ? (
                  <div className="text-center space-y-6 py-8">
                    <div className="animate-bounce"><Sparkles className="h-16 w-16 text-[#4DE89A]" /></div>
                    <h3 className="text-2xl font-extrabold text-[#4DE89A] font-['Bricolage_Grotesque']">Application Submitted!</h3>
                    <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
                      {appSubmittedSuccess.message}
                    </p>
                    <div className="font-mono text-lg font-bold text-[#00C4CF] bg-white/5 p-4 rounded-xl border border-white/10 inline-block">
                      Your Agent ID: {appSubmittedSuccess.agentId}
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => setAppSubmittedSuccess(null)} variant="outline" className="border-white/20 text-white rounded-full">
                        Submit Another Application
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApplyFormSubmit} className="space-y-5 text-xs">
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Full Name *</label>
                        <Input 
                          placeholder="e.g. Aminu Lawal" 
                          value={nameInput} 
                          onChange={(e) => setNameInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11"
                        />
                      </div>
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Phone Number *</label>
                        <Input 
                          placeholder="08012345678" 
                          value={phoneInput} 
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Email Address</label>
                        <Input 
                          type="email"
                          placeholder="aminu@example.com" 
                          value={emailInput} 
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11"
                        />
                      </div>
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">NIN / National ID No.</label>
                        <Input 
                          placeholder="Your 11-digit NIN number" 
                          value={ninInput} 
                          onChange={(e) => setNinInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">State of Operation *</label>
                        <select 
                          value={stateInput}
                          onChange={(e) => setStateInput(e.target.value)}
                          className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-11 px-3 text-xs outline-none focus:border-[#2B5BFF]"
                        >
                          <option value="">Select your state...</option>
                          {NIGERIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">LGA / City *</label>
                        <Input 
                          placeholder="e.g. Jalingo, Wukari, Ikeja..." 
                          value={lgaInput} 
                          onChange={(e) => setLgaInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bank Name *</label>
                        <select 
                          value={bankInput}
                          onChange={(e) => setBankInput(e.target.value)}
                          className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-11 px-3 text-xs outline-none focus:border-[#2B5BFF]"
                        >
                          <option value="">Select your bank...</option>
                          {NIGERIAN_BANKS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div className="fg space-y-1.5">
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bank Account Number *</label>
                        <Input 
                          maxLength={10}
                          placeholder="10-digit account number" 
                          value={accountNoInput} 
                          onChange={(e) => setAccountNoInput(e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11 font-mono"
                        />
                      </div>
                    </div>

                    <div className="fg space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Why do you want to be a NexaOS Agent? *</label>
                      <textarea 
                        rows={3}
                        placeholder="Tell us about your experience selling to local businesses, your network in your area, and why you'd be a great NexaStoreOS Growth Partner..." 
                        value={whyInput} 
                        onChange={(e) => setWhyInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl p-3 text-xs outline-none focus:border-[#2B5BFF]"
                      />
                    </div>

                    <div className="fg space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Preferred Referral Code (Optional)</label>
                      <Input 
                        placeholder="e.g. LAGOSDEALS" 
                        value={customRefCodeInput} 
                        onChange={(e) => setCustomRefCodeInput(e.target.value.toUpperCase())}
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-11 font-mono uppercase"
                      />
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="termsApply"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 rounded border-white/20 text-[#2B5BFF] cursor-pointer" 
                      />
                      <label htmlFor="termsApply" className="text-slate-400 text-xs cursor-pointer leading-normal">
                        By submitting this application, I confirm that I have read and agreed to the <a href="#terms" onClick={() => scrollToSection("#terms")} className="text-[#7B9FFF] underline">NexaStoreOS Growth Partner Terms &amp; Conditions</a>, I am a resident of Nigeria, I am at least 18 years old, and all information provided is true and accurate.
                      </label>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="btn btn-green w-full py-4 text-base font-bold cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {submitting ? "Processing Application..." : "Submit Application — Join for Free"}
                    </button>

                  </form>
                )}

              </div>
            </div>
          </section>

          {/* CTA STRIP */}
          <div className="cta-strip text-center py-24 relative overflow-hidden">
            <div className="cta-inner max-w-3xl mx-auto space-y-6 relative z-10 px-4">
              <h2 className="lg tw text-3xl md:text-5xl font-extrabold">
                Every Month You Wait<br />Is <span className="gg">Residuals Left Behind.</span>
              </h2>
              <p className="body-l text-slate-300">
                Hundreds of store owners across Nigeria need NexaStoreOS right now. Be the agent that brings it to them — and earn from every one of them, forever.
              </p>
              <div className="flex justify-center gap-4">
                <button className="btn btn-green cursor-pointer" onClick={() => scrollToSection("#apply")}>
                  Apply Now — It's Free
                </button>
                <button className="btn btn-ghost cursor-pointer" onClick={() => scrollToSection("#commissions")}>
                  View Commission Rates →
                </button>
              </div>
            </div>
          </div>

        </div>
      ) : agentProfile && agentProfile.status === "pending" ? (
        
        /* APPLICATION PENDING STATE */
        <div className="max-w-xl mx-auto px-6 py-20 relative z-10 space-y-8">
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto animate-bounce text-amber-400">
              <Clock className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-white font-['Bricolage_Grotesque']">Application Under Review</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Thank you for applying, <span className="font-bold text-white">{agentProfile.fullName}</span>! Our field operations lead is currently reviewing your operational territory assignment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-extrabold tracking-wider">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#4DE89A] rounded-xl">
              1. Submitted
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl animate-pulse">
              2. Reviewing Territory
            </div>
            <div className="p-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl">
              3. Dispatch Welcome kit
            </div>
          </div>

          <Card className="bg-[#141528] border border-white/10 p-6 space-y-4 rounded-2xl text-white">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Submitted Onboarding Profile:</h4>
            
            <div className="space-y-3 text-xs border-b border-white/10 pb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Logistics Phone:</span>
                <span className="font-mono text-white font-semibold">{agentProfile.phone || "Not Specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Region:</span>
                <span className="text-white font-semibold">{agentProfile.region || "Not Specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Referral Link:</span>
                <span className="font-mono text-[#00C4CF] font-semibold">{agentProfile.referralCode}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#4DE89A]" /> Pending Benefits Locked:
              </h5>
              <ul className="text-xs space-y-2 text-slate-300 pl-5 list-disc">
                <li>₦10,000 Fixed Field Support Allowance (On Approval)</li>
                <li>Pro conversions: ₦1,500 onboarding + ₦500/mo lifetime income</li>
                <li>Enterprise conversions: ₦5,000 onboarding + ₦1,000/mo lifetime income</li>
              </ul>
            </div>
          </Card>
        </div>
      ) : agentProfile && agentProfile.status === "approved" ? (
        
        /* APPROVED AGENT WORKSPACE / DASHBOARD */
        <div className="min-h-screen bg-[#0B0C1E] text-white flex relative w-full">
          {/* DESKTOP SIDEBAR */}
          <div className="hidden md:block">
            <AgentSidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              referralsCount={referrals.length}
              earningsCount={earnings.length}
              isMinimized={sidebarMinimized}
              setIsMinimized={setSidebarMinimized}
              onLogout={handleLogout}
              agentName={agentProfile.fullName}
              agentCode={agentProfile.referralCode}
            />
          </div>

          {/* MOBILE DRAWER */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 md:hidden flex">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="relative z-10 w-72 h-full bg-[#0B0C1E] border-r border-white/10"
                >
                  <AgentSidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => {
                      setActiveTab(tab);
                      setMobileMenuOpen(false);
                    }}
                    referralsCount={referrals.length}
                    earningsCount={earnings.length}
                    isMinimized={false}
                    setIsMinimized={() => {}}
                    onLogout={handleLogout}
                    agentName={agentProfile.fullName}
                    agentCode={agentProfile.referralCode}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* MAIN CONTENT AREA */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            sidebarMinimized ? "md:ml-20" : "md:ml-64"
          }`}>
            <AgentHeader
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
              onOpenDemoPassModal={() => setShowAgentDemoModal(true)}
              onOpenAuthModal={() => setShowAuthModal(true)}
              onOpenOnboardModal={() => setShowOnboardModal(true)}
              onOpenPayoutModal={() => setShowClaimPayoutModal(true)}
              onOpenQrModal={() => setShowQrFlyerModal(true)}
              isAuthenticated={!!currentUser}
              agentName={agentProfile.fullName}
              agentEmail={agentProfile.email}
              onLogout={handleLogout}
              activeTabTitle={
                activeTab === "performance" ? "Performance Analytics & Growth Overview" :
                activeTab === "referrals" ? "Onboarded Retail Merchants" :
                activeTab === "earnings" ? "Payout History & Commission Ledger" :
                activeTab === "resources" ? "File Resource & Marketing Collateral Center" :
                activeTab === "video-academy" ? "Field Agent Video Training Academy" :
                activeTab === "csv-guide" ? "Stock CSV Migration & AI Prompt Converter" :
                "Agent Territory & Profile Settings"
              }
            />

            <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* TOP PROFILE & LINK BAR */}
              <div className="bg-[#141528] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-extrabold text-white font-['Bricolage_Grotesque']">
                      Welcome, {agentProfile.fullName}
                    </h2>
                    <Badge className="bg-emerald-500/20 text-[#4DE89A] font-bold border-none px-2.5 py-0.5 text-[10px] rounded-full uppercase tracking-wider">
                      Active Partner
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">Share your referral link or scan QR flyer to onboard stores in your territory.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center justify-between gap-2 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10 text-xs text-slate-300 font-mono">
                    <span>Code: {agentProfile.referralCode}</span>
                    <button onClick={copyReferralCode} className="text-slate-400 hover:text-[#00C4CF] transition-all pl-2 border-l border-white/10">
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-[#4DE89A]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10 text-xs text-slate-300 font-mono">
                    <span className="truncate max-w-[180px]">{agentProfile.referralLink}</span>
                    <button onClick={copyReferralLink} className="text-slate-400 hover:text-[#00C4CF] transition-all pl-2 border-l border-white/10">
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-[#4DE89A]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* FIELD QUICK ACTIONS HUB */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setShowOnboardModal(true)}
                  className="p-4 bg-gradient-to-br from-[#2B5BFF]/20 to-[#00C4CF]/10 border border-[#2B5BFF]/30 hover:border-[#2B5BFF]/60 rounded-2xl text-left space-y-2 group transition-all cursor-pointer"
                >
                  <div className="h-9 w-9 bg-[#2B5BFF] text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Onboard Retail Store</span>
                    <span className="text-[10px] text-slate-400 block">Log store & earn ₦10k + ₦1.5k bonus</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowClaimPayoutModal(true)}
                  className="p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl text-left space-y-2 group transition-all cursor-pointer"
                >
                  <div className="h-9 w-9 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Claim Payout</span>
                    <span className="text-[10px] text-slate-400 block">Withdraw earnings or field allowance</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowQrFlyerModal(true)}
                  className="p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl text-left space-y-2 group transition-all cursor-pointer"
                >
                  <div className="h-9 w-9 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Digital QR Flyer</span>
                    <span className="text-[10px] text-slate-400 block">Show or print field agent QR badge</span>
                  </div>
                </button>

                <button
                  onClick={() => setShowAgentDemoModal(true)}
                  className="p-4 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl text-left space-y-2 group transition-all cursor-pointer"
                >
                  <div className="h-9 w-9 bg-purple-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">12h Demo Link</span>
                    <span className="text-[10px] text-slate-400 block">Generate free trial pass for store</span>
                  </div>
                </button>
              </div>

              {/* PAYSTACK AGENT SETTLEMENT STATUS BAR */}
              <div className="bg-gradient-to-r from-emerald-950/80 via-[#141528] to-indigo-950/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-[#4DE89A] rounded-xl shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Paystack Agent Direct Payout & Deposit Settlement Engine</span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-mono uppercase">
                        Paystack Active
                      </Badge>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      Your growth partner account is tied to Paystack Automated Transfers. Commissions and field logistics allowances auto-disburse directly to your bank account via Paystack.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                    Bank Ref: Paystack-Direct-Active
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowClaimPayoutModal(true)}
                    className="h-8 text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-[#4DE89A] border-emerald-500/40 gap-1.5"
                  >
                    <Wallet className="h-3.5 w-3.5" /> Payout Settings
                  </Button>
                </div>
              </div>

              {/* KPI CARDS */}
              <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
                <Card className="bg-[#141528] border border-white/10 p-5 flex items-center justify-between rounded-2xl text-white">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Total Referrals</span>
                    <p className="text-2xl font-black text-white">{referrals.length}</p>
                    <span className="text-[10px] text-slate-400">Stores on tracking list</span>
                  </div>
                  <div className="h-10 w-10 bg-[#2B5BFF]/20 rounded-xl flex items-center justify-center text-[#7B9FFF]">
                    <Users className="h-5 w-5" />
                  </div>
                </Card>

                <Card className="bg-[#141528] border border-white/10 p-5 flex items-center justify-between rounded-2xl text-white">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Conversions</span>
                    <p className="text-2xl font-black text-white">{referrals.filter(r => r.status === "converted").length}</p>
                    <span className="text-[10px] text-[#4DE89A] font-bold block">
                      {referrals.length > 0 
                        ? Math.round((referrals.filter(r => r.status === "converted").length / referrals.length) * 100)
                        : 0}% Onboarding rate
                    </span>
                  </div>
                  <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-[#4DE89A]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </Card>

                <Card className="bg-[#141528] border border-white/10 p-5 flex items-center justify-between rounded-2xl text-white">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Pending Clearance</span>
                    <p className="text-2xl font-black text-amber-400 font-sans">₦{(agentProfile.earnings?.pending || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400 block">Payouts in 30-day clearing</span>
                  </div>
                  <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                </Card>

                <Card className="bg-[#141528] border border-white/10 p-5 flex items-center justify-between rounded-2xl text-white">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Settled Earnings</span>
                    <p className="text-2xl font-black text-[#4DE89A] font-sans">₦{(agentProfile.earnings?.paid || 0).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400 block">Directly dispatched to bank</span>
                  </div>
                  <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-[#4DE89A]">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </Card>
              </div>

              {/* ACTIVE TAB CONTENT */}
              <div className="space-y-6">
                {activeTab === "performance" && (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6 md:col-span-1 space-y-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Award className="h-4 w-4 text-[#00C4CF]" /> Active Commission Rates
                        </div>
                        <div className="space-y-3 text-xs divide-y divide-white/10">
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Logistics Allowance:</span>
                            <span className="font-bold text-amber-300">₦10,000 / store</span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Pro Signup Bonus:</span>
                            <span className="font-bold text-[#4DE89A]">₦1,500 (+₦500/mo)</span>
                          </div>
                          <div className="flex justify-between pt-2">
                            <span className="text-slate-400">Enterprise Bonus:</span>
                            <span className="font-bold text-[#00C4CF]">₦5,000 (+₦1,000/mo)</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6 md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[#4DE89A]" /> Settlement & Bank Disbursal SLA
                          </div>
                          <Badge className="bg-emerald-500/20 text-[#4DE89A] border-none text-[9px]">24h - 48h SLA</Badge>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Field allowances and verified onboarding bonuses can be requested on-demand via the <span className="text-[#00C4CF] font-bold">Claim Payout</span> tool. Scheduled monthly residual payouts are automatically processed on the 1st day of every month.
                        </p>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-slate-400 block text-[10px]">REGISTERED BANK DISBURSAL DESTINATION</span>
                            <span className="font-mono font-bold text-white">
                              {agentProfile.bank || "Not Set"} — {agentProfile.accountNumber || "No Account"} ({agentProfile.accountName || agentProfile.fullName})
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setShowClaimPayoutModal(true)}
                            className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white text-xs font-bold rounded-xl h-8 shrink-0"
                          >
                            Request Disbursal
                          </Button>
                        </div>
                      </Card>
                    </div>

                    <FieldPitchPlaybook referralCode={agentProfile.referralCode} />
                  </div>
                )}

                {activeTab === "referrals" && (
                  <div className="space-y-4">
                    <div className="bg-[#141528] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <Input
                            value={merchantSearch}
                            onChange={(e) => setMerchantSearch(e.target.value)}
                            placeholder="Search store name, owner, phone or location..."
                            className="pl-9 bg-white/5 border-white/10 text-white rounded-xl text-xs h-9"
                          />
                        </div>

                        <select
                          value={merchantStatusFilter}
                          onChange={(e) => setMerchantStatusFilter(e.target.value as "all" | "converted" | "pending")}
                          className="bg-[#0F1020] border border-white/10 text-white rounded-xl h-9 px-3 text-xs outline-none focus:border-[#2B5BFF]"
                        >
                          <option value="all">All Statuses ({referrals.length})</option>
                          <option value="converted">Active / Converted ({referrals.filter(r => r.status === "converted").length})</option>
                          <option value="pending">Pending Onboarding ({referrals.filter(r => r.status === "pending").length})</option>
                        </select>
                      </div>

                      <Button
                        onClick={() => setShowOnboardModal(true)}
                        className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold text-xs h-9 gap-1.5 rounded-xl shrink-0 w-full sm:w-auto"
                      >
                        <Plus className="h-4 w-4" /> Onboard Retail Merchant
                      </Button>
                    </div>

                    <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6">
                      {(() => {
                        const filtered = referrals.filter((r) => {
                          const matchQuery = 
                            (r.storeName || "").toLowerCase().includes(merchantSearch.toLowerCase()) ||
                            (r.ownerName || "").toLowerCase().includes(merchantSearch.toLowerCase()) ||
                            (r.ownerPhone || "").includes(merchantSearch) ||
                            (r.location || "").toLowerCase().includes(merchantSearch.toLowerCase());
                          const matchStatus = merchantStatusFilter === "all" || r.status === merchantStatusFilter;
                          return matchQuery && matchStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-12 space-y-3">
                              <Users className="h-10 w-10 text-slate-500 mx-auto" />
                              <p className="text-sm font-bold text-slate-300">No matching store records found.</p>
                              <p className="text-xs text-slate-400">Click "Onboard Retail Merchant" to register store visits in your territory.</p>
                              <Button
                                onClick={() => setShowOnboardModal(true)}
                                className="bg-gradient-to-r from-[#2B5BFF] to-[#00C4CF] text-white font-bold text-xs rounded-xl h-9 gap-1.5 px-5"
                              >
                                <Plus className="h-4 w-4" /> Onboard First Store
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                                  <th className="p-3">Store Details</th>
                                  <th className="p-3">Owner Contact</th>
                                  <th className="p-3">Plan</th>
                                  <th className="p-3">Onboarded</th>
                                  <th className="p-3">Status</th>
                                  <th className="p-3 text-right">Field Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {filtered.map((r) => (
                                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3">
                                      <span className="font-bold text-white block text-sm">{r.storeName || "Nexa Store"}</span>
                                      <span className="text-[10px] text-slate-400 block font-mono">ID: {r.storeId.slice(0, 8)}</span>
                                    </td>
                                    <td className="p-3 space-y-0.5">
                                      <span className="text-slate-200 font-semibold block">{r.ownerName || "Merchant"}</span>
                                      <span className="text-slate-400 font-mono text-[11px] block">{r.ownerPhone || "No Phone"}</span>
                                    </td>
                                    <td className="p-3">
                                      <Badge className="bg-[#00C4CF]/20 text-[#00C4CF] border-none text-[10px] uppercase font-bold">
                                        {r.planName || "Pro Plan"}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-slate-400 font-mono">
                                      {new Date(r.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">
                                      <Badge className={
                                        r.status === "converted"
                                          ? "bg-emerald-500/20 text-[#4DE89A] border-none text-[10px] font-bold"
                                          : "bg-amber-500/20 text-amber-300 border-none text-[10px] font-bold"
                                      }>
                                        {r.status === "converted" ? "Active / Converted" : "Pending Onboarding"}
                                      </Badge>
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setSelectedVisitStore({ id: r.storeId, name: r.storeName || "Store" })}
                                          className="h-8 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl text-[11px] gap-1 px-2.5"
                                          title="Log Visit Note"
                                        >
                                          <MapPin className="h-3.5 w-3.5 text-[#00C4CF]" />
                                          <span>Log Visit</span>
                                        </Button>

                                        {r.ownerPhone && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              const cleanPhone = r.ownerPhone?.replace(/\D/g, "");
                                              const phoneWithCountry = cleanPhone?.startsWith("234") ? cleanPhone : `234${cleanPhone?.replace(/^0/, "")}`;
                                              const msg = `Hello ${r.ownerName || "Merchant"}! I am your NexaStoreOS Growth Agent following up on your store ${r.storeName}. Need help with POS setup?`;
                                              window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, "_blank");
                                            }}
                                            className="h-8 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl text-[11px] gap-1 px-2.5"
                                          >
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            <span>WhatsApp</span>
                                          </Button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </Card>
                  </div>
                )}

                {activeTab === "earnings" && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Card className="bg-[#141528] border border-white/10 p-5 rounded-2xl text-white">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Cleared Paid Earnings</span>
                        <p className="text-2xl font-black text-[#4DE89A] font-mono mt-1">₦{(agentProfile.earnings?.paid || 0).toLocaleString()}</p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Dispatched to bank</span>
                      </Card>

                      <Card className="bg-[#141528] border border-white/10 p-5 rounded-2xl text-white">
                        <span className="text-[10px] text-amber-300 font-bold uppercase block">Pending Clearance</span>
                        <p className="text-2xl font-black text-amber-400 font-mono mt-1">₦{(agentProfile.earnings?.pending || 0).toLocaleString()}</p>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Clearing (30-day window)</span>
                      </Card>

                      <Card className="bg-gradient-to-br from-[#2B5BFF]/20 to-[#00C4CF]/10 border border-[#2B5BFF]/30 p-5 rounded-2xl text-white flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-[#00C4CF] font-bold uppercase block">Direct Bank Transfer</span>
                          <span className="text-xs text-slate-300 block font-semibold">Request Logistics or Residual Payout</span>
                        </div>
                        <Button
                          onClick={() => setShowClaimPayoutModal(true)}
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs rounded-xl h-8 gap-1.5 mt-2"
                        >
                          <Wallet className="h-4 w-4" /> Claim Payout
                        </Button>
                      </Card>
                    </div>

                    <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6">
                      {earnings.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <ArrowRightLeft className="h-8 w-8 text-slate-500 mx-auto" />
                          <p className="text-sm font-bold text-slate-300">Your commission ledger is currently empty.</p>
                          <p className="text-xs text-slate-400">Onboard retail merchants to accumulate field allowances and monthly residuals.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                                <th className="p-3">Transaction Date</th>
                                <th className="p-3">Store Name</th>
                                <th className="p-3">Commission Type</th>
                                <th className="p-3">Amount (₦)</th>
                                <th className="p-3">Settlement Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {earnings.map((e) => (
                                <tr key={e.id} className="hover:bg-white/[0.02]">
                                  <td className="p-3 text-slate-400 font-mono">{new Date(e.timestamp).toLocaleDateString()}</td>
                                  <td className="p-3 font-bold text-white">{e.storeName || "Nexa Store"}</td>
                                  <td className="p-3 text-slate-300">
                                    <Badge className="bg-white/5 text-slate-300 border border-white/10 text-[10px]">
                                      {e.commissionType}
                                    </Badge>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-[#4DE89A]">₦{e.amount.toLocaleString()}</td>
                                  <td className="p-3">
                                    <Badge className={
                                      e.status === "paid" 
                                        ? "bg-emerald-500/20 text-[#4DE89A] border-none text-[10px]"
                                        : "bg-amber-500/20 text-amber-300 border-none text-[10px]"
                                    }>
                                      {e.status === "paid" ? "Paid to Bank" : "Pending Clearance"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {activeTab === "resources" && (
                  <AgentResourcesView />
                )}

                {activeTab === "video-academy" && (
                  <AgentVideoAcademyView />
                )}

                {activeTab === "csv-guide" && (
                  <div className="space-y-6">
                    <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[10px] uppercase font-bold">
                            Field Agent Migration Suite
                          </Badge>
                        </div>
                        <h2 className="text-xl font-bold font-['Bricolage_Grotesque'] text-white">
                          Merchant CSV Inventory Import & AI Format Converter
                        </h2>
                        <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                          Use this tool when helping new retail merchants migrate their stock registers, Excel lists, paper logs, or legacy software data into NexaStoreOS. Download standard CSV templates, view required header fields, or copy our prompt to transform messy merchant sheets with AI.
                        </p>
                      </div>
                    </Card>

                    <div className="p-6 bg-[#141528] border border-white/10 rounded-2xl text-slate-100">
                      <CSVImportGuideContent />
                    </div>
                  </div>
                )}

                {activeTab === "settings" && (
                  <Card className="bg-[#141528] border border-white/10 text-white rounded-2xl p-6 max-w-xl">
                    <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <Label className="text-slate-400">Full Name</Label>
                        <Input 
                          value={settingsName} 
                          onChange={(e) => setSettingsName(e.target.value)} 
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400">Phone</Label>
                        <Input 
                          value={settingsPhone} 
                          onChange={(e) => setSettingsPhone(e.target.value)} 
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-400">Operating Territory</Label>
                        <Input 
                          value={settingsRegion} 
                          onChange={(e) => setSettingsRegion(e.target.value)} 
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <Button type="submit" className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white rounded-full">
                        Save Territory Settings
                      </Button>
                    </form>
                  </Card>
                )}
              </div>
            </main>
          </div>
        </div>
      ) : null}

      {/* FOOTER */}
      <footer>
        <div className="f-shimmer" />
        <div className="f-top max-w-6xl mx-auto px-6 py-12 border-t border-white/10">
          <div className="f-grid grid md:grid-cols-4 gap-8 text-xs text-slate-400">
            <div>
              <div className="f-brand-row flex items-center gap-2 text-white font-bold text-sm mb-3">
                <div className="f-brand-ico bg-[#2B5BFF] p-1.5 rounded-lg">
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                    <path d="M4 4L10 4L14 12L10 20H4L8 12L4 4Z" fill="white"/>
                  </svg>
                </div>
                NexaStoreOS Agent
              </div>
              <p className="mb-4 leading-relaxed">
                Official NexaStoreOS Growth Partner Agent Portal. Operated by Nexa Digital Solutions LTD, Jalingo, Taraba State, Nigeria.
              </p>
              <div className="space-y-1 text-slate-300">
                <div><Phone className="h-4 w-4 inline" /> 090-380-26109</div>
                <div><MessageCircle className="h-4 w-4 inline" /> 081-323-21056 (WhatsApp)</div>
                <div><MapPin className="h-4 w-4 inline" /> Lamurde St, Barade, Jalingo, Taraba</div>
              </div>
            </div>

            <div>
              <div className="f-col-head font-bold text-white uppercase mb-3">Agent Navigation</div>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection("#income")} className="hover:text-white">Income Calculator</button></li>
                <li><button onClick={() => scrollToSection("#commissions")} className="hover:text-white">Commission Rates</button></li>
                <li><button onClick={() => scrollToSection("#how-it-works")} className="hover:text-white">How It Works</button></li>
                <li><button onClick={() => scrollToSection("#terms")} className="hover:text-white">Terms &amp; Conditions</button></li>
                <li><button onClick={() => scrollToSection("#apply")} className="hover:text-white">Apply Now</button></li>
              </ul>
            </div>

            <div>
              <div className="f-col-head font-bold text-white uppercase mb-3">Nexa Digital Solutions</div>
              <p className="leading-relaxed">
                Empowering Nigerian retail merchants with Next-Gen Point of Sale, Inventory Management, and Cloud Analytics.
              </p>
            </div>

            <div>
              <div className="f-col-head font-bold text-white uppercase mb-3">Support</div>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection("#faq")} className="hover:text-white">FAQ</button></li>
                <li><a href="tel:09038026109" className="hover:text-white">Call State Lead</a></li>
                <li><a href="https://wa.me/2348132321056" target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp Support</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="f-bottom border-t border-white/5 py-6 px-6 text-center text-xs text-slate-500">
          © 2025 Nexa Digital Solutions LTD · NexaStoreOS Growth Partner Program · All Rights Reserved · Nigeria
        </div>
      </footer>

      {/* AUTH MODAL (SIGN IN / SIGN UP) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141528] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-white my-8"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-bold font-['Bricolage_Grotesque']">
                  Agent Growth Partner Portal
                </h3>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="text-slate-400 hover:text-white text-xs bg-white/5 px-2.5 py-1 rounded-full transition-colors"
                >
                  Close
                </button>
              </div>

              {/* TABS FOR SWITCHING BETWEEN SIGN IN AND SIGN UP */}
              <div className="flex bg-white/5 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className={`flex-1 py-2 rounded-lg transition-all text-center ${
                    authTab === "login"
                      ? "bg-[#2B5BFF] text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab("register")}
                  className={`flex-1 py-2 rounded-lg transition-all text-center ${
                    authTab === "register"
                      ? "bg-[#00C4CF] text-[#0B0C1E] shadow-md font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {authTab === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="loginEmail" className="text-slate-400">Registered Email Address</Label>
                    <Input 
                      id="loginEmail"
                      type="email"
                      placeholder="e.g. partner@nexaagent.ng"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="loginPass" className="text-slate-400">Security Password</Label>
                    <div className="relative">
                      <Input 
                        id="loginPass"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-10 rounded-full mt-2">
                    {submitting ? "Signing in..." : "Access Agent Workspace"}
                  </Button>

                  <div className="text-center pt-2 text-slate-400 text-xs">
                    Don&apos;t have an agent account yet?{" "}
                    <button
                      type="button"
                      onClick={() => setAuthTab("register")}
                      className="text-[#00C4CF] hover:underline font-bold"
                    >
                      Sign Up Now
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleQuickRegister} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="regName" className="text-slate-400">Full Name *</Label>
                    <Input 
                      id="regName"
                      type="text"
                      placeholder="e.g. Aminu Lawal"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regEmail" className="text-slate-400">Email Address *</Label>
                    <Input 
                      id="regEmail"
                      type="email"
                      placeholder="e.g. aminu@nexaagent.ng"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regPhone" className="text-slate-400">Phone Number *</Label>
                    <Input 
                      id="regPhone"
                      type="text"
                      placeholder="e.g. 08012345678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regPass" className="text-slate-400">Security Password *</Label>
                    <div className="relative">
                      <Input 
                        id="regPass"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="regState" className="text-slate-400">Operating State *</Label>
                    <select
                      id="regState"
                      value={stateInput}
                      onChange={(e) => setStateInput(e.target.value)}
                      className="w-full bg-[#1A1C38] border border-white/10 text-white rounded-xl h-10 px-3 text-xs"
                    >
                      <option value="">Select your state...</option>
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#00C4CF] hover:bg-[#00A8B2] text-[#0B0C1E] font-bold h-10 rounded-full mt-2">
                    {submitting ? "Creating Account..." : "Create Agent Account"}
                  </Button>

                  <div className="text-center pt-2 border-t border-white/10 flex flex-col gap-1.5 text-slate-400 text-xs">
                    <div>
                      Already registered as an Agent?{" "}
                      <button
                        type="button"
                        onClick={() => setAuthTab("login")}
                        className="text-[#2B5BFF] hover:underline font-bold"
                      >
                        Sign In
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAuthModal(false);
                        scrollToSection("#apply");
                      }}
                      className="text-slate-400 hover:text-white text-[11px] underline"
                    >
                      Or fill full application with payout bank details →
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AGENT FUNCTIONAL MODALS */}
      {(() => {
        const effectiveAgent = agentProfile || {
          agentId: "NEXA-DEMO-AGENT",
          fullName: "Nexa Growth Partner",
          email: currentUser?.email || "agent.demo@nexa.ng",
          phone: "090-380-26109",
          region: "Taraba State (Jalingo)",
          referralCode: "NEXADEMO",
          referralLink: `${window.location.origin}/?ref=NEXADEMO`,
          status: "approved",
          commissionRulesApplied: "default_v1",
          earnings: { pending: 15000, paid: 45000, reversed: 0 },
          createdAt: new Date().toISOString()
        };

        return (
          <>
            <OnboardMerchantModal
              isOpen={showOnboardModal}
              onClose={() => setShowOnboardModal(false)}
              agentId={effectiveAgent.agentId}
              agentUid={currentUser?.uid || "demo-uid"}
              referralCode={effectiveAgent.referralCode}
              agentCode={effectiveAgent.referralCode}
              agentName={effectiveAgent.fullName}
            />

            <ClaimPayoutModal
              isOpen={showClaimPayoutModal}
              onClose={() => setShowClaimPayoutModal(false)}
              agentUid={currentUser?.uid || "demo-uid"}
              agentId={effectiveAgent.agentId}
              agentName={effectiveAgent.fullName}
              bankName={effectiveAgent.bank || "Access Bank"}
              accountNumber={effectiveAgent.accountNumber || "0123456789"}
              accountName={effectiveAgent.accountName || effectiveAgent.fullName}
              pendingBalance={effectiveAgent.earnings?.pending || 15000}
            />

            <AgentQrFlyerModal
              isOpen={showQrFlyerModal}
              onClose={() => setShowQrFlyerModal(false)}
              agentName={effectiveAgent.fullName}
              agentCode={effectiveAgent.referralCode}
              agentPhone={effectiveAgent.phone || "090-380-26109"}
              agentRegion={effectiveAgent.region || "Taraba State"}
              referralLink={effectiveAgent.referralLink}
            />

            <LogVisitModal
              isOpen={!!selectedVisitStore}
              onClose={() => setSelectedVisitStore(null)}
              agentUid={currentUser?.uid || "demo-uid"}
              agentId={effectiveAgent.agentId}
              agentName={effectiveAgent.fullName}
              store={selectedVisitStore}
            />

            <AnimatePresence>
              {showAgentDemoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-xl my-8 relative z-10"
                  >
                    <DemoPassGeneratorModal
                      defaultAgentName={effectiveAgent.fullName}
                      onClose={() => setShowAgentDemoModal(false)}
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        );
      })()}

    </div>
  );
}

export default AgentsPage;
