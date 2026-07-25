import { useNavigate } from "react-router-dom";
import { useDemo } from "@/hooks/useDemo";
import { useState, useEffect, useMemo } from "react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { BusinessOnboarding } from "@/components/onboarding/BusinessOnboarding";
import { AuthModal } from "@/components/auth/AuthModal";
import { LegalModal } from "@/components/legal/LegalModal";
import { useAuth } from "@/contexts/FirebaseAuthContext";

import { motion, AnimatePresence } from "framer-motion";
import "@/styles/landing.css";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Users, 
  Phone, 
  MapPin, 
  Globe, 
  Building, 
  Zap, 
  Gift, 
  ShieldCheck, 
  Sparkles, 
  User, 
  Bell, 
  Award, 
  Smartphone, 
  MessageCircle, 
  BarChart3, 
  Plus, 
  Home, 
  Menu, 
  MoreHorizontal, 
  Sun,
  Store,
  Clock,
  Trash2,
  Minus 
} from "lucide-react";


const PRICING_PLANS = [
  {
    id: "starter",
    name: "STARTER",
    badge: "Starter",
    limitBadge: "UP TO 2000 PRODUCTS",
    description: "Perfect for small shops just getting started.",
    monthlyPrice: 3500,
    annualPrice: 35000,
    strikePrice: 5000,
    buttonText: "GET STARTED",
    colorClass: "from-teal-500/10 to-emerald-500/5 border-teal-200",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200/50",
    glowClass: "",
    iconColor: "bg-teal-500 text-white",
    features: [
      "Sales Tracking",
      "Inventory Management",
      "Customer Management",
      "Daily Sales Reports",
      "Cloud Backup",
      "1 Staff Account"
    ],
    detailedFeatures: [
      {
        category: "Performance & Scale",
        list: [
          "Single store branch context",
          "Up to 2,000 active products / SKUs",
          "1 Staff Account with secure access",
          "Digital receipts & sales logging"
        ]
      },
      {
        category: "Intelligence & Backup",
        list: [
          "Daily Sales Reports & summaries",
          "Cloud backup & instant device sync",
          "Basic customer management ledger"
        ]
      }
    ]
  },
  {
    id: "professional",
    name: "PRO PLAN",
    badge: "MOST POPULAR",
    limitBadge: "UP TO 10000 PRODUCTS",
    description: "Advanced features for growing businesses.",
    monthlyPrice: 6500,
    annualPrice: 65000,
    strikePrice: 10000,
    buttonText: "CHOOSE PRO",
    colorClass: "from-blue-500/20 to-indigo-500/10 border-blue-400 shadow-blue-500/5",
    badgeColor: "bg-blue-600 text-white border-blue-500",
    glowClass: "premium-glow",
    iconColor: "bg-blue-600 text-white",
    features: [
      "Everything in Starter",
      "Stock Alerts & Low Stock",
      "Expense Tracking",
      "Profit & Performance Reports",
      "Customer & Debt Management",
      "Cloud Backup",
      "Up to 5 Staff Accounts"
    ],
    detailedFeatures: [
      {
        category: "Capacity & Scale",
        list: [
          "Up to 10,000 active products / SKUs",
          "Up to 5 Staff Accounts & roles",
          "Expense tracking & net profit calculations"
        ]
      },
      {
        category: "Advanced Management",
        list: [
          "Customer credit & debt management ledger",
          "Stock Alerts & custom low-stock thresholds",
          "Detailed profit & sales performance reports"
        ]
      }
    ]
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    badge: "Enterprise",
    limitBadge: "UP TO UNLIMITED PRODUCTS",
    description: "Custom solutions for large businesses.",
    monthlyPrice: 0, // CUSTOM
    annualPrice: 0,
    isCustom: true,
    strikePrice: 0,
    buttonText: "CONTACT US",
    colorClass: "from-purple-500/10 to-pink-500/5 border-purple-300",
    badgeColor: "bg-purple-600 text-white border-purple-500",
    glowClass: "enterprise-glow",
    iconColor: "bg-purple-600 text-white",
    features: [
      "Everything in Pro Plan",
      "Multi-Branch Management",
      "Advanced Analytics",
      "Custom Integrations",
      "Dedicated Account Manager",
      "Priority Support",
      "Custom Training",
      "Custom Staff Access"
    ],
    detailedFeatures: [
      {
        category: "Corporate Control",
        list: [
          "Unlimited store locations & products",
          "Custom staff access & permissions matrix",
          "Multi-branch sync & central warehouse logs"
        ]
      },
      {
        category: "White-Glove Service",
        list: [
          "Dedicated Account Manager",
          "Priority 24/7 technical support & SLA",
          "Custom API & hardware integrations",
          "On-site or virtual custom staff training"
        ]
      }
    ]
  }
];

function SimulatorPriceInput({
  initialPrice,
  onPriceChange,
}: {
  initialPrice: number;
  onPriceChange: (val: number) => void;
}) {
  const [raw, setRaw] = useState(initialPrice.toString());

  useEffect(() => {
    setRaw(initialPrice.toString());
  }, [initialPrice]);

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      value={raw}
      onChange={(e) => {
        const val = e.target.value;
        if (/^[0-9]*\.?[0-9]*$/.test(val)) {
          setRaw(val);
          if (val !== "") {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) {
              onPriceChange(parsed);
            }
          }
        }
      }}
      className="w-12 h-3.5 bg-transparent text-white text-[7.5px] font-mono text-center focus:outline-none"
    />
  );
}

