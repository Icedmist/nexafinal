import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Package,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";
import nexaLogo from "@/assets/nexa-logo.svg";
import type { Store } from "@/types/tenant";
import "./landing.css";

export default function LandingPage() {
  const { store, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("home");
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does NexaOS store my data?",
      a: "All your store data is encrypted on secure cloud servers. You own your data entirely. We use bank-grade SSL — the same technology used by major Nigerian banks — so your business information is always protected."
    },
    {
      q: "How do I organise my records and notes?",
      a: "Through the collaboration dashboard you can organise records by category, date, and product type. Everything is fully searchable. We're here to help you attain understanding, gain customer trust, and offer appropriate guidance on best practices."
    },
    {
      q: "Does NexaOS support storing data on iCloud?",
      a: "NexaOS operates on its own secure cloud infrastructure optimised for Nigerian networks. You can export your data anytime as Excel files and back them up wherever you prefer — including iCloud or Google Drive."
    },
    {
      q: "How do I change my email or password?",
      a: "Go to Settings → Account → Security inside your NexaOS dashboard. You can update your email or password anytime. We also recommend enabling two-factor authentication via your phone number for extra security."
    },
    {
      q: "Can my premium license be used on all devices?",
      a: "Yes! One subscription covers unlimited devices and unlimited staff accounts. Log in from any phone, tablet, or computer. Your dashboard syncs in real time across all devices so your team is always updated."
    },
    {
      q: "Can I lock access to sensitive records?",
      a: "Yes. You can set role-based access so only authorised staff can view sensitive data like margins, debt records, and financial summaries. Each staff member gets their own login with exactly the permissions you assign."
    },
    {
      q: "How long does a standard project setup take?",
      a: "Most stores go live within 10 minutes. Our team handles everything — account setup, product import, WhatsApp configuration, and staff training. You don't touch a single technical setting."
    },
    {
      q: "What about data security & NDA agreement?",
      a: "We take confidentiality seriously. Your business data is never shared with third parties. All Nexa staff sign NDAs. Our full privacy policy is available on request. We comply with Nigerian data protection standards."
    }
  ];
  
  // Weekly revenue chart state
  const vals = [52, 67, 44, 81, 90, 68, 100];
  const cols = ["#2B5BFF", "#2B5BFF", "#00C4CF", "#12D176", "#2B5BFF", "#6E40C9", "#2B5BFF"];
  const [chartHeights, setChartHeights] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Contact form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    biz: "",
    type: "",
    msg: ""
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (store && user) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [store, user, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (activeTab === "home") {
      const timer = setTimeout(() => {
        setChartHeights(vals.map(v => v * 0.52));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setChartHeights([0, 0, 0, 0, 0, 0, 0]);
    }
  }, [activeTab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".rv");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeTab]);

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A1F44]">
        <div className="h-8 w-8 rounded-full border-4 border-[#00C2FF]/20 border-t-[#00C2FF]" />
      </div>
    );
  }

  if (store) {
    if (user) return null;
    return <StoreLoginPage store={store} />;
  }

  const navigateTo = (tab: string, elementId?: string) => {
    setActiveTab(tab);
    if (elementId) {
      setTimeout(() => {
        document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Please enter your name and phone number.");
      return;
    }
    setIsSubmitted(true);
    toast.success("Request sent! We'll contact you within 2 hours.");
  };

  return (
    <div id="nexa-landing">
      <div className="ambient">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <nav id="nav" className={scrolled ? "scrolled" : ""}>
        <div className="nav-inner">
          <a className="nav-brand" onClick={() => navigateTo("home")} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src={nexaLogo} alt="NexaStoreOS Logo" style={{ height: "36px", width: "auto" }} />
          </a>
          <ul className="nav-menu">
            <li><a onClick={() => navigateTo("home")} id="nl-home" className={activeTab === "home" ? "active" : ""}>Home</a></li>
            <li><a onClick={() => navigateTo("product")} id="nl-product" className={activeTab === "product" ? "active" : ""}>Product</a></li>
            <li><a onClick={() => navigateTo("hiw")} id="nl-hiw" className={activeTab === "hiw" ? "active" : ""}>How It Works</a></li>
            <li><a onClick={() => navigateTo("about")} id="nl-about" className={activeTab === "about" ? "active" : ""}>About</a></li>
            <li><a onClick={() => navigateTo("contact")} id="nl-contact" className={activeTab === "contact" ? "active" : ""}>Contact</a></li>
          </ul>
          <div className="nav-actions">
            {user ? (
              <Link to="/app/dashboard" className="nav-signin" style={{ textDecoration: "none", display: "inline-block" }}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth/login" className="nav-signin" style={{ textDecoration: "none", display: "inline-block" }}>
                  Sign in
                </Link>
                <Link to="/auth/signup" className="nav-cta" style={{ textDecoration: "none", display: "inline-block" }}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════
           HOME PAGE
          ════════════════════════════════════ */}
      <div className={`page ${activeTab === "home" ? "show" : ""}`} id="p-home">
        {/* HERO */}
        <section className="hero">
          <div className="hero-kicker">
            <span className="hk-badge">New</span>
            Now live in Taraba State &nbsp;·&nbsp; First 30 founding clients only
          </div>
          <h1 className="display-xl">
            Run your store like<br /><span className="grad-blue">a tech company.</span>
          </h1>
          <p className="body-lg">NexaStoreOS replaces spreadsheets and guesswork with one intelligent system — built for Nigerian retail, supported on the ground.</p>
          <div className="hero-btns">
            <button className="btn btn-primary" onClick={() => navigateTo("contact")}>Start Free — ₦0 Setup</button>
            <button className="btn btn-secondary" onClick={() => navigateTo("hiw")}>See how it works →</button>
          </div>

          <div className="hero-mockup">
            <div className="mockup-browser glass-card">
              <div className="browser-bar">
                <div className="browser-dots"><div className="bd bd-r"></div><div className="bd bd-y"></div><div className="bd bd-g"></div></div>
                <div className="browser-url">hassan-bala.nexastoreos.com — Admin Dashboard</div>
                <div style={{ width: "60px" }}></div>
              </div>
              <div className="browser-body">
                <div className="browser-sidebar">
                  <div className="bs-logo"><img src={nexaLogo} alt="NEXA Logo" style={{ height: "28px", width: "auto" }} /></div>
                  <div className="bs-nav-item on"><span className="bs-nav-dot dot-blue">⊞</span>Dashboard</div>
                  <div className="bs-nav-item"><span className="bs-nav-dot dot-green">⊕</span>New Sale</div>
                  <div className="bs-nav-item"><span className="bs-nav-dot dot-teal">☰</span>Catalog</div>
                  <div className="bs-nav-item"><span className="bs-nav-dot dot-amber">↑</span>Restocking</div>
                  <div className="bs-nav-item"><span className="bs-nav-dot dot-violet">∿</span>Analytics</div>
                  <div className="bs-nav-item"><span className="bs-nav-dot dot-blue">⊞</span>Movements</div>
                </div>
                <div className="browser-main text-left">
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
                      <span className="chart-title">Weekly Revenue</span>
                      <span style={{ fontSize: "9px", color: "var(--ink3)" }}>This week vs last</span>
                    </div>
                    <div className="chart-bars" id="heroChart">
                      {vals.map((v, i) => (
                        <div
                          key={i}
                          className="cbar"
                          style={{
                            background: cols[i],
                            opacity: 0.5 + v * 0.005,
                            height: `${chartHeights[i]}px`,
                            transition: `height 1.4s ${i * 0.08}s cubic-bezier(.23,1,.32,1)`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="items-list">
                    <div className="item-row"><span className="ir-name">Indomie Carton</span><span><span className="ir-badge">34 units</span><span className="ir-val">₦48,200</span></span></div>
                    <div className="item-row"><span className="ir-name">Vegetable Oil 5L</span><span><span className="ir-badge">18 units</span><span className="ir-val">₦31,500</span></span></div>
                    <div className="item-row"><span className="ir-name">Semovita 2kg</span><span><span className="ir-badge">12 units</span><span className="ir-val">₦22,800</span></span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="notif notif-tl text-left">
              <span className="notif-icon">💳</span>
              <span><div className="notif-text">Payment received</div><div className="notif-val">₦12,500 — confirmed</div></span>
            </div>
            <div className="notif notif-bl text-left">
              <span className="notif-icon">📊</span>
              <span><div className="notif-text">8 AM Daily Summary</div><div className="notif-val">Yesterday: ₦184,200 revenue</div></span>
            </div>
            <div className="notif notif-br text-left">
              <span className="notif-icon">⚠️</span>
              <span><div className="notif-text">Low stock alert</div><div className="notif-val">Rice: 4 bags remaining</div></span>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF BAND */}
        <div className="proof-band">
          <div className="proof-inner">
            <div className="proof-item"><div className="proof-num">₦0</div><div className="proof-label">Setup cost</div></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="proof-num">10min</div><div className="proof-label">To go live</div></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="proof-num">30-Day</div><div className="proof-label">Money-back guarantee</div></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="proof-num">3</div><div className="proof-label">WhatsApp alerts daily</div></div>
            <div className="proof-sep"></div>
            <div className="proof-item"><div className="proof-num">100%</div><div className="proof-label">Local support</div></div>
          </div>
        </div>

        {/* COMPARISON */}
        <section className="section cmp-section">
          <div className="wrap">
            <div className="rv" style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
              <div className="eyebrow ey-blue"><span className="ey-dot"></span>Why NexaOS</div>
              <h2 className="display-lg">Your current tools<br />are costing you sales.</h2>
              <p className="body-md" style={{ marginTop: "12px" }}>Every spreadsheet crash and missed receipt is revenue you'll never recover.</p>
            </div>
            <div className="cmp-grid">
              <div className="cmp-item rv d1 text-left">
                <div className="cmp-head">
                  <div className="cmp-versus"><span className="cmp-vs-old">WhatsApp Records</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                  <div className="cmp-icon">💬</div>
                  <div className="cmp-title">No more digging through chats.</div>
                </div>
                <div className="cmp-body">
                  <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">Sales buried in chat threads. Staff dispute transactions. No audit trail, no proof.</div></div>
                  <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Every sale gets a timestamped digital receipt. Full history searchable in seconds.</div></div>
                </div>
              </div>
              <div className="cmp-item rv d2 text-left">
                <div className="cmp-head">
                  <div className="cmp-versus"><span className="cmp-vs-old">Excel / Sheets</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                  <div className="cmp-icon">📊</div>
                  <div className="cmp-title">Multi-user. No crashes. Ever.</div>
                </div>
                <div className="cmp-body">
                  <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">Crashes when two staff edit at once. Doesn't send receipts. One bad formula destroys months of data.</div></div>
                  <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Multiple staff, zero conflicts, live sync. Automated receipts every transaction.</div></div>
                </div>
                <div className="cmp-bonus">🎁 We import your Excel data free on day one.</div>
              </div>
              <div className="cmp-item rv d3 text-left">
                <div className="cmp-head">
                  <div className="cmp-versus"><span className="cmp-vs-old">Basic POS</span><span className="cmp-arrow">→</span><span className="cmp-vs-new">NexaOS</span></div>
                  <div className="cmp-icon">🖥️</div>
                  <div className="cmp-title">Complete inventory intelligence.</div>
                </div>
                <div className="cmp-body">
                  <div className="cmp-row"><div className="cmp-row-icon bad-icon">✕</div><div className="cmp-row-text">You know you got paid — but what sold? At what margin? What's running out?</div></div>
                  <div className="cmp-row"><div className="cmp-row-icon good-icon">✓</div><div className="cmp-row-text">Full inventory tracking on every payment. Know what sold, when, at what margin — automatically.</div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES / ADDICTION ENGINE */}
        <section className="section feat-section">
          <div className="wrap">
            <div className="rv" style={{ textAlign: "center", maxWidth: "560px", margin: "0 auto" }}>
              <div className="eyebrow ey-violet"><span className="ey-dot"></span>The Addiction Engine</div>
              <h2 className="display-lg">Business intelligence,<br />delivered instantly.</h2>
              <p className="body-md" style={{ marginTop: "12px" }}>Three features that make store owners check NexaOS before WhatsApp.</p>
            </div>
            <div className="feat-main">
              <div className="feat-phone rv d1">
                <div className="phone-glow"></div>
                <div className="phone-outer">
                  <div className="phone-inner">
                    <div className="phone-notch"></div>
                    <div className="phone-screen text-left">
                      <div className="ps-topbar">
                        <div className="ps-logo">
                          <img src={nexaLogo} alt="NEXA Logo" style={{ height: "20px", width: "auto", filter: "brightness(0) invert(1)" }} />
                        </div>
                        <div className="ps-time">8:00 AM</div>
                      </div>
                      <div className="ps-name">Hassan Bala</div>
                      <div className="ps-sub">Admin Dashboard · Store Settings</div>
                      <div className="ps-grid">
                        <div className="ps-card"><div className="ps-card-icon">➕</div><div className="ps-card-label">Add Product</div></div>
                        <div className="ps-card"><div className="ps-card-icon">📦</div><div className="ps-card-label">Restock</div></div>
                        <div className="ps-card"><div className="ps-card-icon">📈</div><div className="ps-card-label">Analytics</div></div>
                        <div className="ps-card"><div className="ps-card-icon">💳</div><div className="ps-card-label">New Sale</div></div>
                      </div>
                      <div className="ps-metric"><span className="ps-m-label">Today's Revenue</span><span className="ps-m-val">₦184,200</span></div>
                      <div className="ps-metric"><span className="ps-m-label">Top Seller — Indomie</span><span className="ps-m-val">↑ 34 units</span></div>
                      <div className="ps-bar">
                        <div className="ps-bar-item on">⊞<br />Home</div>
                        <div className="ps-bar-item">💳<br />Sales</div>
                        <div className="ps-bar-item">☰<br />Catalog</div>
                        <div className="ps-bar-item">…<br />More</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="fchip fchip-1" style={activeFeature === 0 ? { border: "1.5px solid var(--blue)", boxShadow: "0 0 15px rgba(43,91,255,0.2)" } : {}}><div className="fchip-label">📱 8 AM Summary</div><div className="fchip-val">Revenue: ₦184,200</div></div>
                <div className="fchip fchip-2" style={activeFeature === 1 ? { border: "1.5px solid var(--amber)", boxShadow: "0 0 15px rgba(245,166,35,0.2)" } : {}}><div className="fchip-label">⚡ Low stock alert</div><div className="fchip-val">Indomie: 5 bags left</div></div>
                <div className="fchip fchip-3" style={activeFeature === 2 ? { border: "1.5px solid var(--green)", boxShadow: "0 0 15px rgba(18,209,118,0.2)" } : {}}><div className="fchip-label">💰 Payment confirmed</div><div className="fchip-val">₦12,500 received</div></div>
              </div>
              <div className="feat-list rv d2 text-left">
                <div className="feat-item" style={activeFeature === 0 ? { background: "#fff", borderColor: "rgba(43,91,255,.2)", boxShadow: "0 4px 20px rgba(43,91,255,.08)" } : {}} onClick={() => setActiveFeature(0)}>
                  <div className="fi-icon fi-i1">🌅</div>
                  <div><div className="fi-title">8 AM Daily Summaries</div><p className="fi-body">Wake up knowing yesterday's exact revenue, top-selling items, and what to restock — delivered straight to your WhatsApp before your day begins.</p></div>
                </div>
                <div className="feat-item" style={activeFeature === 1 ? { background: "#fff", borderColor: "rgba(43,91,255,.2)", boxShadow: "0 4px 20px rgba(43,91,255,.08)" } : {}} onClick={() => setActiveFeature(1)}>
                  <div className="fi-icon fi-i2">⚡</div>
                  <div><div className="fi-title">Instant Low-Stock Alerts</div><p className="fi-body">Get a WhatsApp ping the second your fast-moving items hit the reorder point. Never miss a sale because a shelf was empty again.</p></div>
                </div>
                <div className="feat-item" style={activeFeature === 2 ? { background: "#fff", borderColor: "rgba(43,91,255,.2)", boxShadow: "0 4px 20px rgba(43,91,255,.08)" } : {}} onClick={() => setActiveFeature(2)}>
                  <div className="fi-icon fi-i3">💰</div>
                  <div><div className="fi-title">Live Payment Tracking</div><p className="fi-body">Know the moment a customer pays — whether you're in the store, at home, or across town. Your store reports to you in real time.</p></div>
                </div>
                <div className="feat-item" style={activeFeature === 3 ? { background: "#fff", borderColor: "rgba(43,91,255,.2)", boxShadow: "0 4px 20px rgba(43,91,255,.08)" } : {}} onClick={() => setActiveFeature(3)}>
                  <div className="fi-icon fi-i4">📋</div>
                  <div><div className="fi-title">Debt Management</div><p className="fi-body">Track credit sales, outstanding balances, and send automated reminders. Finally collect everything you're owed — without the awkward conversations.</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT SCREENSHOT SHOWCASE */}
        <section className="section" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
          <div className="wrap">
            <div className="glass-card rv" style={{ overflow: "hidden" }}>
              <div className="product-showcase rv">
                <div className="showcase-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", minHeight: "440px", background: "linear-gradient(135deg,#2B5BFF,#00C4CF)", position: "relative" }}>
                  <div className="mockup-pos glass-card" style={{ width: "90%", background: "rgba(255, 255, 255, 0.96)", borderRadius: "16px", padding: "18px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", color: "var(--ink)", zIndex: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "10px", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--blue)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>⚡ NexaOS QuickPOS</span>
                      <span style={{ fontSize: "12px", padding: "4px 8px", background: "var(--green-l)", color: "#0A8A4E", borderRadius: "50px", fontWeight: 600 }}>Active Cashier: Joy</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--paper)", borderRadius: "8px", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>Indomie Chicken Carton</div>
                          <div style={{ fontSize: "11px", color: "var(--ink3)" }}>Qty: 2 · ₦7,500/unit</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>₦15,000</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--paper)", borderRadius: "8px", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>Vegetable Oil 3L</div>
                          <div style={{ fontSize: "11px", color: "var(--ink3)" }}>Qty: 1 · ₦9,800/unit</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>₦9,800</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--paper)", borderRadius: "8px", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13px" }}>Dangote Sugar 1kg</div>
                          <div style={{ fontSize: "11px", color: "var(--ink3)" }}>Qty: 3 · ₦2,200/unit</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>₦6,600</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", borderTop: "2px dashed rgba(0,0,0,0.08)", paddingTop: "12px", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--ink2)" }}>Total Amount:</span>
                      <span style={{ fontWeight: 800, fontSize: "18px", color: "var(--blue)" }}>₦31,400</span>
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%", padding: "10px", marginTop: "12px", fontSize: "13px", pointerEvents: "none" }}>Complete Cash Sale & Send Receipt</button>
                  </div>
                  <div className="showcase-img-overlay"></div>
                </div>
                <div className="showcase-content text-left">
                  <div className="eyebrow ey-blue"><span className="ey-dot"></span>The Platform</div>
                  <h3 className="display-md" style={{ marginBottom: "14px" }}>Your entire store,<br />one screen.</h3>
                  <p className="body-md">Add products, track sales, manage restocking and analytics — all from your phone or browser. No technical knowledge required.</p>
                  <div className="sc-steps">
                    <div className="sc-step"><div className="sc-step-num">1</div><div><div className="sc-step-title">Visit nexastoreos.com or install the app</div><p className="sc-step-body">Works on any Android phone or browser.</p></div></div>
                    <div className="sc-step"><div className="sc-step-num">2</div><div><div className="sc-step-title">Complete your store profile</div><p className="sc-step-body">Name, categories, modules — guided in 4 steps.</p></div></div>
                    <div className="sc-step"><div className="sc-step-num">3</div><div><div className="sc-step-title">Dashboard goes live</div><p className="sc-step-body">Start selling. First WhatsApp summary arrives at 8 AM.</p></div></div>
                  </div>
                  <button className="btn btn-primary" onClick={() => navigateTo("hiw")}>See Full Setup Guide →</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="section pricing-section" id="pricing-anchor">
          <div className="wrap" style={{ textAlign: "center" }}>
            <div className="rv">
              <div className="eyebrow ey-amber" style={{ justifyContent: "center" }}><span className="ey-dot"></span>The Launch Offer</div>
              <h2 className="display-lg">Premium retail tech,<br />priced for local reality.</h2>
              <p className="body-lg" style={{ maxWidth: "440px", margin: "14px auto 0" }}>Only 30 founding member spots available.</p>
            </div>
            <div className="pricing-card rv d1 text-left">
              <div className="pc-badge">First 30 Clients</div>
              <div className="pc-plan">Business Plan · Founding Member</div>
              <div className="pc-price"><span className="pc-cur">₦</span><span className="pc-num">6,500</span><span className="pc-per">/month</span></div>
              <div className="pc-strike">₦26,000 in onboarding fees — completely waived</div>
              <ul className="pc-list">
                <li><span className="pc-check">✓</span>FREE Setup &amp; Full Configuration</li>
                <li><span className="pc-check">✓</span>FREE Data Import from existing systems</li>
                <li><span className="pc-check">✓</span>FREE 1-on-1 Staff Training Session</li>
                <li><span className="pc-check">✓</span>FREE 30-day Priority WhatsApp Support</li>
                <li><span className="pc-check">✓</span>Multi-user access · Unlimited products</li>
                <li><span className="pc-check">✓</span>WhatsApp alerts: daily summaries + low stock</li>
              </ul>
              <button className="btn btn-primary" style={{ width: "100%", padding: "17px", fontSize: "16px" }} onClick={() => navigateTo("contact")}>Book Your Free Demo Today</button>
            </div>
            <div className="guarantee-box rv d2">
              <div className="gb-title">🛡️ The Nexa Guarantee</div>
              <p className="gb-body">If after 30 days NexaStoreOS hasn't saved you more than it costs, we refund every kobo. No questions asked. Every objection collapses when risk is zero.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section">
          <div className="faq-wrap">
            <div className="rv" style={{ textAlign: "center" }}>
              <div className="eyebrow ey-teal" style={{ justifyContent: "center" }}><span className="ey-dot"></span>Frequently Asked Questions</div>
              <h2 className="display-lg">Need <span className="grad-blue">Support?</span></h2>
              <p className="body-md" style={{ maxWidth: "480px", margin: "12px auto 0" }}>
                Everything you need to know about NexaStoreOS. Can't find an answer?{" "}
                <a onClick={() => navigateTo("contact")} style={{ color: "var(--blue)", fontWeight: 600, cursor: "pointer" }}>
                  Contact us directly.
                </a>
              </p>
            </div>
            <div className="faq-grid rv">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className={`faq-item ${isOpen ? "open" : ""}`}>
                    <button
                      className="faq-q"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      {faq.q} <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                    </button>
                    <div className="faq-a">
                      <div className="faq-a-inner">{faq.a}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* COMMUNITY HUB */}
        <section className="community-section">
          <div className="wrap">
            <div className="rv" style={{ textAlign: "center" }}>
              <div className="eyebrow ey-violet" style={{ justifyContent: "center" }}><span className="ey-dot"></span>Notero Community</div>
              <h2 className="display-lg">Join Into <span className="grad-warm">Our Hub</span></h2>
              <p className="body-md" style={{ maxWidth: "440px", margin: "12px auto 0" }}>Connect with store owners, share business tips, and stay ahead of new features.</p>
            </div>
            <div className="community-cards rv">
              <div className="community-card">
                <div className="cc-icon-wrap cc-icon-gh">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="#1B1F23">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div className="cc-title">Github</div>
                <div className="cc-desc">Open Source &amp; Commit Code</div>
              </div>
              <div className="community-card">
                <div className="cc-icon-wrap cc-icon-tw">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="#1DA1F2">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </div>
                <div className="cc-title">Twitter</div>
                <div className="cc-desc">Latest News &amp; Updates</div>
              </div>
              <div className="community-card">
                <div className="cc-icon-wrap cc-icon-tg">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="#0088CC">
                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </div>
                <div className="cc-title">Telegram</div>
                <div className="cc-desc">Channel for Community</div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-strip">
          <h2 className="display-lg rv">Ready to know your store<br />like never before?</h2>
          <p className="body-lg rv d1">Join Taraba's first 30 founding members. Zero risk. Full local support.</p>
          <div className="cta-btns rv d2">
            <button className="btn btn-white" onClick={() => window.open("tel:09038026109")}>📞 Call: 090-380-26109</button>
            <button className="btn btn-ghost" onClick={() => navigateTo("contact")}>Book a Free Demo →</button>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════
           PRODUCT PAGE
          ════════════════════════════════════ */}
      <div className={`page ${activeTab === "product" ? "show" : ""}`} id="p-product">
        <section className="page-hero section">
          <div className="rv">
            <div className="eyebrow ey-blue" style={{ justifyContent: "center" }}><span className="ey-dot"></span>The Platform</div>
            <h1 className="display-xl" style={{ maxWidth: "800px", margin: "0 auto 18px" }}>Everything your store<br />needs, intelligently.</h1>
            <p className="body-lg" style={{ maxWidth: "500px", margin: "0 auto" }}>Built for Nigerian retail. Works on any phone or browser. No IT department needed.</p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: "20px" }}>
          <div className="wrap">
            <div className="glass-card rv" style={{ overflow: "hidden" }}>
              <div className="product-showcase">
                <div className="showcase-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", minHeight: "440px", background: "linear-gradient(135deg,#2B5BFF,#00C4CF)", position: "relative" }}>
                  <div className="mockup-pos glass-card" style={{ width: "90%", background: "rgba(255, 255, 255, 0.96)", borderRadius: "16px", padding: "18px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", color: "var(--ink)", zIndex: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "10px", marginBottom: "12px" }}>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--green)", fontFamily: "'Bricolage Grotesque', sans-serif" }}>📈 Revenue & Margin Intelligence</span>
                      <span style={{ fontSize: "12px", padding: "4px 8px", background: "var(--blue-xl)", color: "var(--blue)", borderRadius: "50px", fontWeight: 600 }}>Active Reports</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "10px" }}>
                        <div style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--ink3)", fontWeight: 700 }}>Total Sales</div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--blue)", marginTop: "4px" }}>₦2,481,500</div>
                        <div style={{ fontSize: "10px", color: "var(--green)", fontWeight: 600, marginTop: "2px" }}>↑ +14.2% this month</div>
                      </div>
                      <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "10px" }}>
                        <div style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--ink3)", fontWeight: 700 }}>Net Margin</div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--green)", marginTop: "4px" }}>24.8%</div>
                        <div style={{ fontSize: "10px", color: "var(--green)", fontWeight: 600, marginTop: "2px" }}>↑ +2.1% profit rate</div>
                      </div>
                    </div>
                    <div style={{ background: "var(--paper)", padding: "12px", borderRadius: "10px" }}>
                      <div style={{ fontSize: "11px", color: "var(--ink2)", fontWeight: 600, marginBottom: "8px" }}>Top Performing Categories</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 600, marginBottom: "3px" }}>
                            <span>Grocery & Provisions</span>
                            <span>64% of sales</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "10px" }}>
                            <div style={{ width: "64%", height: "100%", background: "var(--blue)", borderRadius: "10px" }}></div>
                          </div>
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: 600, marginBottom: "3px" }}>
                            <span>Beverages & Oils</span>
                            <span>28% of sales</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "rgba(0,0,0,0.06)", borderRadius: "10px" }}>
                            <div style={{ width: "28%", height: "100%", background: "var(--teal)", borderRadius: "10px" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="showcase-img-overlay"></div>
                </div>
                <div className="showcase-content text-left">
                  <div className="eyebrow ey-teal"><span className="ey-dot"></span>Real Product Screenshot</div>
                  <h3 className="display-md" style={{ marginBottom: "12px" }}>The dashboard<br />your staff will love.</h3>
                  <p className="body-md" style={{ marginBottom: "20px" }}>Clean, intuitive, and built for speed. Process a sale in under 10 seconds. Your team learns it in one session.</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ padding: "6px 14px", borderRadius: "50px", background: "var(--blue-xl)", color: "var(--blue)", fontSize: "12px", fontWeight: 600 }}>📱 Mobile-first</span>
                    <span style={{ padding: "6px 14px", borderRadius: "50px", background: "var(--green-l)", color: "#0A8A4E", fontSize: "12px", fontWeight: 600 }}>⚡ Real-time sync</span>
                    <span style={{ padding: "6px 14px", borderRadius: "50px", background: "var(--amber-l)", color: "#7A4800", fontSize: "12px", fontWeight: 600 }}>🇳🇬 Built for Nigeria</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px" }} className="rv text-left">
              <div className="eyebrow ey-blue"><span className="ey-dot"></span>Six Core Modules</div>
              <h3 className="display-md" style={{ marginBottom: "4px" }}>One system. Six superpowers.</h3>
            </div>
            <div className="modules-grid text-left" style={{ marginTop: "28px" }}>
              <div className="module-card rv d1"><div className="mc-icon mc-i1">➕</div><div className="mc-title">Product Catalog</div><p className="mc-body">Add unlimited products with prices, categories, images, and stock levels. Bulk-import from Excel free.</p></div>
              <div className="module-card rv d2"><div className="mc-icon mc-i2">📦</div><div className="mc-title">Inventory &amp; Restocking</div><p className="mc-body">Real-time stock tracking with automated reorder alerts delivered to your WhatsApp instantly.</p></div>
              <div className="module-card rv d3"><div className="mc-icon mc-i3">📈</div><div className="mc-title">Analytics &amp; Reports</div><p className="mc-body">Daily summaries, top sellers, revenue trends. Every number you need, delivered at 8 AM without lifting a finger.</p></div>
              <div className="module-card rv d1"><div className="mc-icon mc-i4">💳</div><div className="mc-title">New Sale &amp; Receipts</div><p className="mc-body">Process any sale in seconds. Automated digital receipts sent to customers instantly with full payment history.</p></div>
              <div className="module-card rv d2"><div className="mc-icon mc-i5">💰</div><div className="mc-title">Debt Management</div><p className="mc-body">Track credit sales and outstanding balances. Send automated payment reminders. Collect what you're owed.</p></div>
              <div className="module-card rv d3"><div className="mc-icon mc-i6">👥</div><div className="mc-title">Multi-User Access</div><p className="mc-body">Let multiple staff work simultaneously with no conflicts. Assign roles and track who sold what.</p></div>
            </div>
          </div>
        </section>
        <section className="cta-strip">
          <h2 className="display-lg rv">See it live in your store.</h2>
          <p className="body-lg rv d1">Book a free demo. We'll set everything up for you.</p>
          <div className="cta-btns rv d2">
            <button className="btn btn-white" onClick={() => navigateTo("contact")}>Book Free Demo</button>
            <Link to="/auth/signup">
              <button className="btn btn-ghost">Try nexastoreos.com →</button>
            </Link>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════
           HOW IT WORKS PAGE
          ════════════════════════════════════ */}
      <div className={`page ${activeTab === "hiw" ? "show" : ""}`} id="p-hiw">
        <section className="page-hero section">
          <div className="rv">
            <div className="eyebrow ey-green" style={{ justifyContent: "center" }}><span className="ey-dot"></span>How It Works</div>
            <h1 className="display-xl" style={{ maxWidth: "800px", margin: "0 auto 18px" }}>From signup to first sale<br />in <span className="grad-green">under 10 minutes.</span></h1>
            <p className="body-lg" style={{ maxWidth: "480px", margin: "0 auto" }}>No technical knowledge required. Our team handles everything — including importing your existing data.</p>
          </div>
        </section>
        <section className="section" style={{ paddingTop: "20px" }}>
          <div className="wrap-sm text-left">
            <div className="steps-timeline">
              <div className="step-item rv d1"><div className="step-circle">1</div><div className="step-content"><div className="step-title">Visit nexastoreos.com or install the app</div><p className="step-body">Open the website on any phone or laptop. Works on Android, iOS, and all browsers. No app store required to get started.</p></div></div>
              <div className="step-item rv d2"><div className="step-circle">2</div><div className="step-content"><div className="step-title">Register with email or phone</div><p className="step-body">Enter your registered email or phone number. Request a one-time PIN via SMS for instant, secure access.</p></div></div>
              <div className="step-item rv d3"><div className="step-circle">3</div><div className="step-content"><div className="step-title">Complete your store profile</div><p className="step-body">Set your store name, business type, and product categories. Our 4-step onboarding wizard guides you through everything in about 3 minutes.</p></div></div>
              <div className="step-item rv d1"><div className="step-circle">4</div><div className="step-content"><div className="step-title">Choose your modules</div><p className="step-body">Activate Sales, Inventory, Analytics, Debt Management — or all of them. Every module can be changed anytime in Settings.</p></div></div>
              <div className="step-item rv d2"><div className="step-circle">5</div><div className="step-content"><div className="step-title">We import your existing data</div><p className="step-body">Have Excel records, product lists, or customer data? Our team migrates everything at zero cost so you start with full history intact.</p></div></div>
              <div className="step-item rv d3"><div className="step-circle">6</div><div className="step-content"><div className="step-title">Your dashboard goes live</div><p className="step-body">Start adding products and making sales. Your first WhatsApp daily summary arrives at 8 AM tomorrow morning. That's it — you're running a tech-powered store.</p></div></div>
            </div>
          </div>

          <div className="wrap" style={{ marginTop: "80px" }}>
            <div className="rv" style={{ textAlign: "center", marginBottom: "40px" }}>
              <div className="eyebrow ey-violet" style={{ justifyContent: "center" }}><span className="ey-dot"></span>Everything Included</div>
              <h3 className="display-md">Every tool in one place.</h3>
            </div>
            <div className="feats2 text-left">
              <div className="feat2-card rv d1"><div className="f2c-icon">📊</div><div className="f2c-title">Business Overview</div><p className="f2c-body">See total sales, revenue trends, and daily performance at a glance from your dashboard home screen.</p></div>
              <div className="feat2-card rv d2"><div className="f2c-icon">🏆</div><div className="f2c-title">Top Sellers &amp; Customers</div><p className="f2c-body">Identify your best products and most valuable customers automatically. Know what to stock more of.</p></div>
              <div className="feat2-card rv d3"><div className="f2c-icon">💰</div><div className="f2c-title">Debt Management &amp; Collections</div><p className="f2c-body">Track credit sales and outstanding payments. Send automated reminders — collect what you're owed.</p></div>
              <div className="feat2-card rv d4"><div className="f2c-icon">🔔</div><div className="f2c-title">Real-Time WhatsApp Alerts</div><p className="f2c-body">Instant pings for every payment, low stock event, and daily summary. Your store talks to you constantly.</p></div>
            </div>
          </div>
        </section>
        <section className="cta-strip">
          <h2 className="display-lg rv">Ready to get started?</h2>
          <p className="body-lg rv d1">Our team handles the full setup. Zero technical knowledge needed.</p>
          <div className="cta-btns rv d2">
            <button className="btn btn-white" onClick={() => navigateTo("contact")}>Book Free Demo</button>
            <button className="btn btn-ghost" onClick={() => navigateTo("product")}>See All Features →</button>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════
           ABOUT PAGE
          ════════════════════════════════════ */}
      <div className={`page ${activeTab === "about" ? "show" : ""}`} id="p-about">
        <section className="page-hero section">
          <div className="rv wrap-xs" style={{ margin: "0 auto", textAlign: "center" }}>
            <div className="eyebrow ey-blue" style={{ justifyContent: "center" }}><span className="ey-dot"></span>About Us</div>
            <h1 className="display-xl">Built locally.<br /><span className="grad-blue">Supported locally.</span></h1>
            <p className="body-lg">We are Nexa Digital Solutions LTD — on the ground in Taraba State, not a distant office sending email tickets.</p>
          </div>
        </section>

        <div className="about-split rv">
          <div className="ceo-visual">
            <div className="ceo-card-wrap text-left">
              <div className="ceo-photo" style={{ background: "linear-gradient(135deg, #0A1F44, #1C2140)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "28px", position: "relative" }}>
                AB
              </div>
              <div className="ceo-details">
                <div className="ceo-name">Abdulrasheed Mahmoud Bello</div>
                <div className="ceo-title-badge">CEO · Nexa Digital Solutions LTD</div>
                <div className="ceo-contacts">
                  <a href="tel:09038026109" className="cc-link"><span className="cc-icon">📞</span>090-380-26109</a>
                  <a href="tel:08132321056" className="cc-link"><span className="cc-icon">📱</span>081-323-21056</a>
                  <a href="#" className="cc-link"><span className="cc-icon">📍</span>Lamurde St, Barade, Jalingo</a>
                  <a href="#" className="cc-link"><span className="cc-icon">🌐</span>@NexaTechs</a>
                </div>
              </div>
            </div>
          </div>
          <div className="about-narrative rv d1 text-left">
            <div className="eyebrow ey-blue"><span className="ey-dot"></span>Our Story</div>
            <h2 className="display-lg" style={{ marginBottom: "22px" }}>We are here<br />on the ground.</h2>
            <blockquote>"Lagos companies can't teleport staff to Taraba State. We are here on the ground — building intelligent business systems right where you operate, so you always have the local support you need to scale."</blockquote>
            <p>Nexa Digital Solutions LTD isn't remote software with an email ticket system. It's a local partner who walks into your store, understands your operation, and ensures the system works — not just on day one, but permanently.</p>
            <p>We believe every Nigerian retailer deserves the same intelligence tools that big supermarket chains use. NexaStoreOS brings that power to local shops, provision stores, and distributors — at a price that makes sense for local reality.</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px", marginBottom: "28px" }}>
              <span className="a-tag">🏢 Jalingo, Taraba State</span>
              <span className="a-tag">📱 Mobile-First Design</span>
              <span className="a-tag">🇳🇬 Built for Nigeria</span>
              <span className="a-tag">🤝 Personal Support</span>
            </div>
            <button className="btn btn-primary" onClick={() => navigateTo("contact")}>Meet the Team →</button>
          </div>
        </div>

        <section className="section" style={{ paddingTop: "60px" }}>
          <div className="wrap">
            <div className="rv" style={{ textAlign: "center", marginBottom: "36px" }}>
              <div className="eyebrow ey-violet" style={{ justifyContent: "center" }}><span className="ey-dot"></span>Our Values</div>
              <h3 className="display-md">Why clients trust Nexa.</h3>
            </div>
            <div className="value-grid text-left">
              <div className="value-card rv d1"><div className="vc-icon">🤝</div><div className="vc-title">Local Presence</div><p className="vc-body">We're in Jalingo — not a chatbot. Real people who come to your store, set everything up, and stay reachable.</p></div>
              <div className="value-card rv d2"><div className="vc-icon">🛡️</div><div className="vc-title">Zero-Risk Guarantee</div><p className="vc-body">30-day full refund if NexaOS doesn't save you more than it costs. We mean it — every kobo back, no questions.</p></div>
              <div className="value-card rv d3"><div className="vc-icon">⚡</div><div className="vc-title">Fast Onboarding</div><p className="vc-body">Live in under 10 minutes. We handle the technical setup completely. You focus on your business.</p></div>
            </div>
          </div>
        </section>
        <section className="cta-strip">
          <h2 className="display-lg rv">Come work with us.</h2>
          <p className="body-lg rv d1">Local business. Local intelligence. Local support.</p>
          <div className="cta-btns rv d2">
            <button className="btn btn-white" onClick={() => navigateTo("contact")}>Get in Touch</button>
            <button className="btn btn-white" onClick={() => window.open("tel:09038026109")}>Call Now →</button>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════
           CONTACT PAGE
          ════════════════════════════════════ */}
      <div className={`page ${activeTab === "contact" ? "show" : ""}`} id="p-contact">
        <section className="page-hero section">
          <div className="rv wrap-xs" style={{ margin: "0 auto", textAlign: "center" }}>
            <div className="eyebrow ey-blue" style={{ justifyContent: "center" }}><span className="ey-dot"></span>Contact Us</div>
            <h1 className="display-xl">Book your<br /><span className="grad-blue">free demo.</span></h1>
            <p className="body-lg">Our team configures your store completely at zero cost. First 30 clients get full onboarding waived.</p>
          </div>
        </section>
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="contact-layout">
              <div className="contact-info rv text-left">
                <div className="ci-brand">
                  <div className="ci-brand-logo">
                    <img src={nexaLogo} alt="NEXA Logo" style={{ height: "24px", width: "auto", filter: "brightness(0) invert(1)" }} />
                  </div>
                  <p className="ci-brand-sub">Nexa Digital Solutions LTD<br />Building Intelligent Business Systems<br />Jalingo, Taraba State · Nigeria</p>
                </div>
                <div className="ci-method"><div className="ci-m-icon">📞</div><div><div className="ci-m-label">Primary Phone</div><div className="ci-m-val">090-380-26109</div></div></div>
                <div className="ci-method"><div className="ci-m-icon">📱</div><div><div className="ci-m-label">WhatsApp</div><div className="ci-m-val">081-323-21056</div></div></div>
                <div className="ci-method"><div className="ci-m-icon">📍</div><div><div className="ci-m-label">Office Location</div><div className="ci-m-val">Lamurde St, Barade, Jalingo</div></div></div>
                <div className="ci-method"><div className="ci-m-icon">🌐</div><div><div className="ci-m-label">Website</div><div className="ci-m-val">nexastoreos.com</div></div></div>
                <div className="ci-method"><div className="ci-m-icon">📲</div><div><div className="ci-m-label">Social</div><div className="ci-m-val">@NexaTechs</div></div></div>
                <div className="ci-note"><strong style={{ color: "var(--blue)" }}>⏰ Response time:</strong> We respond within 2 hours during business hours. For urgent matters, call directly.</div>
              </div>
              <div className="contact-form-wrap rv d1 text-left">
                <div className="cf-title">Request a Free Demo</div>
                <p className="cf-sub">Fill in your details and we'll reach out within 2 hours to schedule your setup session.</p>
                <form onSubmit={handleFormSubmit}>
                  <div className="form-row2">
                    <div className="fg">
                      <label>Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Hassan Bala"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="fg">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="08012345678"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="fg">
                    <label>Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Bala General Store"
                      value={formData.biz}
                      onChange={(e) => setFormData({ ...formData, biz: e.target.value })}
                    />
                  </div>
                  <div className="fg">
                    <label>Business Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                      value={formData.msg}
                      onChange={(e) => setFormData({ ...formData, msg: e.target.value })}
                    ></textarea>
                  </div>
                  {!isSubmitted ? (
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "17px", fontSize: "15px" }}>Send Request — We'll Call You Back</button>
                  ) : (
                    <div className="form-success" style={{ display: "block" }}>✅ Request sent! We'll contact you within 2 hours.</div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>
        <section className="cta-strip">
          <h2 className="display-lg rv">Zero risk. Full support.</h2>
          <p className="body-lg rv d1">30-day money-back guarantee. Setup, training, and data migration all free.</p>
          <div className="cta-btns rv d2">
            <button className="btn btn-white" onClick={() => window.open("tel:09038026109")}>📞 Call: 090-380-26109</button>
            <button className="btn btn-ghost" onClick={() => navigateTo("product")}>See All Features →</button>
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer>
        <div className="footer-top">
          <div className="footer-grid text-left">
            {/* Brand Column */}
            <div>
              <div className="footer-brand-row" style={{ display: "flex", alignItems: "center" }}>
                <img src={nexaLogo} alt="NexaStoreOS Logo" style={{ height: "32px", width: "auto", filter: "brightness(0) invert(1)" }} />
              </div>
              <p className="footer-brand-text">Building Intelligent Business Systems for Nigerian retailers. Locally supported, locally trusted.</p>

              {/* Social Media Handles */}
              <div className="footer-socials">
                <a className="fs-btn" href="#" target="_blank" rel="noreferrer" title="Twitter / X">
                  <span className="fs-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </span>
                  @NexaTechs
                </a>
                <a className="fs-btn" href="#" target="_blank" rel="noreferrer" title="Instagram">
                  <span className="fs-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </span>
                  Instagram
                </a>
                <a className="fs-btn" href="#" target="_blank" rel="noreferrer" title="WhatsApp">
                  <span className="fs-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </span>
                  WhatsApp
                </a>
                <a className="fs-btn" href="#" target="_blank" rel="noreferrer" title="Telegram">
                  <span className="fs-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </span>
                  Telegram
                </a>
              </div>

              <div className="footer-contact-list">
                <a href="tel:09038026109" className="fc-contact-item"><span className="fc-contact-icon">📞</span>090-380-26109</a>
                <a href="tel:08132321056" className="fc-contact-item"><span className="fc-contact-icon">📱</span>081-323-21056</a>
                <span className="fc-contact-item"><span className="fc-contact-icon">📍</span>Lamurde St, Barade, Jalingo</span>
              </div>
            </div>

            {/* Platform links */}
            <div>
              <div className="fc-col-head">Platform</div>
              <button className="fc-link" onClick={() => navigateTo("product")}>Product Overview</button>
              <button className="fc-link" onClick={() => navigateTo("hiw")}>How It Works</button>
              <button className="fc-link" onClick={() => navigateTo("home", "pricing-anchor")}>Pricing</button>
              <a href="https://nexastoreos.com" target="_blank" rel="noreferrer" className="fc-link">Sign Up Free</a>
              <button className="fc-link" onClick={() => navigateTo("contact")}>Book a Demo</button>
            </div>

            {/* Company links */}
            <div>
              <div className="fc-col-head">Company</div>
              <button className="fc-link" onClick={() => navigateTo("about")}>About Us</button>
              <button className="fc-link" onClick={() => navigateTo("contact")}>Contact Us</button>
              <button className="fc-link" onClick={() => navigateTo("contact")}>Get Support</button>
              <button className="fc-link" onClick={() => navigateTo("about")}>Our Values</button>
              <Link to="/privacy" className="fc-link" style={{ display: "block" }}>Privacy Policy</Link>
              <Link to="/terms" className="fc-link" style={{ display: "block" }}>Terms of Service</Link>
            </div>

            {/* Location & hours */}
            <div>
              <div className="fc-col-head">Location</div>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,.45)", lineHeight: "1.85", marginBottom: "10px" }}>Lamurde Street, Barade<br />Jalingo, Taraba State<br />Nigeria 🇳🇬</p>
              <a href="https://nexastoreos.com" target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--blue)", fontWeight: 600, textDecoration: "none", display: "block", marginBottom: "4px" }}>nexastoreos.com ↗</a>
              <a href="mailto:hello@nexastoreos.com" style={{ fontSize: "12px", color: "rgba(255,255,255,.4)", textDecoration: "none", display: "block" }}>hello@nexastoreos.com</a>
              <div className="footer-hrs-box">
                <div className="footer-hrs-label">Business Hours</div>
                <div className="footer-hrs-val">Mon – Sat: 8AM – 6PM<br />Support: 7 days / week</div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 Nexa Digital Solutions LTD · All rights reserved</span>
            <div className="footer-bottom-right">
              <div className="footer-pulse">
                <span className="pulse-dot"></span>
                All systems operational
              </div>
              <span style={{ color: "rgba(255,255,255,.2)" }}>|</span>
              <span>@NexaTechs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StoreLoginPage({ store }: { store: Store }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(`Welcome back to ${store.name}!`);
      navigate("/app/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 selection:bg-[#00C2FF]/30">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#00C2FF]/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[150px]" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          {store.branding?.logo ? (
            <div className="mx-auto h-32 w-32 overflow-hidden rounded-[2.5rem] bg-white mb-8 shadow-2xl ring-8 ring-primary/5 group/logo hover:scale-105 transition-transform duration-500">
              <img src={store.branding.logo} className="h-full w-full object-cover" alt={store.name} />
            </div>
          ) : (
            <div className="mx-auto h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 flex text-primary mb-6 shadow-inner ring-8 ring-primary/5">
              <Building2 className="h-12 w-12" />
            </div>
          )}
          <h2 className="text-xl font-bold uppercase tracking-tight text-white">{store.name}</h2>
          <p className="mt-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic opacity-40">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 rounded-[2.5rem] border-2 border-slate-800 bg-slate-950 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-2 border-slate-800 bg-slate-900 text-white font-bold focus:border-[#00C2FF]/50 transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-2 border-slate-800 bg-slate-900 text-white font-bold pr-12 focus:border-[#00C2FF]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-900 shadow-xl shadow-[#00C2FF]/10 relative z-10 overflow-hidden group/btn" disabled={loading}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            {loading ? "Accessing..." : "Access System"}
          </Button>
        </form>

        <div className="text-center pt-4">
          <a 
            href={(() => {
              const host = window.location.host;
              if (host.includes('localhost') || host.includes('127.0.0.1')) {
                const portPart = host.split(':')[1];
                const port = portPart ? `:${portPart}` : '';
                return `${window.location.protocol}//localhost${port}`;
              }
              const parts = host.split('.');
              if (parts.length >= 3) {
                return `${window.location.protocol}//${parts.slice(-2).join('.')}`;
              }
              return `${window.location.protocol}//nexastoreos.com`;
            })()} 
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#00C2FF] transition-colors flex items-center justify-center gap-2"
          >
            <Package className="h-3 w-3" /> NEXA OS CORE
          </a>
        </div>
      </div>
    </div>
  );
}
