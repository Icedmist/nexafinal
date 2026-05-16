import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  ShoppingCart, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Truck,
  History,
  Store,
  UserPlus,
  LogIn,
  Home,
  MapPin,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SiteMapItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface SiteMapSection {
  title: string;
  items: SiteMapItem[];
}

const SECTIONS: SiteMapSection[] = [
  {
    title: "Public Pages",
    items: [
      { title: "Landing Page", href: "/", icon: Home, description: "Main entry point for NEXA Store OS" },
      { title: "Login", href: "/auth/login", icon: LogIn, description: "Secure access to your store" },
      { title: "Sign Up", href: "/auth/signup", icon: UserPlus, description: "Join the NEXA ecosystem" },
      { title: "Onboarding", href: "/onboarding", icon: Store, description: "Set up your business identity" },
    ]
  },
  {
    title: "Operations (App)",
    items: [
      { title: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard, description: "Real-time overview of your store" },
      { title: "Point of Sale", href: "/app/sales", icon: ShoppingCart, description: "Process transactions efficiently" },
      { title: "Catalog", href: "/app/catalog", icon: Package, description: "Manage products and inventory" },
      { title: "Sales History", href: "/app/sales-history", icon: History, description: "Track every transaction" },
      { title: "Customers", href: "/app/customers", icon: Users, description: "CRM and loyalty management" },
      { title: "Expenses", href: "/app/expenses", icon: CreditCard, description: "Monitor your operational costs" },
    ]
  },
  {
    title: "Logistics & Analytics",
    items: [
      { title: "Inventory Movements", href: "/app/movements", icon: RefreshCcw, description: "Track stock flow and transfers" },
      { title: "Restocking", href: "/app/restocking", icon: Truck, description: "Replenish your supply chain" },
      { title: "Analytics", href: "/app/analytics", icon: BarChart3, description: "Deep performance insights" },
      { title: "AI Insights", href: "/app/ai-insights", icon: AlertCircle, description: "Predictive intelligence for growth" },
      { title: "Returns", href: "/app/returns", icon: RefreshCcw, description: "Handle reverse logistics" },
      { title: "Suppliers", href: "/app/suppliers", icon: MapPin, description: "Vendor relationship management" },
    ]
  },
  {
    title: "Management & Support",
    items: [
      { title: "Staff", href: "/app/staff", icon: Users, description: "Team roles and permissions" },
      { title: "Locations", href: "/app/locations", icon: MapPin, description: "Multi-branch coordination" },
      { title: "Settings", href: "/app/settings", icon: Settings, description: "Configure your OS preferences" },
      { title: "Help & Docs", href: "/app/help", icon: HelpCircle, description: "Guides and support resources" },
    ]
  },
  {
    title: "Platform Administration",
    items: [
      { title: "System Dashboard", href: "/system-admin/dashboard", icon: ShieldCheck, description: "Master oversight of all businesses" },
      { title: "Business Directory", href: "/system-admin/businesses", icon: Store, description: "Manage tenant businesses" },
      { title: "User Registry", href: "/system-admin/users", icon: Users, description: "Global user management" },
    ]
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SiteMapPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-black tracking-tight uppercase italic">NEXA Site Map</h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-2xl font-medium"
          >
            A comprehensive guide to all features and tools within the NEXA ecosystem. 
            Navigate your store's operating system with ease.
          </motion.p>
        </header>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {SECTIONS.map((section) => (
            <motion.section key={section.title} variants={item} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-1 w-8 bg-primary rounded-full" />
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">{section.title}</h2>
              </div>
              
              <div className="grid gap-3">
                {section.items.map((link: SiteMapItem) => (
                  <Link 
                    key={link.title} 
                    to={link.href}
                    className="group relative block p-4 rounded-3xl border-2 border-border/40 bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-10 w-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <link.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{link.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 font-medium">{link.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1 opacity-0 group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>

        <footer className="pt-12 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
            © {new Date().getFullYear()} NEXA Core Technology • Optimized for Performance
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="text-xs font-bold uppercase tracking-widest rounded-xl" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
            <Button className="text-xs font-black uppercase tracking-widest rounded-xl px-8" asChild>
              <Link to="/app/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