export default function LandingPage() {
  const { enterDemoMode } = useDemo();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnboardingDemo, setIsOnboardingDemo] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const [invitedStore, setInvitedStore] = useState<{ id: string; name: string; role: string } | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<"terms" | "privacy">("terms");

  // Payment/upgrade states (referenced in pricing CTA)
  const [upgradeTier, setUpgradeTier] = useState<"starter" | "professional" | "enterprise" | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedTierForOnboarding, setSelectedTierForOnboarding] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Active page state: 'home' | 'product' | 'hiw' | 'about' | 'contact'
  const [activePage, setActivePage] = useState<string>("home");

  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [pricingTilt, setPricingTilt] = useState({ x: 0, y: 0 });

  // Extended pricing states
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [activePlanIndex, setActivePlanIndex] = useState<number>(1); // Default to "Pro"
  const [expandedPlans, setExpandedPlans] = useState<Record<number, boolean>>({});
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Dynamic browser mockup chart heights state
  const [chartHeights, setChartHeights] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Frequently Asked Questions toggled states
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({});

  // Scrolled state for navigation bar
  const [scrolled, setScrolled] = useState(false);

  // Request form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bizName: "",
    bizType: "",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // --- INTERACTIVE SIMULATOR STATES ---
  const [simProducts, setSimProducts] = useState([
    { id: "1", name: "Indomie Super Pack", price: 1500, stock: 5, category: "Noodles" },
    { id: "2", name: "Coca-Cola 50cl", price: 400, stock: 18, category: "Drinks" },
    { id: "3", name: "Peak Milk Sachet", price: 250, stock: 45, category: "Dairy" },
    { id: "4", name: "Golden Penny Spaghetti", price: 950, stock: 12, category: "Grains" },
    { id: "5", name: "Milo 20g Sachet", price: 180, stock: 3, category: "Beverages" }
  ]);
  const [simCart, setSimCart] = useState<{ id: string; quantity: number; overridePrice?: number }[]>([]);
  const [simSales, setSimSales] = useState<{ id: string; items: { name: string; qty: number; price: number }[]; total: number; paymentMethod: string; time: string }[]>([]);
  const [simDebtList, setSimDebtList] = useState([
    { id: "1", debtor: "Chinedu O.", amount: 4500, date: "Yesterday" },
    { id: "2", debtor: "Mama Blessing", amount: 1200, date: "2 days ago" },
  ]);
  const [simActiveTab, setSimActiveTab] = useState<"home" | "sales" | "items" | "more">("home");
  const [simView, setSimView] = useState<"dashboard" | "analytics" | "add-product" | "restock" | "debt-book" | "alerts-log" | "checkout-success" | "pos-cart">("dashboard");
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdCat, setNewProdCat] = useState("Provisions");
  const [simDebtorName, setSimDebtorName] = useState("");
  const [simAlertNotification, setSimAlertNotification] = useState<{ title: string; message: string; type: "success" | "warning" | "info" } | null>(null);
  const [simNotificationHistory, setSimNotificationHistory] = useState<{ id: string; text: string; time: string; type: string }[]>([
    { id: "1", text: "8 AM Daily Report sent to Hassan Bala", time: "8:00 AM", type: "info" },
    { id: "2", text: "Low stock alert: Milo 20g Sachet (3 left)", time: "Yesterday", type: "warning" }
  ]);
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<"Transfer" | "Cash" | "POS" | "Credit">("Transfer");
  const [lastCheckoutDetails, setLastCheckoutDetails] = useState<{ id: string; total: number; paymentMethod: string } | null>(null);

  const triggerSimAlert = (title: string, message: string, type: "success" | "warning" | "info") => {
    setSimAlertNotification({ title, message, type });
    setSimNotificationHistory(prev => [
      {
        id: Date.now().toString(),
        text: `${title}: ${message}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type
      },
      ...prev
    ]);
  };

  useEffect(() => {
    if (simAlertNotification) {
      const timer = setTimeout(() => {
        setSimAlertNotification(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [simAlertNotification]);

  const simStats = useMemo(() => {
    const salesTotal = simSales.reduce((sum, sale) => sum + sale.total, 0);
    const finalRevenue = 184200 + salesTotal;

    const salesUnits = simSales.reduce((sum, sale) => sum + sale.items.reduce((uSum, item) => uSum + item.qty, 0), 0);
    const finalUnits = 34 + salesUnits;

    const lowStockCount = simProducts.filter(p => p.stock <= 5).length;

    return {
      revenue: finalRevenue,
      units: finalUnits,
      lowStockCount
    };
  }, [simProducts, simSales]);

  // --- INTERACTIVE SIMULATOR ACTION HANDLERS ---
  const handleSimAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice || !newProdStock) {
      triggerSimAlert("Error ⚠️", "Please fill in all fields", "warning");
      return;
    }
    const price = parseFloat(newProdPrice);
    const stock = parseInt(newProdStock);
    if (isNaN(price) || isNaN(stock) || price <= 0 || stock < 0) {
      triggerSimAlert("Error ⚠️", "Please enter valid numeric values", "warning");
      return;
    }

    const newProd = {
      id: (simProducts.length + 1).toString(),
      name: newProdName,
      price,
      stock,
      category: newProdCat
    };

    setSimProducts(prev => [...prev, newProd]);
    triggerSimAlert("Product Added 📦", `Saved "${newProdName}" successfully!`, "success");
    setNewProdName("");
    setNewProdPrice("");
    setNewProdStock("");
    setSimView("dashboard");
    setSimActiveTab("home");
  };

  const handleSimQuickRestock = (prodId: string, qtyToAdd: number) => {
    setSimProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        const updatedStock = p.stock + qtyToAdd;
        triggerSimAlert("Stock Updated ⚡", `Restocked "${p.name}" by +${qtyToAdd} units!`, "success");
        return { ...p, stock: updatedStock };
      }
      return p;
    }));
  };

  const handleSimRestockSubmit = (prodId: string, qtyStr: string) => {
    const qty = parseInt(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      triggerSimAlert("Error ⚠️", "Please enter a valid quantity", "warning");
      return;
    }

    setSimProducts(prev => prev.map(p => {
      if (p.id === prodId) {
        const updatedStock = p.stock + qty;
        triggerSimAlert("Stock Updated ⚡", `Restocked "${p.name}" by +${qty} units!`, "success");
        return { ...p, stock: updatedStock };
      }
      return p;
    }));
    setSimView("dashboard");
    setSimActiveTab("home");
  };

  const handleAddToCart = (prodId: string) => {
    const product = simProducts.find(p => p.id === prodId);
    if (!product) return;

    const cartItem = simCart.find(item => item.id === prodId);
    const currentQtyInCart = cartItem ? cartItem.quantity : 0;

    if (currentQtyInCart >= product.stock) {
      triggerSimAlert("Out of Stock ⚠️", `Only ${product.stock} units of ${product.name} left!`, "warning");
      return;
    }

    setSimCart(prev => {
      if (cartItem) {
        return prev.map(item => item.id === prodId ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        return [...prev, { id: prodId, quantity: 1 }];
      }
    });

    triggerSimAlert("Added 🛒", `Added 1x ${product.name}`, "info");
  };

  const handleRemoveFromCart = (prodId: string) => {
    setSimCart(prev => {
      const item = prev.find(i => i.id === prodId);
      if (item && item.quantity > 1) {
        return prev.map(i => i.id === prodId ? { ...i, quantity: i.quantity - 1 } : i);
      } else {
        return prev.filter(i => i.id !== prodId);
      }
    });
  };

  const handleClearCartItem = (prodId: string) => {
    setSimCart(prev => prev.filter(i => i.id !== prodId));
  };

  const handleSimCheckout = () => {
    if (simCart.length === 0) {
      triggerSimAlert("Empty Cart ⚠️", "Please add items to cart first", "warning");
      return;
    }

    // Prepare sales items
    const itemsDetail = simCart.map(cartItem => {
      const p = simProducts.find(prod => prod.id === cartItem.id)!;
      const finalPrice = cartItem.overridePrice !== undefined ? cartItem.overridePrice : p.price;
      return {
        id: p.id,
        name: p.name,
        qty: cartItem.quantity,
        price: finalPrice
      };
    });

    const subtotal = itemsDetail.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Deduct stocks
    setSimProducts(prev => prev.map(p => {
      const cartItem = simCart.find(ci => ci.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));

    const debtorNameText = simDebtorName.trim() || "Regular Customer";

    // Handle debt logging if Credit is chosen
    if (checkoutPaymentMethod === "Credit") {
      const newDebt = {
        id: (simDebtList.length + 1).toString(),
        debtor: debtorNameText,
        amount: subtotal,
        date: "Just now"
      };
      setSimDebtList(prev => [newDebt, ...prev]);
      triggerSimAlert("Debt Logged ⚠️", `₦${subtotal.toLocaleString()} logged to ${debtorNameText}'s account. WhatsApp reminder scheduled!`, "warning");
      setSimDebtorName("");
    } else {
      triggerSimAlert(
        "Payment Confirmed! 💰",
        `Received ₦${subtotal.toLocaleString()} via ${checkoutPaymentMethod}. Receipt sent via WhatsApp.`,
        "success"
      );
    }

    // Add to sales log
    const newSale = {
      id: `NX-${Math.floor(1000 + Math.random() * 9000)}`,
      items: itemsDetail,
      total: subtotal,
      paymentMethod: checkoutPaymentMethod,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setSimSales(prev => [newSale, ...prev]);
    setLastCheckoutDetails(newSale);
    setSimCart([]); // Clear cart
    setSimView("checkout-success");
  };

  const handleCollectDebt = (id: string, name: string, amount: number) => {
    setSimDebtList(prev => prev.filter(debt => debt.id !== id));
    triggerSimAlert("Debt Paid ✅", `Collected ₦${amount.toLocaleString()} from ${name}. WhatsApp notification sent!`, "success");
    
    // Log as cash sale
    const newSale = {
      id: `NX-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [{ name: `Debt Paid: ${name}`, qty: 1, price: amount }],
      total: amount,
      paymentMethod: "Cash",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setSimSales(prev => [newSale, ...prev]);
  };

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const storeId = params.get("storeId");
      const storeName = params.get("storeName");
      const role = params.get("role") || "manager";
      
      if (storeId) {
        const decodedName = storeName ? decodeURIComponent(storeName) : "a partner store";
        setInvitedStore({ id: storeId, name: decodedName, role });
        
        sessionStorage.setItem("nexa_invite_storeId", storeId);
        sessionStorage.setItem("nexa_invite_role", role);
        sessionStorage.setItem("nexa_invite_storeName", decodedName);
      }

      // Capture referral code if provided (?ref=AGENTCODE)
      const refCode = params.get("ref");
      if (refCode) {
        localStorage.setItem("nexaos_referral_code", refCode);
        sessionStorage.setItem("nexaos_referral_code", refCode);
        console.log("Captured referral code:", refCode);
      }
    } catch (e) {
      console.error("Failed to parse invite or referral parameters:", e);
    }
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const q = query(collection(db, "users"), limit(1));
        const snap = await getDocs(q);
        setHasAdmin(!snap.empty);
      } catch (err) {
        setHasAdmin(null);
      }
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/app/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleGetStarted = (type?: string) => {
    if (!invitedStore) {
      sessionStorage.setItem("nexa_intended_business", type || "new_store");
      setAuthModalTab("signup");
    } else {
      setAuthModalTab("login");
    }
    if (user) {
      navigate("/app/dashboard");
      return;
    }
    setAuthModalOpen(true);
  };

  const handleTryDemo = () => {
    setIsOnboardingDemo(true);
    setShowOnboarding(true);
  };

  const handleLogin = () => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  };

  const handleOnboardingComplete = (data: {
    businessType: string;
    categories: string[];
    storeName: string;
    brandColor: string;
    electronicsMainType?: "devices" | "accessories" | "both";
    initialItems?: Array<{ 
      name: string; 
      price: string; 
      stock: string; 
      unit: string; 
      categoryId?: string;
      color?: string;
      sizes?: string;
      enableColours?: boolean;
      enableSizes?: boolean;
      fineTunedVariants?: Record<string, { price: number; stock: number }>;
    }>;
    country?: string;
    state?: string;
    lga?: string;
  }) => {
    if (isOnboardingDemo) {
      enterDemoMode({ 
        businessType: data.businessType, 
        categories: data.categories, 
        storeName: data.storeName, 
        brandColor: data.brandColor,
        storePhone: "", 
        storeAddress: "", 
        receiptFooter: "Thank you for your patronage!", 
        taxRate: 0,
        country: data.country || "Nigeria",
        state: data.state || "",
        lga: data.lga || "",
        initialItems: data.initialItems?.map(item => ({
          name: item.name,
          price: item.price,
          stock: item.stock,
          unit: item.unit,
          categoryId: item.categoryId,
          color: item.color,
          sizes: item.sizes,
          enableColours: item.enableColours,
          enableSizes: item.enableSizes,
          fineTunedVariants: item.fineTunedVariants
        }))
      });
      localStorage.setItem("stackwise-onboarding-done", "true");
      setShowOnboarding(false);
      navigate("/app/dashboard");
    }
  };

  const handleOnboardingSkip = () => {
    if (isOnboardingDemo) {
      enterDemoMode();
      localStorage.setItem("stackwise-onboarding-done", "true");
      setShowOnboarding(false);
      navigate("/app/dashboard");
    }
  };

  // Scroll and click reveal effect for standard animate-on-scroll elements (.rv class)
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    const reveal = () => {
      document.querySelectorAll('.rv:not(.in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.05) {
          el.classList.add('in');
        } else {
          io.observe(el);
        }
      });
    };

    reveal();
    window.addEventListener('scroll', reveal, { passive: true });
    return () => {
      window.removeEventListener('scroll', reveal);
      io.disconnect();
    };
  }, [activePage]);

  // Navbar scrolled class switcher
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hero section demo analytical chart height dynamic loader
  useEffect(() => {
    const chartVals = [52, 67, 44, 81, 90, 68, 100];
    const timers = chartVals.map((v, i) => {
      return setTimeout(() => {
        setChartHeights(prev => {
          const next = [...prev];
          next[i] = v * 0.52;
          return next;
        });
      }, 400 + i * 60);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const goto = (id: string) => {
    setActivePage(id);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleMouseMove3d = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -8;
    card.style.transform = `perspective(1200px) rotateX(${y}deg) rotateY(${x}deg) scale(1.01)`;
    card.style.transition = 'transform .1s ease';
  };

  const handleMouseLeave3d = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1)';
    card.style.transition = 'transform .5s ease';
  };

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setHeroTilt({ x, y });
  };

  const handleHeroMouseLeave = () => {
    setHeroTilt({ x: 0, y: 0 });
  };

  const handlePricingMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setPricingTilt({ x, y });
  };

  const handlePricingMouseLeave = () => {
    setPricingTilt({ x: 0, y: 0 });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  };

  const sendForm = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please enter your name and phone number.');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setFormSuccess(true);
    }, 800);
  };

  const chartColors = [
    'rgba(43,91,255,.5)',
    'rgba(43,91,255,.6)',
    'rgba(0,196,207,.5)',
    'rgba(18,209,118,.55)',
    'rgba(43,91,255,.7)',
    'rgba(110,64,201,.55)',
    'rgba(43,91,255,.85)'
  ];

  return (
    <>
      {showOnboarding && (
        <BusinessOnboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
      )}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultTab={authModalTab}
      />
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />

      <div className="nexa-landing">
        <div className="ambient">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>

        {/* ═══ NAV ═══ */}
        <nav id="nav" className={scrolled ? "scrolled" : ""}>
          <div className="nav-inner">
            <a className="nav-brand" onClick={() => goto('home')}>
              <div className="nav-logo-box always-animated-logo">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="nexaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#083344" />
                      <stop offset="100%" stopColor="#115e59" />
                    </linearGradient>
                    <linearGradient id="nexaTealGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="50%" stopColor="#0d9488" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  {/* Bag Handle */}
                  <path d="M 38,28 C 38,14 62,14 62,28" stroke="url(#nexaTealGrad)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                  {/* Bag Body */}
                  <path d="M 24,32 C 24,32 76,32 76,32 L 70,76 C 69,81 31,81 30,76 Z" fill="url(#nexaBgGrad)" stroke="url(#nexaTealGrad)" strokeWidth="3" strokeLinejoin="round" />
                  {/* Dynamic 'N' swoosh and arrow */}
                  <path className="nexa-arrow-path" d="M 20,54 C 20,44 28,38 38,44 C 48,50 46,64 54,68 C 60,71 68,68 72,58 L 80,40" stroke="url(#nexaTealGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  {/* Arrow tip */}
                  <path d="M 68,40 H 80 V 52" stroke="url(#nexaTealGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              </div>
              <span className="nav-brand-name">Nexa<span>StoreOS</span></span>
            </a>
            <ul className="nav-menu">
              <li><a onClick={() => goto('home')} id="nl-home" className={activePage === 'home' ? 'active' : ''}>Home</a></li>
              <li><a onClick={() => goto('product')} id="nl-product" className={activePage === 'product' ? 'active' : ''}>Product</a></li>
              <li><a onClick={() => goto('hiw')} id="nl-hiw" className={activePage === 'hiw' ? 'active' : ''}>How It Works</a></li>
              <li><a onClick={() => goto('about')} id="nl-about" className={activePage === 'about' ? 'active' : ''}>About</a></li>
              <li><a onClick={() => goto('contact')} id="nl-contact" className={activePage === 'contact' ? 'active' : ''}>Contact</a></li>
              <li><a onClick={() => navigate("/agents")} id="nl-agents" className="cursor-pointer hover:text-emerald-500 font-semibold text-emerald-600 dark:text-emerald-400">Agents</a></li>
            </ul>
            <div className="nav-actions">
              <button className="nav-signin" onClick={handleLogin}>Sign in</button>
              <button className="nav-cta" onClick={() => goto('contact')}>Book Free Demo</button>
            </div>
          </div>
        </nav>

        {/* INVITATION REDIRECT ALERTS */}
        {invitedStore && (
          <div className="mx-auto max-w-4xl px-4 pt-24 -mb-12 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 shadow-xl justify-between">
              <span className="flex items-center gap-3 text-center sm:text-left">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  You are invited to join <strong className="font-semibold text-emerald-800 dark:text-white">{invitedStore.name}</strong> as an <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">{invitedStore.role === 'admin' ? 'Admin' : 'Inventory Manager'}</strong>.
                </span>
              </span>
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full py-2 px-6 shadow-md w-full sm:w-auto text-xs active:scale-95 transition-transform" onClick={() => handleGetStarted()}>
                Accept Invitation
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════
             HOME PAGE
        ═══════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activePage === 'home' && (
            <motion.div
              key="home"
              className="page show"
              id="p-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
          {/* HERO */}
          <section className="hero">
            <motion.div 
              className="hero-kicker"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="hk-badge">New</span>
              Now live in Taraba State &nbsp;·&nbsp; First 30 founding clients only
            </motion.div>
            <motion.h1 
              className="display-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              Run your store like<br/><span className="grad-blue">a tech company.</span>
            </motion.h1>
            <motion.p 
              className="body-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
            >
              NexaStoreOS replaces spreadsheets and guesswork with one intelligent system — built for Nigerian retail, supported on the ground.
            </motion.p>
            <motion.div 
              className="hero-btns"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.button 
                className="btn btn-primary" 
                onClick={() => goto('contact')}
                whileHover={{ scale: 1.05, translateY: -2, boxShadow: "0 15px 35px rgba(43,91,255,0.45)" }}
                whileTap={{ scale: 0.98 }}
              >
                Start Free — ₦0 Setup
              </motion.button>
              <motion.button 
                className="btn btn-secondary" 
                onClick={() => goto('hiw')}
                whileHover={{ scale: 1.05, translateY: -2, backgroundColor: "#fff" }}
                whileTap={{ scale: 0.98 }}
              >
                See how it works →
              </motion.button>
            </motion.div>
            <motion.div 
              className="hero-mockup" 
              id="heroCard" 
              onMouseMove={handleHeroMouseMove} 
              onMouseLeave={handleHeroMouseLeave}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                rotateX: heroTilt.y,
                rotateY: heroTilt.x
              }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                mass: 0.6
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="mockup-browser glass-card">
                <div className="browser-bar">
                  <div className="browser-dots"><div className="bd bd-r"></div><div className="bd bd-y"></div><div className="bd bd-g"></div></div>
                  <div className="browser-url">hassan-bala.nexastoreos.com — Admin Dashboard</div>
                  <div style={{ width: '60px' }}></div>
                </div>
                <div className="browser-body">
                  <div className="browser-sidebar">
                    <div className="bs-logo">Nexa<span>OS</span></div>
                    <div className="bs-nav-item on"><span className="bs-nav-dot dot-blue">⊞</span> Dashboard</div>
                    <div className="bs-nav-item"><span className="bs-nav-dot dot-green">+</span> New Sale</div>
                    <div className="bs-nav-item"><span className="bs-nav-dot dot-teal">☰</span> Catalog</div>
                    <div className="bs-nav-item"><span className="bs-nav-dot dot-amber">↑</span> Restocking</div>
                    <div className="bs-nav-item"><span className="bs-nav-dot dot-violet">∿</span> Analytics</div>
                    <div className="bs-nav-item"><span className="bs-nav-dot dot-blue">₦</span> Debt Track</div>
                  </div>
                  <div className="browser-main">
                    <div className="bm-head">
                      <div>
                        <div className="bm-welcome">Good morning, Hassan 👋</div>
                        <div className="bm-date">Wednesday, June 4 · Admin Dashboard</div>
                      </div>
                      <span className="bm-tag">● Store Online</span>
                    </div>
                    <div className="metrics-row">
                      <div className="metric"><div className="metric-val">₦184k</div><div className="metric-label">Revenue</div><span className="metric-delta up">+23%</span></div>
                      <div className="metric"><div className="metric-val">147</div><div className="metric-label">Sales</div><span className="metric-delta up">+8%</span></div>
                      <div className="metric"><div className="metric-val">34</div><div className="metric-label">Top Item</div><span className="metric-delta up">Indomie</span></div>
                      <div className="metric"><div className="metric-val">₦0</div><div className="metric-label">Disputes</div><span className="metric-delta up">Clean</span></div>
                    </div>
                    <div className="chart-block">
                      <div className="chart-header">
                        <span className="chart-title">Weekly Revenue (₦)</span>
                        <span style={{ fontSize: '9px', color: 'var(--ink3)' }}>This week vs last</span>
                      </div>
                      <div className="chart-bars" id="heroChart">
                        {chartHeights.map((h, i) => (
                          <div 
                            key={i} 
                            className="cbar" 
                            style={{ 
								background: chartColors[i], 
								height: `${h}px`
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="item-row"><span className="ir-name">Indomie Carton</span><span><span className="ir-badge">34 units</span><span className="ir-val">₦48,200</span></span></div>
                      <div className="item-row"><span className="ir-name">Vegetable Oil 5L</span><span><span className="ir-badge">18 units</span><span className="ir-val">₦31,500</span></span></div>
                      <div className="item-row"><span className="ir-name">Semovita 2kg</span><span><span className="ir-badge">12 units</span><span className="ir-val">₦22,800</span></span></div>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div 
                className="notif notif-tl shadow-lg"
                animate={{ y: [0, -12, 0], x: [0, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d", translateZ: "40px" }}
              >
                <span className="notif-icon">💳</span>
                <div>
                  <div className="notif-text">Payment received</div>
                  <div className="notif-val">₦12,500 — confirmed</div>
                </div>
              </motion.div>
              <motion.div 
                className="notif notif-bl shadow-lg"
                animate={{ y: [0, -16, 0], x: [0, -4, 0] }}
                transition={{ duration: 7, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d", translateZ: "50px" }}
              >
                <span className="notif-icon">📊</span>
                <div>
                  <div className="notif-text">8 AM Daily Summary</div>
                  <div className="notif-val">Yesterday: ₦184,200</div>
                </div>
              </motion.div>
              <motion.div 
                className="notif notif-br shadow-lg"
                animate={{ y: [0, -10, 0], x: [0, 6, 0] }}
                transition={{ duration: 5, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformStyle: "preserve-3d", translateZ: "35px" }}
              >
                <span className="notif-icon">⚠️</span>
                <div>
                  <div className="notif-text">Low stock alert</div>
                  <div className="notif-val">Rice: 4 bags left</div>
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* PROOF BAND */}
          <div className="proof-band">
            <div className="proof-inner">
              <div className="proof-item"><div className="proof-num">₦0</div><div className="proof-label">Setup cost</div></div>
              <div className="proof-sep"></div>
              <div className="proof-item"><div className="proof-num">10 min</div><div className="proof-label">To go live</div></div>
              <div className="proof-sep"></div>
              <div className="proof-item"><div className="proof-num">30-Day</div><div className="proof-label">Money-back guarantee</div></div>
              <div className="proof-sep"></div>
              <div className="proof-item"><div className="proof-num">3×</div><div className="proof-label">WhatsApp alerts daily</div></div>
              <div className="proof-sep"></div>
              <div className="proof-item"><div className="proof-num">100%</div><div className="proof-label">Local support</div></div>
            </div>
          </div>

          {/* WHY NEXAOS (COMPARISON) */}
          <section className="section">
            <div className="wrap">
              <motion.div 
                className="text-center" 
                style={{ maxWidth: '600px', margin: '0 auto' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <div className="eyebrow ey-blue"><span className="ey-dot"></span>Why NexaOS</div>
                <h2 className="display-lg">Your current tools<br/>are costing you sales.</h2>
                <p className="body-md" style={{ marginTop: '12px' }}>Every spreadsheet crash and missed receipt is revenue you'll never recover.</p>
              </motion.div>
              <motion.div 
                className="cmp-grid"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
              >
                <motion.div 
                  className="cmp-item"
                  variants={fadeUpVariants}
                  whileHover={{ scale: 1.02, translateY: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.12)" }}
                >
                  <div className="cmp-head">
                    <div className="cmp-versus"><span className="cmp-vs-old">WhatsApp Records</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                    <div className="cmp-icon"><MessageCircle className="w-5 h-5 text-blue-500" /></div>
                    <div className="cmp-title">No more digging through chats.</div>
                  </div>
                  <div className="cmp-body">
                    <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">Sales buried in chat threads. Staff dispute transactions. No audit trail, no proof.</div></div>
                    <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Every sale gets a timestamped digital receipt. Full history searchable in seconds.</div></div>
                  </div>
                </motion.div>
                <motion.div 
                  className="cmp-item"
                  variants={fadeUpVariants}
                  whileHover={{ scale: 1.02, translateY: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.12)" }}
                >
                  <div className="cmp-head">
                    <div className="cmp-versus"><span className="cmp-vs-old">Excel / Sheets</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                    <div className="cmp-icon"><BarChart3 className="w-5 h-5 text-teal-500" /></div>
                    <div className="cmp-title">Multi-user. No crashes. Ever.</div>
                  </div>
                  <div className="cmp-body">
                    <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">Crashes when two staff edit at once. One bad formula destroys months of data.</div></div>
                    <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Multiple staff, zero conflicts, live sync. Automated receipts every transaction.</div></div>
                  </div>
                  <div className="cmp-bonus"><Gift className="w-4 h-4 text-emerald-500 inline mr-1.5 shrink-0" /> We import your Excel data free on day one.</div>
                </motion.div>
                <motion.div 
                  className="cmp-item"
                  variants={fadeUpVariants}
                  whileHover={{ scale: 1.02, translateY: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.12)" }}
                >
                  <div className="cmp-head">
                    <div className="cmp-versus"><span className="cmp-vs-old">Basic POS</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                    <div className="cmp-icon"><Package className="w-5 h-5 text-purple-500" /></div>
                    <div className="cmp-title">Complete inventory intelligence.</div>
                  </div>
                  <div className="cmp-body">
                    <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">You know you got paid — but what sold? At what margin? What's running out?</div></div>
                    <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Full inventory tracking on every payment. Know what sold, when, at what margin — automatically.</div></div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* FEATURES */}
          <section className="section feat-section">
            <div className="wrap">
              <motion.div 
                className="text-center animate-fade-in" 
                style={{ maxWidth: '560px', margin: '0 auto' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <div className="eyebrow ey-violet"><span className="ey-dot"></span>The Addiction Engine</div>
                <h2 className="display-lg">Business intelligence,<br/>delivered instantly.</h2>
                <p className="body-md" style={{ marginTop: '12px' }}>Three features that make store owners check NexaOS before WhatsApp.</p>
              </motion.div>
              <div className="feat-main">
                <motion.div 
                  className="feat-phone"
                  initial={{ opacity: 0, scale: 0.93, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ type: "spring", stiffness: 80, damping: 15 }}
                >
                  <div className="phone-glow"></div>
                  <div className="phone-outer">
                    <div className="phone-inner">
                      <div className="phone-notch"></div>
                      <div className="phone-screen min-h-[420px] max-h-[420px] flex flex-col justify-between text-left relative overflow-hidden bg-[#0C1025] select-none text-white p-2.5">
                        {/* Simulated Push Notification alert */}
                        <AnimatePresence>
                          {simAlertNotification && (
                            <motion.div
                              initial={{ opacity: 0, y: -40, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -20, scale: 0.9 }}
                              className="absolute top-2.5 left-2 right-2 z-50 bg-[#1A1F3D] border border-blue-500/30 rounded-xl p-2 shadow-lg flex items-start gap-2 text-[10px]"
                            >
                              <div className="bg-[#2B5BFF]/20 p-1 rounded-lg text-blue-400">
                                <Zap className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-white flex justify-between items-center">
                                  <span>{simAlertNotification.title}</span>
                                  <span className="text-[8px] text-slate-400 font-mono">NexaAlert</span>
                                </div>
                                <div className="text-slate-300 leading-tight mt-0.5">{simAlertNotification.message}</div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* FIXED TOPBAR */}
                        <div className="ps-topbar flex justify-between items-center mb-1.5 shrink-0 px-1">
                          <div className="ps-logo flex items-center gap-1">
                            <span className="text-white font-bold text-[11px]">Nexa<span className="text-[#00C4CF]">OS</span></span>
                          </div>
                          <div className="ps-time text-[9px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 animate-pulse text-teal-400" />
                            8:00 AM
                          </div>
                        </div>

                        {/* SCROLLABLE MAIN BODY */}
                        <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar pb-2">
                          {/* 1. HOME TAB */}
                          {simActiveTab === "home" && (
                            <>
                              {simView === "dashboard" && (
                                <div className="animate-fade-in">
                                  <div className="px-1 mb-3">
                                    <div className="ps-name text-sm font-bold text-white leading-tight">Hassan Bala</div>
                                    <div className="ps-sub text-[8px] text-slate-400">Admin · Store Dashboard</div>
                                  </div>

                                  {/* Grid Actions */}
                                  <div className="ps-grid grid grid-cols-2 gap-2 mb-3">
                                    <button 
                                      onClick={() => { setSimView("add-product"); }}
                                      className="ps-card bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all rounded-xl p-2 text-center"
                                    >
                                      <div className="ps-card-icon flex justify-center mb-1"><Plus className="w-4 h-4 text-slate-300" /></div>
                                      <div className="ps-card-label text-[8px] text-slate-400 uppercase font-semibold tracking-wider">Add Product</div>
                                    </button>

                                    <button 
                                      onClick={() => { setSimView("restock"); }}
                                      className="ps-card bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all rounded-xl p-2 text-center"
                                    >
                                      <div className="ps-card-icon flex justify-center mb-1"><Package className="w-4 h-4 text-emerald-400" /></div>
                                      <div className="ps-card-label text-[8px] text-slate-400 uppercase font-semibold tracking-wider">Restock</div>
                                    </button>

                                    <button 
                                      onClick={() => { setSimView("analytics"); }}
                                      className="ps-card bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all rounded-xl p-2 text-center"
                                    >
                                      <div className="ps-card-icon flex justify-center mb-1"><TrendingUp className="w-4 h-4 text-purple-400" /></div>
                                      <div className="ps-card-label text-[8px] text-slate-400 uppercase font-semibold tracking-wider">Analytics</div>
                                    </button>

                                    <button 
                                      onClick={() => { setSimActiveTab("sales"); setSimView("dashboard"); }}
                                      className="ps-card bg-[#2B5BFF]/10 border border-[#2B5BFF]/30 hover:bg-[#2B5BFF]/20 active:scale-95 transition-all rounded-xl p-2 text-center"
                                    >
                                      <div className="ps-card-icon flex justify-center mb-1"><CreditCard className="w-4 h-4 text-amber-400" /></div>
                                      <div className="ps-card-label text-[8px] text-amber-300 uppercase font-semibold tracking-wider">New Sale</div>
                                    </button>
                                  </div>

                                  {/* Metrics Card */}
                                  <div className="space-y-1.5">
                                    <div 
                                      onClick={() => setSimView("analytics")}
                                      className="ps-metric bg-[#2B5BFF]/10 border border-[#2B5BFF]/20 hover:bg-[#2B5BFF]/15 cursor-pointer rounded-xl p-2.5 flex justify-between items-center transition animate-fade-in"
                                    >
                                      <span className="ps-m-label text-[8px] text-slate-300">Today's Revenue</span>
                                      <span className="ps-m-val font-bold text-xs text-[#00C4CF]">₦{simStats.revenue.toLocaleString()}</span>
                                    </div>

                                    <div className="ps-metric bg-[#2B5BFF]/10 border border-[#2B5BFF]/20 rounded-xl p-2.5 flex justify-between items-center">
                                      <span className="ps-m-label text-[8px] text-slate-300">Top Seller</span>
                                      <span className="ps-m-val font-bold text-xs text-[#00C4CF]">↑ {simStats.units} units</span>
                                    </div>
                                  </div>

                                  {/* Low Stock Warning inside home */}
                                  {simStats.lowStockCount > 0 && (
                                    <div 
                                      onClick={() => { setSimActiveTab("items"); }}
                                      className="mt-2.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 cursor-pointer text-[8.5px] text-amber-400 flex items-center justify-between animate-pulse"
                                    >
                                      <span>⚠️ {simStats.lowStockCount} items running low!</span>
                                      <span className="underline font-bold">View & Restock</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 1.1 ADD PRODUCT VIEW */}
                              {simView === "add-product" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Add Product</span>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Cancel</button>
                                  </div>
                                  <form onSubmit={handleSimAddProduct} className="space-y-2 p-1.5 bg-white/5 border border-white/10 rounded-xl">
                                    <div>
                                      <label className="block text-[8px] text-slate-400 mb-0.5">Product Name</label>
                                      <input 
                                        type="text" 
                                        value={newProdName} 
                                        onChange={e => setNewProdName(e.target.value)}
                                        placeholder="e.g. Peak Milk Can" 
                                        className="w-full bg-[#141833] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <div>
                                        <label className="block text-[8px] text-slate-400 mb-0.5">Price (₦)</label>
                                        <input 
                                          type="number" 
                                          value={newProdPrice} 
                                          onChange={e => setNewProdPrice(e.target.value)}
                                          placeholder="3500" 
                                          className="w-full bg-[#141833] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[8px] text-slate-400 mb-0.5">Stock</label>
                                        <input 
                                          type="number" 
                                          value={newProdStock} 
                                          onChange={e => setNewProdStock(e.target.value)}
                                          placeholder="10" 
                                          className="w-full bg-[#141833] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] text-slate-400 mb-0.5">Category</label>
                                      <select 
                                        value={newProdCat} 
                                        onChange={e => setNewProdCat(e.target.value)}
                                        className="w-full bg-[#141833] border border-white/10 rounded px-1 py-1 text-[9px] text-white focus:outline-none focus:border-blue-500"
                                      >
                                        <option value="Provisions">Provisions</option>
                                        <option value="Drinks">Drinks</option>
                                        <option value="Noodles">Noodles</option>
                                        <option value="Grains">Grains</option>
                                        <option value="Beverages">Beverages</option>
                                      </select>
                                    </div>
                                    <button 
                                      type="submit" 
                                      className="w-full py-1 text-[9px] font-bold bg-[#12D176] text-slate-950 rounded hover:bg-[#12D176]/90 active:scale-95 transition-all mt-1"
                                    >
                                      Save Product
                                    </button>
                                  </form>
                                </div>
                              )}

                              {/* 1.2 RESTOCK VIEW */}
                              {simView === "restock" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Bulk Restock</span>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Cancel</button>
                                  </div>
                                  <div className="space-y-1.5">
                                    {simProducts.map(p => (
                                      <div key={p.id} className="p-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between text-[9px]">
                                        <div className="min-w-0 flex-1 pr-1">
                                          <div className="font-bold text-white leading-tight truncate">{p.name}</div>
                                          <div className="text-[8px] text-slate-400 mt-0.5">Stock: <span className="font-bold text-white">{p.stock}</span></div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <button 
                                            onClick={() => handleSimQuickRestock(p.id, 5)}
                                            className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[8px] hover:bg-emerald-500/30 active:scale-95"
                                          >
                                            +5
                                          </button>
                                          <button 
                                            onClick={() => handleSimQuickRestock(p.id, 20)}
                                            className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[8px] hover:bg-blue-500/30 active:scale-95"
                                          >
                                            +20
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 1.3 DETAILED ANALYTICS VIEW */}
                              {simView === "analytics" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Analytics Hub</span>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Back</button>
                                  </div>
                                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 mb-2">
                                    <div className="text-[8px] text-slate-400 mb-1">Simulated Live Sales Activity</div>
                                    {/* Small custom bar chart */}
                                    <div className="flex items-end justify-between h-14 pt-1 px-1 border-b border-white/10">
                                      <div className="w-2.5 bg-[#2B5BFF] h-8 rounded-t"></div>
                                      <div className="w-2.5 bg-[#00C4CF] h-10 rounded-t"></div>
                                      <div className="w-2.5 bg-[#12D176] h-6 rounded-t"></div>
                                      <div className="w-2.5 bg-amber-500 h-9 rounded-t"></div>
                                      <div className="w-2.5 bg-purple-500 h-11 rounded-t"></div>
                                      <div className="w-2.5 bg-[#2B5BFF] h-14 rounded-t"></div>
                                      <div className="w-2.5 bg-[#00C4CF] h-12 rounded-t"></div>
                                    </div>
                                    <div className="flex justify-between text-[6px] text-slate-500 mt-0.5 px-0.5">
                                      <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <div className="text-[8px] text-slate-400 px-1">Recent Activity Log</div>
                                    {simSales.length === 0 ? (
                                      <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-500 text-center text-[8px]">
                                        No sales logged in this simulation. Go to "New Sale" to record one!
                                      </div>
                                    ) : (
                                      <div className="max-h-24 overflow-y-auto space-y-1 pr-0.5">
                                        {simSales.map((sale) => (
                                          <div key={sale.id} className="p-1 bg-white/5 border border-white/10 rounded flex justify-between items-center text-[8px]">
                                            <div className="min-w-0 flex-1 pr-1">
                                              <div className="font-bold text-white truncate">{sale.items.map(i => `${i.qty}x ${i.name}`).join(', ')}</div>
                                              <div className="text-slate-500 text-[6.5px]">{sale.time} · {sale.paymentMethod}</div>
                                            </div>
                                            <div className="text-[#00C4CF] font-bold shrink-0">₦{sale.total}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* 2. SALES CATALOG TAB (POS) */}
                          {simActiveTab === "sales" && (
                            <div className="animate-fade-in text-[9px]">
                              {simView === "dashboard" && (
                                <>
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Record Sale (POS)</span>
                                    {simCart.length > 0 && (
                                      <button 
                                        onClick={() => setSimView("pos-cart")}
                                        className="text-[9.5px] text-[#00C4CF] font-bold flex items-center gap-1 hover:underline"
                                      >
                                        Cart ({simCart.reduce((sum, item) => sum + item.quantity, 0)}) 🛒
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                    {simProducts.map(p => {
                                      const cartItem = simCart.find(ci => ci.id === p.id);
                                      const quantityInCart = cartItem ? cartItem.quantity : 0;
                                      return (
                                        <div key={p.id} className="p-1.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                                          <div className="min-w-0 flex-1 pr-1">
                                            <div className="font-bold text-white leading-snug truncate">{p.name}</div>
                                            <div className="text-[8px] text-slate-400 mt-0.5">
                                              ₦{p.price.toLocaleString()} · <span className={p.stock <= 5 ? "text-amber-400 font-bold" : "text-slate-400"}>{p.stock} left</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {quantityInCart > 0 && (
                                              <>
                                                <button 
                                                  onClick={() => handleRemoveFromCart(p.id)}
                                                  className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 active:scale-90"
                                                >
                                                  <Minus className="w-2.5 h-2.5" />
                                                </button>
                                                <span className="text-white font-bold text-[9.5px] w-3 text-center">{quantityInCart}</span>
                                              </>
                                            )}
                                            <button 
                                              onClick={() => handleAddToCart(p.id)}
                                              disabled={p.stock === 0}
                                              className="w-4 h-4 rounded-full bg-[#2B5BFF] disabled:bg-slate-700 flex items-center justify-center text-white hover:bg-[#2B5BFF]/90 active:scale-90"
                                            >
                                              <Plus className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Bottom Checkout trigger */}
                                  {simCart.length > 0 && (
                                    <button 
                                      onClick={() => setSimView("pos-cart")}
                                      className="w-full mt-3 py-1.5 bg-[#12D176] hover:bg-[#12D176]/90 active:scale-95 text-slate-950 font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg"
                                    >
                                      <ShoppingCart className="w-3.5 h-3.5" />
                                      Review Order (₦{simCart.reduce((sum, item) => {
                                        const p = simProducts.find(prod => prod.id === item.id);
                                        const finalPrice = item.overridePrice !== undefined ? item.overridePrice : (p ? p.price : 0);
                                        return sum + (finalPrice * item.quantity);
                                      }, 0).toLocaleString()})
                                    </button>
                                  )}
                                </>
                              )}

                              {/* 2.1 POS CART REVIEW */}
                              {simView === "pos-cart" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Review Cart</span>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Add Items</button>
                                  </div>

                                  <div className="space-y-1 max-h-36 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-1.5 mb-2.5">
                                    {simCart.map(cartItem => {
                                      const p = simProducts.find(prod => prod.id === cartItem.id)!;
                                      const activePrice = cartItem.overridePrice !== undefined ? cartItem.overridePrice : p.price;
                                      const isCustomPrice = cartItem.overridePrice !== undefined && cartItem.overridePrice !== p.price;
                                      return (
                                        <div key={p.id} className="flex flex-col border-b border-white/5 py-1.5 last:border-0 text-[8.5px] gap-1">
                                          <div className="flex justify-between items-start">
                                            <div className="min-w-0 flex-1">
                                              <div className="font-bold text-white truncate leading-tight">{p.name}</div>
                                              <div className="text-slate-400 text-[7.5px] mt-0.5">
                                                Qty: <span className="text-white font-mono">{cartItem.quantity}</span> x ₦{p.price.toLocaleString()} (Catalog)
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <div className="text-emerald-400 font-bold font-mono">₦{(activePrice * cartItem.quantity).toLocaleString()}</div>
                                              <button 
                                                onClick={() => handleClearCartItem(p.id)}
                                                className="text-rose-500 hover:text-rose-400 p-0.5"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {/* Custom deal / manual override input for simulation */}
                                          <div className="flex items-center gap-1.5 pl-1">
                                            <span className="text-[7.5px] text-slate-400">Unit Price:</span>
                                            <div className="flex items-center gap-0.5 bg-white/5 px-1 py-0.5 rounded border border-white/10">
                                              <span className="text-[7px] text-slate-500">₦</span>
                                              <SimulatorPriceInput 
                                                initialPrice={activePrice}
                                                onPriceChange={(val) => {
                                                  setSimCart(prev => prev.map(item => item.id === p.id ? { ...item, overridePrice: val } : item));
                                                }}
                                              />
                                            </div>
                                            {isCustomPrice ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setSimCart(prev => prev.map(item => item.id === p.id ? { ...item, overridePrice: undefined } : item));
                                                }}
                                                className="text-[7px] text-amber-400 underline font-bold"
                                              >
                                                Reset
                                              </button>
                                            ) : (
                                              <span className="text-[7px] text-slate-500 italic">Customizable</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Payment method selector */}
                                  <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 space-y-1.5 mb-3.5">
                                    <div className="text-[8px] text-slate-400">Payment Channel</div>
                                    <div className="grid grid-cols-4 gap-1">
                                      {(["Transfer", "Cash", "POS", "Credit"] as const).map(m => (
                                        <button
                                          key={m}
                                          type="button"
                                          onClick={() => setCheckoutPaymentMethod(m)}
                                          className={`py-1 text-[7px] font-bold rounded text-center transition ${checkoutPaymentMethod === m ? "bg-[#2B5BFF] text-white" : "bg-[#141833] text-slate-400 border border-white/5 hover:bg-white/5"}`}
                                        >
                                          {m}
                                        </button>
                                      ))}
                                    </div>

                                    {checkoutPaymentMethod === "Credit" && (
                                      <div className="pt-1.5 animate-fade-in">
                                        <label className="block text-[7.5px] text-slate-400 mb-0.5">Debtor Name (Debt book account)</label>
                                        <input 
                                          type="text"
                                          value={simDebtorName}
                                          onChange={e => setSimDebtorName(e.target.value)}
                                          placeholder="e.g. Mama Blessing"
                                          className="w-full bg-[#141833] border border-white/10 rounded px-1.5 py-0.5 text-[8px] text-white focus:outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Total block */}
                                  <div className="flex justify-between items-center mb-3.5 px-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Order Total:</span>
                                    <span className="text-sm font-bold text-[#00C4CF]">
                                      ₦{simCart.reduce((sum, item) => {
                                        const p = simProducts.find(prod => prod.id === item.id);
                                        const finalPrice = item.overridePrice !== undefined ? item.overridePrice : (p ? p.price : 0);
                                        return sum + (finalPrice * item.quantity);
                                      }, 0).toLocaleString()}
                                    </span>
                                  </div>

                                  <button 
                                    onClick={handleSimCheckout}
                                    className="w-full py-1.5 bg-[#12D176] text-slate-950 font-bold rounded-lg text-[10px] hover:bg-[#12D176]/90 active:scale-95 transition-all shadow-md"
                                  >
                                    Confirm checkout ⚡
                                  </button>
                                </div>
                              )}

                              {/* 2.2 CHECKOUT SUCCESS VIEW */}
                              {simView === "checkout-success" && lastCheckoutDetails && (
                                <div className="text-center py-2 animate-fade-in text-[9px]">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 animate-pulse">
                                    <Zap className="w-5 h-5 animate-bounce" />
                                  </div>
                                  <div className="text-[11px] font-bold text-white leading-tight">Receipt Generated!</div>
                                  <div className="text-[7.5px] text-slate-400 mt-0.5">Ref ID: {lastCheckoutDetails.id}</div>
                                  
                                  <div className="my-2.5 p-2 bg-white/5 border border-white/10 rounded-lg text-left text-[8px] space-y-1 max-w-[200px] mx-auto font-sans">
                                    <div className="flex justify-between"><span className="text-slate-400">Total Charged:</span><span className="font-bold text-white">₦{lastCheckoutDetails.total.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Payment:</span><span className="text-[#00C4CF] font-bold">{lastCheckoutDetails.paymentMethod}</span></div>
                                    <div className="border-t border-white/5 pt-1 text-[7px] text-teal-400 italic flex items-center gap-1 justify-center text-center">
                                      <Smartphone className="w-2.5 h-2.5" /> WhatsApp Receipt Delivered
                                    </div>
                                  </div>

                                  <div className="flex gap-1.5 justify-center max-w-[200px] mx-auto mt-3">
                                    <button 
                                      onClick={() => { setSimView("dashboard"); }}
                                      className="flex-1 py-1 text-[8px] font-bold bg-[#2B5BFF] text-white rounded hover:bg-blue-600 active:scale-95"
                                    >
                                      Sell More
                                    </button>
                                    <button 
                                      onClick={() => { setSimActiveTab("home"); setSimView("dashboard"); }}
                                      className="flex-1 py-1 text-[8px] font-bold bg-white/10 text-slate-300 rounded hover:bg-white/15"
                                    >
                                      Home
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. ITEMS CATALOG TAB */}
                          {simActiveTab === "items" && (
                            <div className="animate-fade-in text-[9px]">
                              <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-[11px] font-bold text-white">Stock Management</span>
                                <span className="text-[7.5px] px-1.5 py-0.5 bg-white/10 rounded font-bold font-mono text-slate-300">
                                  {simProducts.length} SKU
                                </span>
                              </div>

                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                                {simProducts.map(p => (
                                  <div key={p.id} className="p-1.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center text-[8.5px]">
                                    <div className="min-w-0 flex-1 pr-1">
                                      <div className="font-bold text-white truncate leading-snug">{p.name}</div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[7.5px] text-[#00C4CF] font-bold">₦{p.price.toLocaleString()}</span>
                                        <span className="text-slate-500">·</span>
                                        <span className="text-[7.5px] text-slate-400 truncate max-w-[60px]">{p.category}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                      <span className={`px-1.5 py-0.5 rounded-[4px] font-bold text-[7.5px] ${p.stock === 0 ? "bg-rose-500/20 text-rose-300" : p.stock <= 5 ? "bg-amber-500/20 text-amber-300 animate-pulse" : "bg-emerald-500/20 text-emerald-300"}`}>
                                        {p.stock === 0 ? "Out" : `${p.stock} left`}
                                      </span>
                                      <button 
                                        onClick={() => handleSimQuickRestock(p.id, 10)}
                                        className="px-1 py-0.5 bg-[#2B5BFF]/10 hover:bg-[#2B5BFF]/20 border border-blue-500/30 rounded font-bold text-[7px] text-blue-300 active:scale-90 transition-all"
                                        title="Quick restock +10"
                                      >
                                        +10
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 4. MORE FEATURES TAB */}
                          {simActiveTab === "more" && (
                            <div className="animate-fade-in text-[9px]">
                              {simView === "dashboard" && (
                                <div className="space-y-2 px-0.5">
                                  <span className="text-[11px] font-bold text-white block mb-1">More Operations</span>
                                  
                                  {/* Menu buttons */}
                                  <button 
                                    onClick={() => setSimView("debt-book")}
                                    className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between transition"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="bg-amber-500/20 p-1 rounded-lg text-amber-400"><CreditCard className="w-3.5 h-3.5" /></div>
                                      <div>
                                        <div className="font-bold text-white leading-none">Credit Book (Debtors)</div>
                                        <div className="text-[7.5px] text-slate-400 mt-0.5">Track and ping customer balances</div>
                                      </div>
                                    </div>
                                    <span className="text-amber-400 font-bold font-mono text-[9px] bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                                      ₦{simDebtList.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                                    </span>
                                  </button>

                                  <button 
                                    onClick={() => setSimView("alerts-log")}
                                    className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between transition"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="bg-blue-500/20 p-1 rounded-lg text-blue-400"><Smartphone className="w-3.5 h-3.5" /></div>
                                      <div>
                                        <div className="font-bold text-white leading-none">WhatsApp Notification Log</div>
                                        <div className="text-[7.5px] text-slate-400 mt-0.5">Verify background report deliveries</div>
                                      </div>
                                    </div>
                                    <span className="text-[7.5px] text-slate-500">History</span>
                                  </button>

                                  <div className="p-2 bg-[#2B5BFF]/10 border border-[#2B5BFF]/20 rounded-xl mt-4">
                                    <div className="font-bold text-white text-[8px] flex items-center gap-1.5 mb-1.5">
                                      <Zap className="w-3 h-3 text-yellow-400" /> Dynamic App Stats
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[7.5px] text-slate-400 leading-tight">
                                      <div>Total Products: <span className="font-bold text-white">{simProducts.length}</span></div>
                                      <div>Completed Sales: <span className="font-bold text-white">{simSales.length}</span></div>
                                      <div>Simulated Database: <span className="text-teal-400 font-bold">Encrypted</span></div>
                                      <div>Cloud Ingress: <span className="text-emerald-400 font-bold">99.9% Uptime</span></div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4.1 DEBT BOOK SUBVIEW */}
                              {simView === "debt-book" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-bold text-white">Credit & Debt Book</span>
                                    </div>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Back</button>
                                  </div>

                                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center mb-2">
                                    <span className="text-[8px] text-slate-300">Total Active Debts</span>
                                    <span className="font-mono text-[11px] font-bold text-amber-400">
                                      ₦{simDebtList.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                                    {simDebtList.length === 0 ? (
                                      <div className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-500 text-center text-[8px]">
                                        Excellent! No active customer debts on file.
                                      </div>
                                    ) : (
                                      simDebtList.map(d => (
                                        <div key={d.id} className="p-1.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center text-[8.5px]">
                                          <div className="min-w-0 flex-1 pr-1">
                                            <div className="font-bold text-white truncate leading-tight">{d.debtor}</div>
                                            <div className="text-[7.5px] text-slate-400 mt-0.5">{d.date}</div>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="font-mono text-rose-400 font-bold text-[8.5px]">₦{d.amount.toLocaleString()}</span>
                                            <button 
                                              onClick={() => handleCollectDebt(d.id, d.debtor, d.amount)}
                                              className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-bold rounded text-[7.5px] hover:bg-emerald-400 active:scale-90"
                                            >
                                              Pay
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 4.2 ALERTS LOG SUBVIEW */}
                              {simView === "alerts-log" && (
                                <div className="animate-fade-in text-[9px]">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[11px] font-bold text-white">Nexa Alerts Log</span>
                                    <button onClick={() => setSimView("dashboard")} className="text-[9px] text-[#00C4CF] hover:underline">Back</button>
                                  </div>

                                  <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                                    {simNotificationHistory.map(n => (
                                      <div key={n.id} className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] flex items-start gap-1.5 leading-snug">
                                        <div className="mt-0.5 shrink-0">
                                          {n.type === "success" && <span className="text-emerald-400">●</span>}
                                          {n.type === "warning" && <span className="text-amber-400">●</span>}
                                          {n.type === "info" && <span className="text-blue-400">●</span>}
                                        </div>
                                        <div className="flex-1 min-w-0 font-sans">
                                          <p className="text-slate-300 break-words">{n.text}</p>
                                          <span className="text-[6.5px] text-slate-500 font-mono block mt-0.5">{n.time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* FIXED BOTTOM NAVIGATION BAR */}
                        <div className="ps-bar flex justify-around items-center border-t border-white/10 pt-1.5 shrink-0 bg-[#0C1025] px-1">
                          <button 
                            onClick={() => { setSimActiveTab("home"); setSimView("dashboard"); }}
                            className={`ps-bar-item flex-1 text-center transition py-0.5 ${simActiveTab === "home" ? "text-blue-400 font-bold" : "text-slate-500 hover:text-slate-400"}`}
                          >
                            <Home className="w-4 h-4 mx-auto mb-0.5" />
                            <span className="text-[7.5px] block leading-none">Home</span>
                          </button>
                          
                          <button 
                            onClick={() => { setSimActiveTab("sales"); setSimView("dashboard"); }}
                            className={`ps-bar-item flex-1 text-center transition py-0.5 ${simActiveTab === "sales" ? "text-blue-400 font-bold" : "text-slate-500 hover:text-slate-400"}`}
                          >
                            <CreditCard className="w-4 h-4 mx-auto mb-0.5" />
                            <span className="text-[7.5px] block leading-none">Sales</span>
                          </button>
                          
                          <button 
                            onClick={() => { setSimActiveTab("items"); setSimView("dashboard"); }}
                            className={`ps-bar-item flex-1 text-center transition py-0.5 ${simActiveTab === "items" ? "text-blue-400 font-bold" : "text-slate-500 hover:text-slate-400"}`}
                          >
                            <Menu className="w-4 h-4 mx-auto mb-0.5" />
                            <span className="text-[7.5px] block leading-none">Items</span>
                          </button>
                          
                          <button 
                            onClick={() => { setSimActiveTab("more"); setSimView("dashboard"); }}
                            className={`ps-bar-item flex-1 text-center transition py-0.5 ${simActiveTab === "more" ? "text-blue-400 font-bold" : "text-slate-500 hover:text-slate-400"}`}
                          >
                            <MoreHorizontal className="w-4 h-4 mx-auto mb-0.5" />
                            <span className="text-[7.5px] block leading-none">More</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.div 
                    className="fchip fchip-1"
                    animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="fchip-label flex items-center gap-1"><Smartphone className="w-3 h-3 text-blue-500" /> 8 AM Summary</div>
                    <div className="fchip-val">Revenue: ₦184,200</div>
                  </motion.div>
                  <motion.div 
                    className="fchip fchip-2"
                    animate={{ y: [0, -12, 0], x: [0, -3, 0] }}
                    transition={{ duration: 6, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="fchip-label flex items-center gap-1"><Zap className="w-3 h-3 text-red-500 animate-pulse" /> Low stock alert</div>
                    <div className="fchip-val">Indomie: 5 bags left</div>
                  </motion.div>
                  <motion.div 
                    className="fchip fchip-3"
                    animate={{ y: [0, -8, 0], x: [0, 3, 0] }}
                    transition={{ duration: 4, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="fchip-label flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-500" /> Payment confirmed</div>
                    <div className="fchip-val">₦12,500 received</div>
                  </motion.div>
                </motion.div>
                <motion.div 
                  className="feat-list"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <motion.div className="feat-item" variants={fadeUpVariants} whileHover={{ x: 8, transition: { type: "spring", stiffness: 200 } }}>
                    <div className="fi-icon fi-i1"><Sun className="w-5 h-5 text-blue-600" /></div>
                    <div><div className="fi-title font-sans">8 AM Daily Summaries</div><p className="fi-body">Wake up knowing yesterday's exact revenue, top-selling items, and what to restock — delivered to your WhatsApp before your day begins.</p></div>
                  </motion.div>
                  <motion.div className="feat-item" variants={fadeUpVariants} whileHover={{ x: 8, transition: { type: "spring", stiffness: 200 } }}>
                    <div className="fi-icon fi-i2"><Zap className="w-5 h-5 text-emerald-600 animate-pulse" /></div>
                    <div><div className="fi-title">Instant Payment Alerts</div><p className="fi-body">Every payment triggers a WhatsApp ping in real time. Know the moment money hits — with full receipt details and item breakdown.</p></div>
                  </motion.div>
                  <motion.div className="feat-item" variants={fadeUpVariants} whileHover={{ x: 8, transition: { type: "spring", stiffness: 200 } }}>
                    <div className="fi-icon fi-i3"><Package className="w-5 h-5 text-purple-600" /></div>
                    <div><div className="fi-title">Low-Stock Smart Alerts</div><p className="fi-body">NexaOS monitors every product and pings you before you run out. Set thresholds and get instant reorder reminders automatically.</p></div>
                  </motion.div>
                  <motion.div className="feat-item" variants={fadeUpVariants} whileHover={{ x: 8, transition: { type: "spring", stiffness: 200 } }}>
                    <div className="fi-icon fi-i4"><BarChart3 className="w-5 h-5 text-amber-600" /></div>
                    <div><div className="fi-title font-sans">Live Margin Intelligence</div><p className="fi-body">See profit per product in real time. Identify which items make the most money — without any manual calculations.</p></div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section className="section" id="pricing-anchor">
            <div className="wrap">
              <motion.div 
                className="text-center" 
                style={{ maxWidth: '540px', margin: '0 auto' }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
              >
                <div className="eyebrow ey-amber"><span className="ey-dot"></span>Pricing Plan</div>
                <h2 className="display-lg">Start With <span className="grad-blue">Affordable Price</span></h2>
                <p className="body-md" style={{ marginTop: '12px' }}>Choose the perfect scale for your retail business. No setup fees.</p>
              </motion.div>

              {/* Billing Cycle Toggle */}
              <div className="billing-toggle-container">
                <div className="billing-toggle">
                  <div 
                    className="billing-toggle-indicator"
                    style={{
                      left: billingCycle === "monthly" ? "4px" : "calc(50% + 2px)",
                      width: "calc(50% - 6px)"
                    }}
                  />
                  <button 
                    type="button"
                    className={`billing-toggle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                    onClick={() => setBillingCycle("monthly")}
                  >
                    Monthly
                  </button>
                  <button 
                    type="button"
                    className={`billing-toggle-btn ${billingCycle === "annual" ? "active" : ""}`}
                    style={{ position: "relative" }}
                    onClick={() => setBillingCycle("annual")}
                  >
                    Annual
                    <span className="billing-save-badge">
                      Save ~17%
                    </span>
                  </button>
                </div>
              </div>

              {billingCycle === "annual" && (
                <div className="mx-auto max-w-xl text-center -mt-2 mb-6 p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Supercharger Annual Offer:</strong> 2 Months Free applied automatically on all plans!</span>
                </div>
              )}

              {/* Mobile/Tablet Tab Selector */}
              <div className="pricing-selector">
                {PRICING_PLANS.map((plan, index) => (
                  <button
                    key={plan.id}
                    className={`pricing-selector-tab ${activePlanIndex === index ? "active" : ""}`}
                    onClick={() => setActivePlanIndex(index)}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>

              {/* Pricing Cards Swiper / Grid */}
              <div className="pricing-carousel-container">
                <div className="pricing-carousel-viewport">
                  <div 
                    className="pricing-carousel-track"
                    style={{
                      transform: `translateX(-${activePlanIndex * 100}%)`
                    }}
                  >
                    {PRICING_PLANS.map((plan, index) => {
                      const isAnnual = billingCycle === "annual";
                      const currentPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
                      const displayPeriod = isAnnual ? "/year" : "/month";
                      const strikeOutPrice = isAnnual ? plan.strikePrice * 10 : plan.strikePrice;
                      const isExpanded = expandedPlans[index] || false;

                      return (
                        <div className="pricing-carousel-slide" key={plan.id}>
                          <div className={`pricing-card ${plan.glowClass}`}>
                            {plan.badge && <div className="pc-badge">{plan.badge}</div>}
                            <div className="pc-plan">{plan.name}</div>
                            <p className="pc-desc" style={{ minHeight: '44px' }}>{plan.description}</p>
                            
                            <div className="pc-price my-2">
                              {plan.isCustom ? (
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-extrabold text-purple-700 dark:text-purple-400">CUSTOM</span>
                                  <span className="pc-per text-xs font-semibold text-muted-foreground">/ Contact Us</span>
                                </div>
                              ) : (
                                <>
                                  <span className="pc-cur">₦</span>
                                  <span className="pc-num">{currentPrice.toLocaleString()}</span>
                                  <span className="pc-per">/ Month</span>
                                </>
                              )}
                            </div>

                            {/* Product Limit Badge */}
                            {plan.limitBadge && (
                              <div className="my-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 self-start">
                                {plan.limitBadge}
                              </div>
                            )}

                            <ul className="pc-list mt-4">
                              {plan.features.map((feat, fIdx) => (
                                <li key={fIdx}>
                                  <span className="pc-check">✓</span>
                                  <div>{feat}</div>
                                </li>
                              ))}
                            </ul>

                            {/* View details toggle in-place */}
                            <button 
                              className="pricing-card-details-btn"
                              onClick={() => setExpandedPlans(prev => ({ ...prev, [index]: !prev[index] }))}
                            >
                              <span>{isExpanded ? "Hide Detailed Features" : "View Detailed Features"}</span>
                              <span style={{ transform: isExpanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                            </button>

                            {/* In-place Accordion Content */}
                            {isExpanded && (
                              <div className="pc-accordion-container" style={{ marginBottom: '20px' }}>
                                {plan.detailedFeatures.map((cat, catIdx) => (
                                  <div className="pc-accordion-section" key={catIdx}>
                                    <span className="pc-accordion-cat">{cat.category}</span>
                                    <ul className="pc-accordion-list">
                                      {cat.list.map((item, itemIdx) => (
                                        <li key={itemIdx}>
                                          <span className="pc-accordion-bullet">•</span>
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}

                            <motion.button 
                              className="btn btn-primary" 
                              style={{ width: '100%', padding: '15px', fontSize: '15px', marginTop: 'auto' }} 
                              onClick={() => {
                                if (auth.currentUser) {
                                  // Open payment upgrade modal
                                  setUpgradeTier(plan.id as "starter" | "professional" | "enterprise");
                                  setIsPaymentOpen(true);
                                } else {
                                  // Open onboarding/auth modal with selected tier
                                  setSelectedTierForOnboarding(plan.id);
                                  setShowAuthModal(true);
                                }
                              }}
                              whileHover={{ scale: 1.02, translateY: -2 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {plan.buttonText || `Get Started with ${plan.name}`}
                            </motion.button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile/Tablet Swiper Controls */}
              <div className="pricing-navigation lg:hidden">
                <button className="pricing-nav-btn" onClick={() => setActivePlanIndex(prev => prev > 0 ? prev - 1 : PRICING_PLANS.length - 1)}>
                  ←
                </button>
                <div className="pricing-dots">
                  {PRICING_PLANS.map((_, index) => (
                    <button 
                      key={index} 
                      className={`pricing-dot ${activePlanIndex === index ? "active" : ""}`}
                      onClick={() => setActivePlanIndex(index)}
                    />
                  ))}
                </div>
                <button className="pricing-nav-btn" onClick={() => setActivePlanIndex(prev => prev < PRICING_PLANS.length - 1 ? prev + 1 : 0)}>
                  →
                </button>
              </div>

              {/* Compare Matrix Button */}
              <div className="compare-matrix-btn-container">
                <button className="compare-matrix-btn" onClick={() => setShowComparisonModal(true)}>
                  📋 Compare All Plan Features
                </button>
              </div>

              {/* Guarantee Box */}
              <motion.div 
                className="guarantee-box"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                style={{ marginTop: '36px' }}
              >
                <div className="gb-title">🛡️ 30-Day Zero-Risk Guarantee</div>
                <p className="gb-body">If NexaStoreOS doesn't save you more than it costs in the first 30 days, we refund every kobo — no questions asked.</p>
              </motion.div>

              {/* Detailed Comparison Modal */}
              <AnimatePresence>
                {showComparisonModal && (
                  <motion.div 
                    className="comparison-modal-backdrop" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowComparisonModal(false)}
                  >
                    <motion.div 
                      className="comparison-modal" 
                      initial={{ scale: 0.95, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 20 }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="comparison-modal-header">
                        <div>
                          <h3 className="font-sans font-bold text-xl text-slate-900" style={{ fontSize: '20px', fontWeight: 800 }}>Plan Comparison Matrix</h3>
                          <p className="text-xs text-slate-500 mt-1">Detailed feature-by-feature comparison across all tiers</p>
                        </div>
                        <button className="comparison-modal-close" onClick={() => setShowComparisonModal(false)}>
                          ✕
                        </button>
                      </div>
                      <div className="comparison-modal-body">
                        <div style={{ overflowX: "auto" }}>
                          <table className="comparison-table">
                            <thead>
                              <tr>
                                <th>Feature Capability</th>
                                <th>Basic (₦6,500)</th>
                                <th>Pro (₦12,000)</th>
                                <th>Enterprise (₦45,000)</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Physical Store Locations</td>
                                <td>1 Location</td>
                                <td className="font-semibold text-blue-600" style={{ color: 'var(--blue)', fontWeight: 600 }}>Up to 3 Locations</td>
                                <td className="font-semibold text-purple-600" style={{ color: 'var(--violet)', fontWeight: 600 }}>Unlimited Locations</td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Product SKU Capacity</td>
                                <td>Up to 500 SKUs</td>
                                <td className="font-semibold text-blue-600" style={{ color: 'var(--blue)', fontWeight: 600 }}>Unlimited SKUs</td>
                                <td className="font-semibold text-purple-600" style={{ color: 'var(--violet)', fontWeight: 600 }}>Unlimited SKUs</td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>WhatsApp Shift summaries</td>
                                <td>8 AM Summary</td>
                                <td className="font-semibold text-blue-600" style={{ color: 'var(--blue)', fontWeight: 600 }}>8 AM &amp; 8 PM Summaries</td>
                                <td className="font-semibold text-purple-600" style={{ color: 'var(--violet)', fontWeight: 600 }}>Custom Scheduled summaries</td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Real-Time Sale Alerts</td>
                                <td><span className="comparison-checkmark">✓</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Multi-Branch Sync &amp; Net Valuation</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Customer Debt Tracker &amp; Reminders</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Dedicated Priority Partner</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>AI Demand Forecasting</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>SLA-Backed 99.9% Uptime</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>Custom POS Hardware API Integration</td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-dash">—</span></td>
                                <td><span className="comparison-checkmark">✓</span></td>
                              </tr>
                              <tr>
                                <td className="font-medium text-slate-900" style={{ fontWeight: 600 }}>On-Ground Implementation Setup</td>
                                <td>Standard Self-serve</td>
                                <td>Priority migration assistance</td>
                                <td>White-glove deployment &amp; staff training</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* FAQ */}
          <section className="faq-section">
            <div className="faq-wrap">
              <div className="rv" style={{ textAlign: 'center' }}>
                <div className="eyrow ey-teal flex items-center justify-center font-sans tracking-wide mb-4 text-xs font-bold text-[#007E85] uppercase"><span className="ey-dot mr-2"></span>Frequently Asked Questions</div>
                <h2 className="display-lg">Need <span className="grad-blue">Support?</span></h2>
                <p className="body-md" style={{ maxWidth: '480px', margin: '12px auto 0' }}>Everything you need to know about NexaStoreOS. Can't find an answer? <a href="#" onClick={(e) => { e.preventDefault(); goto('contact'); }} style={{ color: 'var(--blue)', fontWeight: 600 }}>Contact us directly.</a></p>
              </div>
              <div className="faq-grid rv">
                {[
                  { q: "How does NexaOS store my data?", a: "All your store data is encrypted on secure cloud servers. You own your data entirely. We use bank-grade SSL — the same technology used by major Nigerian banks — so your business information is always protected." },
                  { q: "How do I organise my records and notes?", a: "Through the collaboration dashboard you can organise records by category, date, and product type. Everything is fully searchable. We're here to help you attain understanding, gain customer trust, and offer appropriate guidance on best practices." },
                  { q: "Does NexaOS support storing data on iCloud?", a: "NexaOS operates on its own secure cloud infrastructure optimised for Nigerian networks. You can export your data anytime as Excel files and back them up wherever you prefer — including iCloud or Google Drive." },
                  { q: "How do I change my email or password?", a: "Go to Settings → Account → Security inside your NexaOS dashboard. You can update your email or password anytime. We also recommend enabling two-factor authentication via your phone number for extra security." },
                  { q: "Can my premium license be used on all devices?", a: "Yes! One subscription covers unlimited devices and unlimited staff accounts. Log in from any phone, tablet, or computer. Your dashboard syncs in real time across all devices so your team is always updated." },
                  { q: "Can I lock access to sensitive records?", a: "Yes. You can set role-based access so only authorised staff can view sensitive data like margins, debt records, and financial summaries. Each staff member gets their own login with exactly the permissions you assign." },
                  { q: "How long does a standard project setup take?", a: "Most stores go live within 10 minutes. Our team handles everything — account setup, product import, WhatsApp configuration, and staff training. You don't touch a single technical setting." },
                  { q: "What about data security & NDA agreement?", a: "We take confidentiality seriously. Your business data is never shared with third parties. All Nexa staff sign NDAs. Our full privacy policy is available on request. We comply with Nigerian data protection standards." }
                ].map((faq, idx) => (
                  <div key={idx} className={`faq-item ${openFaq[idx] ? 'open' : ''}`}>
                    <button className="faq-q font-bold" onClick={() => toggleFaq(idx)}>{faq.q} <span className="faq-icon">{openFaq[idx] ? '✕' : '+'}</span></button>
                    <div className="faq-a" style={{ maxHeight: openFaq[idx] ? '400px' : '0' }}>
                      <div className="faq-a-inner">{faq.a}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COMMUNITY HUB */}
          <section className="community-section">
            <div className="wrap">
              <div className="rv" style={{ textAlign: 'center' }}>
                <div className="eyebrow ey-violet" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>Notero Community</div>
                <h2 className="display-lg">Join Into <span className="grad-warm">Our Hub</span></h2>
                <p className="body-md" style={{ maxWidth: '440px', margin: '12px auto 0' }}>Connect with store owners, share business tips, and stay ahead of new features.</p>
              </div>
              <div className="community-cards rv">
                <div className="community-card">
                  <div className="cc-icon-wrap cc-icon-gh">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#1B1F23">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div className="cc-title font-sans">Github</div>
                  <div className="cc-desc">Open Source &amp; Commit Code</div>
                </div>
                <div className="community-card">
                  <div className="cc-icon-wrap cc-icon-tw">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#1DA1F2">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <div className="cc-title font-sans">Twitter</div>
                  <div className="cc-desc">Latest News &amp; Updates</div>
                </div>
                <div className="community-card">
                  <div className="cc-icon-wrap cc-icon-tg">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#0088CC">
                      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <div className="cc-title font-sans">Telegram</div>
                  <div className="cc-desc">Channel for Community</div>
                </div>
              </div>
            </div>
          </section>

          <section className="cta-strip">
            <h2 className="display-lg rv">See it live in your store.</h2>
            <p className="body-lg rv d1">Book a free demo. We'll set everything up for you — completely free.</p>
            <div className="cta-btns rv d2">
              <button className="btn btn-white" onClick={() => goto('contact')}>Book Free Demo</button>
              <button className="btn btn-ghost" onClick={() => handleTryDemo()}>Try Local Demo →</button>
            </div>
          </section>
        </motion.div>
      )}


        {/* ═══════════════════════════════
             PRODUCT PAGE
        ═══════════════════════════════ */}
          {activePage === 'product' && (
            <motion.div
              key="product"
              className="page show"
              id="p-product"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
          <section className="page-hero section">
            <div className="rv">
              <div className="eyebrow ey-teal" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>Product</div>
              <h1 className="display-xl" style={{ maxWidth: '800px', margin: '0 auto 18px' }}>One platform.<br/><span className="grad-blue">Six superpowers.</span></h1>
              <p className="body-lg" style={{ maxWidth: '480px', margin: '0 auto' }}>Everything your store needs — from sales to analytics to debt management — in one clean dashboard.</p>
            </div>
          </section>
          <section className="section" style={{ paddingTop: '20px' }}>
            <div className="wrap">
              <div className="product-showcase rv">
                <div className="showcase-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store className="w-20 h-20 text-teal-500" />
                </div>
                <div className="showcase-content">
                  <div className="eyebrow ey-teal"><span className="ey-dot"></span>Your Smart Dashboard</div>
                  <h3 className="display-md" style={{ marginBottom: '12px' }}>The dashboard<br/>your staff will love.</h3>
                  <p className="body-md">Clean, intuitive, and built for speed. Process a sale in under 10 seconds. Your team learns it in one session.</p>
                  <div className="sc-tags">
                    <span className="sc-tag sc-tag-blue flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Mobile-first</span>
                    <span className="sc-tag sc-tag-green flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Real-time sync</span>
                    <span className="sc-tag sc-tag-amber flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Built for Nigeria</span>
                  </div>
                </div>
              </div>
              <div className="rv" style={{ marginBottom: '20px' }}>
                <div className="eyebrow ey-blue"><span className="ey-dot"></span>Six Core Modules</div>
                <h3 className="display-md">One system. Six superpowers.</h3>
              </div>
              <div className="modules-grid">
                <div className="module-card rv d1"><div className="mc-icon mc-i1"><ShoppingCart className="w-5 h-5 text-[#2b5bff]" /></div><div className="mc-title">Product Catalog</div><p className="mc-body">Add unlimited products with prices, categories, images, and stock levels. Bulk-import from Excel free on day one.</p></div>
                <div className="module-card rv d2"><div className="mc-icon mc-i2"><Package className="w-5 h-5 text-[#12d176]" /></div><div className="mc-title">Inventory &amp; Restocking</div><p className="mc-body">Real-time stock tracking with automated reorder alerts delivered straight to your WhatsApp instantly.</p></div>
                <div className="module-card rv d3"><div className="mc-icon mc-i3"><TrendingUp className="w-5 h-5 text-[#6e40c9]" /></div><div className="mc-title font-sans">Analytics &amp; Reports</div><p className="mc-body">Daily summaries, top sellers, revenue trends — every number you need, delivered at 8 AM without lifting a finger.</p></div>
                <div className="module-card rv d1"><div className="mc-icon mc-i4"><CreditCard className="w-5 h-5 text-[#f5a623]" /></div><div className="mc-title">New Sale &amp; Receipts</div><p className="mc-body">Process any sale in seconds. Automated digital receipts sent to customers instantly with full payment history.</p></div>
                <div className="module-card rv d2"><div className="mc-icon mc-i5"><DollarSign className="w-5 h-5 text-[#00c4cf]" /></div><div className="mc-title">Debt Management</div><p className="mc-body">Track credit sales and outstanding balances. Send automated payment reminders. Collect what you're owed.</p></div>
                <div className="module-card rv d3"><div className="mc-icon mc-i6"><Users className="w-5 h-5 text-[#f03a6e]" /></div><div className="mc-title">Multi-User Access</div><p className="mc-body">Let multiple staff work simultaneously with no conflicts. Assign roles and track who sold what, when.</p></div>
              </div>
            </div>
          </section>
          <section className="cta-strip">
            <h2 className="display-lg rv">See it live in your store.</h2>
            <p className="body-lg rv d1">Book a free demo. We'll set everything up for you.</p>
            <div className="cta-btns rv d2">
              <button className="btn btn-white" onClick={() => goto('contact')}>Book Free Demo</button>
              <button className="btn btn-ghost" onClick={() => handleTryDemo()}>Try Local Demo →</button>
            </div>
          </section>
        </motion.div>
      )}


        {/* ═══════════════════════════════
             HOW IT WORKS PAGE
        ═══════════════════════════════ */}
          {activePage === 'hiw' && (
            <motion.div
              key="hiw"
              className="page show"
              id="p-hiw"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
          <section className="page-hero section">
            <div className="rv">
              <div className="eyebrow ey-green" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>How It Works</div>
              <h1 className="display-xl" style={{ maxWidth: '800px', margin: '0 auto 18px' }}>From signup to first sale<br/>in <span className="grad-green">under 10 minutes.</span></h1>
              <p className="body-lg" style={{ maxWidth: '480px', margin: '0 auto' }}>No technical knowledge required. Our team handles everything — including importing your existing data.</p>
            </div>
          </section>
          <section className="section" style={{ paddingTop: '20px' }}>
            <div className="wrap-sm">
              <div className="steps-timeline">
                <div className="step-item rv d1"><div className="step-circle">1</div><div className="step-content"><div className="step-title">Visit nexastoreos.com or install the app</div><p className="step-body">Open the website on any phone or laptop. Works on Android, iOS, and all browsers. No app store required to get started.</p></div></div>
                <div className="step-item rv d2"><div className="step-circle">2</div><div className="step-content"><div className="step-title">Register with email or phone number</div><p className="step-body">Enter your registered email or phone. Request a one-time PIN via SMS for instant, secure access to your store.</p></div></div>
                <div className="step-item rv d3"><div className="step-circle">3</div><div className="step-content"><div className="step-title">Complete your store profile in 3 minutes</div><p className="step-body font-sans">Set your store name, business type, and product categories. Our 4-step onboarding wizard guides you through everything.</p></div></div>
                <div className="step-item rv d1"><div className="step-circle">4</div><div className="step-content"><div className="step-title">Choose your modules</div><p className="step-body">Activate Sales, Inventory, Analytics, Debt Management — or all of them. Every module can be changed anytime in Settings.</p></div></div>
                <div className="step-item rv d2"><div className="step-circle">5</div><div className="step-content"><div className="step-title">We import your existing data free</div><p className="step-body">Have Excel records, product lists, or customer data? Our team migrates everything at zero cost so you start with full history intact.</p></div></div>
                <div className="step-item rv d3"><div className="step-circle">6</div><div className="step-content"><div className="step-title">Your dashboard goes live</div><p className="step-body font-sans">Start adding products and making sales. Your first WhatsApp daily summary arrives at 8 AM tomorrow. That's it — you're running a tech-powered store.</p></div></div>
              </div>
            </div>
            <div className="wrap" style={{ marginTop: '80px' }}>
              <div className="rv" style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div className="eyebrow ey-violet" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>Everything Included</div>
                <h3 className="display-md">Every tool in one place.</h3>
              </div>
              <div className="feats2">
                <div className="feat2-card rv d1"><div className="f2c-icon"><BarChart3 className="w-6 h-6 text-blue-600" /></div><div className="f2c-title font-sans">Business Overview</div><p className="f2c-body">See total sales, revenue trends, and daily performance at a glance from your dashboard home screen.</p></div>
                <div className="feat2-card rv d2"><div className="f2c-icon"><Award className="w-6 h-6 text-amber-500" /></div><div className="f2c-title font-sans">Top Sellers &amp; Customers</div><p className="f2c-body">Identify your best products and most valuable customers automatically. Know what to stock more of.</p></div>
                <div className="feat2-card rv d3"><div className="f2c-icon"><DollarSign className="w-6 h-6 text-teal-600" /></div><div className="f2c-title">Debt Management &amp; Collections</div><p className="f2c-body">Track credit sales and outstanding payments. Send automated reminders to collect what you're owed.</p></div>
                <div className="feat2-card rv d4"><div className="f2c-icon"><Bell className="w-6 h-6 text-purple-600 animate-pulse" /></div><div className="f2c-title font-sans">Real-Time WhatsApp Alerts</div><p className="f2c-body">Instant pings for every payment, low stock event, and daily summary. Your store talks to you constantly.</p></div>
              </div>
            </div>
          </section>
          <section className="cta-strip">
            <h2 className="display-lg rv">Ready to get started?</h2>
            <p className="body-lg rv d1">Our team handles the full setup. Zero technical knowledge needed.</p>
            <div className="cta-btns rv d2">
              <button className="btn btn-white" onClick={() => goto('contact')}>Book Free Demo</button>
              <button className="btn btn-ghost" onClick={() => goto('product')}>See All Features →</button>
            </div>
          </section>
        </motion.div>
      )}


        {/* ═══════════════════════════════
             ABOUT PAGE
        ═══════════════════════════════ */}
          {activePage === 'about' && (
            <motion.div
              key="about"
              className="page show"
              id="p-about"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
          <section className="page-hero section">
            <div className="rv">
              <div className="eyebrow ey-blue" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>About Us</div>
              <h1 className="display-xl" style={{ maxWidth: '820px', margin: '0 auto 18px' }}>Built locally.<br/><span className="grad-blue">Supported locally.</span></h1>
              <p className="body-lg" style={{ maxWidth: '500px', margin: '0 auto' }}>We are Nexa Digital Solutions LTD — on the ground in Taraba State, not a distant office sending email tickets.</p>
            </div>
          </section>

          <div className="about-split rv">
            <div>
              <div className="ceo-card-wrap">
                <div className="ceo-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div className="flex justify-center items-center w-20 h-20 rounded-full bg-slate-800/80 border-2 border-teal-500/30 mx-auto mb-4 shadow-xl">
                      <User className="w-10 h-10 text-teal-400" />
                    </div>
                    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 800, color: '#fff' }}>Abdulrasheed Mahmoud Bello</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.65)', marginTop: '4px' }}>CEO · Nexa Digital Solutions LTD</div>
                  </div>
                  <div className="ceo-photo-overlay font-sans"></div>
                </div>
                <div className="ceo-details">
                  <div className="ceo-name">Abdulrasheed Mahmoud Bello</div>
                  <div className="ceo-title-badge">CEO · Nexa Digital Solutions LTD</div>
                  <div className="ceo-contacts">
                    <a href="tel:09038026109" className="cc-link flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />090-380-26109</a>
                    <a href="tel:08132321056" className="cc-link flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />081-323-21056</a>
                    <a href="#" className="cc-link flex items-center gap-1.5" onClick={e => e.preventDefault()}><MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />Lamurde St, Barade, Jalingo</a>
                    <a href="#" className="cc-link flex items-center gap-1.5" onClick={e => e.preventDefault()}><Globe className="w-3.5 h-3.5 text-teal-400 shrink-0" />@NexaTechs</a>
                  </div>
                </div>
              </div>
            </div>
            <div className="about-narrative rv d1">
              <div className="eyebrow ey-blue"><span className="ey-dot"></span>Our Story</div>
              <h2 className="display-lg" style={{ marginBottom: '22px' }}>We are here<br/>on the ground.</h2>
              <blockquote>"Lagos companies can't teleport staff to Taraba State. We are here on the ground — building intelligent business systems right where you operate, so you always have the local support you need to scale."</blockquote>
              <p>Nexa Digital Solutions LTD isn't remote software with an email ticket system. We're a local partner who walks into your store, understands your operation, and ensures the system works — not just on day one, but permanently.</p>
              <p>We believe every Nigerian retailer deserves the same intelligence tools that big supermarket chains use. NexaStoreOS brings that power to local shops, provision stores, and distributors — at a price that makes sense for local reality.</p>
              <div className="about-tags">
                <span className="a-tag flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Jalingo, Taraba State</span>
                <span className="a-tag flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Mobile-First Design</span>
                <span className="a-tag flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Built for Nigeria</span>
                <span className="a-tag flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-teal-500 shrink-0" /> Personal Support</span>
              </div>
              <button className="btn btn-primary" onClick={() => goto('contact')}>Book Free Demo →</button>
            </div>
          </div>

          <section className="section" style={{ paddingTop: '60px' }}>
            <div className="wrap">
              <div className="rv" style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div className="eyebrow ey-violet" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>Our Values</div>
                <h3 className="display-md">Why clients trust Nexa.</h3>
              </div>
              <div className="value-grid">
                <div className="value-card rv d1"><div className="vc-icon"><Users className="w-7 h-7 text-blue-600" /></div><div className="vc-title">Local Presence</div><p className="vc-body">We're in Jalingo — not a chatbot. Real people who come to your store, set everything up, and stay reachable always.</p></div>
                <div className="value-card rv d2"><div className="vc-icon"><ShieldCheck className="w-7 h-7 text-emerald-600" /></div><div className="vc-title">Zero-Risk Guarantee</div><p className="vc-body">30-day full refund if NexaOS doesn't save you more than it costs. We mean it — every kobo back, no questions.</p></div>
                <div className="value-card rv d3"><div className="vc-icon"><Zap className="w-7 h-7 text-amber-500" /></div><div className="vc-title">Fast Onboarding</div><p className="vc-body">Live in under 10 minutes. We handle the technical setup completely. You focus on selling.</p></div>
              </div>
            </div>
          </section>

          <section className="cta-strip">
            <h2 className="display-lg rv">Come work with us.</h2>
            <p className="body-lg rv d1">Local business. Local intelligence. Local support.</p>
            <div className="cta-btns rv d2">
              <button className="btn btn-white" onClick={() => goto('contact')}>Get in Touch</button>
              <button className="btn btn-ghost flex items-center justify-center gap-2" onClick={() => window.location.href = "tel:09038026109"}><Phone className="w-4 h-4 text-blue-600 shrink-0" /> Call Now →</button>
            </div>
          </section>
        </motion.div>
      )}


        {/* ═══════════════════════════════
             CONTACT PAGE
        ═══════════════════════════════ */}
          {activePage === 'contact' && (
            <motion.div
              key="contact"
              className="page show"
              id="p-contact"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
          <section className="page-hero section">
            <div className="rv wrap-xs">
              <div className="eyebrow ey-blue" style={{ justifyContent: 'center' }}><span className="ey-dot"></span>Contact Us</div>
              <h1 className="display-xl">Book your<br/><span className="grad-blue font-sans">free demo.</span></h1>
              <p className="body-lg">Our team configures your store at zero cost. First 30 clients get full onboarding waived.</p>
            </div>
          </section>
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="contact-layout">
                <div className="contact-info rv">
                  <div className="ci-brand">
                    <div className="ci-brand-logo">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4L10 4L14 12L10 20H4L8 12L4 4Z" fill="white" opacity=".9"/>
                        <path d="M12 4H20L16 12L20 20H12L16 12L12 4Z" fill="white" opacity=".55"/>
                      </svg>
                    </div>
                    <p className="ci-brand-sub"><strong style={{ color: 'var(--ink)' }}>Nexa Digital Solutions LTD</strong><br/>Building Intelligent Business Systems<br/>Jalingo, Taraba State · Nigeria</p>
                  </div>
                  <div className="ci-method"><div className="ci-m-icon flex items-center justify-center"><Phone className="w-4 h-4 text-blue-600" /></div><div><div className="ci-m-label">Primary Phone</div><div className="ci-m-val">090-380-26109</div></div></div>
                  <div className="ci-method"><div className="ci-m-icon flex items-center justify-center"><MessageCircle className="w-4 h-4 text-green-600" /></div><div><div className="ci-m-label font-sans">WhatsApp</div><div className="ci-m-val">081-323-21056</div></div></div>
                  <div className="ci-method"><div className="ci-m-icon flex items-center justify-center"><MapPin className="w-4 h-4 text-rose-500" /></div><div><div className="ci-m-label">Office Location</div><div className="ci-m-val">Lamurde St, Barade, Jalingo</div></div></div>
                  <div className="ci-method"><div className="ci-m-icon flex items-center justify-center"><Globe className="w-4 h-4 text-teal-500" /></div><div><div className="ci-m-label">Website</div><div className="ci-m-val">nexastoreos.com</div></div></div>
                  <div className="ci-method"><div className="ci-m-icon flex items-center justify-center"><Smartphone className="w-4 h-4 text-purple-600" /></div><div><div className="ci-m-label">Social Media</div><div className="ci-m-val">@NexaTechs</div></div></div>
                  <div className="ci-note flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500 shrink-0 animate-pulse" /><span><strong style={{ color: 'var(--blue)' }}>Response time:</strong> We respond within 2 hours during business hours. For urgent matters, call directly.</span></div>
                </div>
                <div className="contact-form-wrap rv d1">
                  <div className="cf-title font-sans">Request a Free Demo</div>
                  <p className="cf-sub">Fill in your details and we'll reach out within 2 hours to schedule your setup session.</p>
                  
                  {formSuccess ? (
                    <div className="form-success" style={{ display: 'block' }}>✅ Request sent! We'll contact you within 2 hours.</div>
                  ) : (
                    <>
                      <div className="form-row2">
                        <div className="fg">
                          <label>Full Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Hassan Bala" 
                            value={formData.name} 
                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                          />
                        </div>
                        <div className="fg">
                          <label>Phone Number</label>
                          <input 
                            type="tel" 
                            placeholder="08012345678" 
                            value={formData.phone} 
                            onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                          />
                        </div>
                      </div>
                      <div className="fg">
                        <label>Business Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Bala General Store" 
                          value={formData.bizName} 
                          onChange={e => setFormData({ ...formData, bizName: e.target.value })} 
                        />
                      </div>
                      <div className="fg">
                        <label>Business Type</label>
                        <select 
                          value={formData.bizType} 
                          onChange={e => setFormData({ ...formData, bizType: e.target.value })}
                        >
                          <option value="">Select your business type...</option>
                          <option>Provision / Grocery Store</option>
                          <option>Wholesale / Distribution</option>
                          <option>Pharmacy / Chemist</option>
                          <option>Supermarket</option>
                          <option>Electronics Shop</option>
                          <option>Other Retail</option>
                        </select>
                      </div>
                      <div className="fg">
                        <label>Message (optional)</label>
                        <textarea 
                          placeholder="Tell us about your store — size, current tools, what you need help with..." 
                          value={formData.message} 
                          onChange={e => setFormData({ ...formData, message: e.target.value })} 
                        />
                      </div>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', padding: '17px', fontSize: '15px' }} 
                        onClick={sendForm}
                        disabled={isSending}
                      >
                        {isSending ? 'Sending...' : "Send Request — We'll Call You Back"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
          <section className="cta-strip">
            <h2 className="display-lg rv">Zero risk. Full support.</h2>
            <p className="body-lg rv d1">30-day money-back guarantee. Setup, training, and data migration all free.</p>
            <div className="cta-btns rv d2">
              <button className="btn btn-white flex items-center justify-center gap-2" onClick={() => window.location.href = "tel:09038026109"}><Phone className="w-4 h-4 text-blue-600 shrink-0" /> Call: 090-380-26109</button>
              <button className="btn btn-ghost" onClick={() => handleTryDemo()}>Try Local Demo →</button>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>


        {/* ═══ ANIMATED FOOTER ═══ */}
        <footer>
          <div className="footer-top">
            <div className="footer-grid">

              {/* Brand Column */}
              <div>
                <div className="footer-brand-row">
                  <div className="f-brand-icon always-animated-logo">
                    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="nexaBgGradFooter" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#083344" />
                          <stop offset="100%" stopColor="#115e59" />
                        </linearGradient>
                        <linearGradient id="nexaTealGradFooter" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="50%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      {/* Bag Handle */}
                      <path d="M 38,28 C 38,14 62,14 62,28" stroke="url(#nexaTealGradFooter)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                      {/* Bag Body */}
                      <path d="M 24,32 C 24,32 76,32 76,32 L 70,76 C 69,81 31,81 30,76 Z" fill="url(#nexaBgGradFooter)" stroke="url(#nexaTealGradFooter)" strokeWidth="3" strokeLinejoin="round" />
                      {/* Dynamic 'N' swoosh and arrow */}
                      <path className="nexa-arrow-path" d="M 20,54 C 20,44 28,38 38,44 C 48,50 46,64 54,68 C 60,71 68,68 72,58 L 80,40" stroke="url(#nexaTealGradFooter)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      {/* Arrow tip */}
                      <path d="M 68,40 H 80 V 52" stroke="url(#nexaTealGradFooter)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <span className="f-brand-name font-sans">Nexa<span>StoreOS</span></span>
                </div>
                <p className="footer-brand-text">Building Intelligent Business Systems for Nigerian retailers. Locally supported, locally trusted.</p>

                {/* Social Media Handles */}
                <div className="footer-socials">
                  <a href="https://x.com/NexaTechs" target="_blank" rel="noopener noreferrer" className="fs-btn">
                    <span className="fs-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </span>@NexaTechs
                  </a>
                  <a href="https://instagram.com/NexaTechs" target="_blank" rel="noopener noreferrer" className="fs-btn">
                    <span className="fs-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0 3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </span>Instagram
                  </a>
                  <a href="https://wa.me/2348132321056" target="_blank" rel="noopener noreferrer" className="fs-btn">
                    <span className="fs-icon">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </span>WhatsApp
                  </a>
                </div>

                <div className="footer-contact-list">
                  <a href="tel:09038026109" className="fc-contact-item flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />090-380-26109</a>
                  <a href="tel:08132321056" className="fc-contact-item flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />081-323-21056</a>
                  <span className="fc-contact-item flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />Lamurde St, Barade, Jalingo</span>
                </div>
              </div>

              {/* Platform links */}
              <div>
                <div className="fc-col-head">Platform</div>
                <button className="fc-link" onClick={() => goto('product')}>Product Overview</button>
                <button className="fc-link" onClick={() => goto('hiw')}>How It Works</button>
                <button className="fc-link" onClick={() => goto('home')}>Pricing</button>
                <button className="fc-link" onClick={() => handleGetStarted()}>Sign Up Free</button>
                <button className="fc-link" onClick={() => goto('contact')}>Book a Demo</button>
                <button className="fc-link text-emerald-400 font-semibold" onClick={() => navigate("/agents")}>Agent Partner Program</button>
              </div>

              {/* Company links */}
              <div>
                <div className="fc-col-head">Company</div>
                <button className="fc-link" onClick={() => goto('about')}>About Us</button>
                <button className="fc-link" onClick={() => goto('contact')}>Contact Us</button>
                <button className="fc-link" onClick={() => goto('contact')}>Get Support</button>
                <button className="fc-link" onClick={() => goto('about')}>Our Values</button>
                <button className="fc-link" onClick={(e) => { e.preventDefault(); setLegalModalTab("privacy"); setLegalModalOpen(true); }}>Privacy Policy</button>
                <button className="fc-link" onClick={(e) => { e.preventDefault(); setLegalModalTab("terms"); setLegalModalOpen(true); }}>Terms of Service</button>
              </div>

              {/* Location & hours */}
              <div>
                <div className="fc-col-head">Location</div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.45)', lineHeight: '1.85', marginBottom: '10px' }}>Lamurde Street, Barade<br/>Jalingo, Taraba State<br/>Nigeria</p>
                <a href="https://nexastoreos.com" target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', display: 'block', marginBottom: '4px' }}>nexastoreos.com ↗</a>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', display: 'block' }}>hello@nexastoreos.com</span>
                <div className="footer-hrs-box">
                  <div className="footer-hrs-label">Business Hours</div>
                  <div className="footer-hrs-val">Mon – Sat: 8AM – 6PM<br/>Support: 7 days / week</div>
                </div>
              </div>

            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2025 Nexa Digital Solutions LTD · All rights reserved</span>
            <div className="footer-bottom-right">
              <div className="footer-pulse"><span className="pulse-dot"></span>All systems operational</div>
              <span style={{ color: 'rgba(255,255,255,.2)' }}>|</span>
              <span>@NexaTechs</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
