import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, Eye, EyeOff } from "lucide-react";

import { useTenant } from "@/hooks/useTenant";
import { Building2 } from "lucide-react";

import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const { store } = useTenant();
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getAuthErrorMessage = (code: string | undefined, originalMessage: string) => {
    switch (code) {
      case "auth/user-not-found":
        return "No account was found with that email.";
      case "auth/wrong-password":
        return "The password is incorrect. Please try again.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many failed login attempts. Please wait and try again.";
      case "auth/network-request-failed":
        return "Network issue while signing in. Check your connection and try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Verify the staff account exists in Firebase Auth and that the password is correct.";
      case "auth/unauthorized-domain":
      case "auth/domain-not-allowed":
        return "This domain is not authorized for Firebase login. Add the current hostname to your Firebase authorized domains.";
      case "auth/operation-not-allowed":
        return "Email/password login is disabled for this Firebase project. Enable it in the Firebase Console Authentication settings.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact your administrator.";
      default:
        return originalMessage || "Invalid credentials.";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await login(email, password);
      
      // If we are on a store subdomain, verify authorization
      if (store) {
        const loggedInUser = cred.user;
        const isOwner = store.ownerId === loggedInUser.uid;

        const tokenResult = await loggedInUser.getIdTokenResult(true);
        const claimStoreId = tokenResult.claims.storeId as string | undefined;

        let isStaff = false;
        if (!isOwner) {
          if (claimStoreId === store.id) {
            isStaff = true;
          } else {
            // 1. Primary Check: Try UID lookup (most reliable for newly provisioned staff)
            const staffDoc = await getDoc(doc(db, "staff", loggedInUser.uid));

            if (staffDoc.exists()) {
              const data = staffDoc.data();
              isStaff = data.storeId === store.id && data.isActive === true;
            }

            // 2. Fallback: Query by email (lowercased) for legacy or migrated records
            if (!isStaff && loggedInUser.email) {
              const staffQuery = query(
                collection(db, "staff"),
                where("email", "==", loggedInUser.email.toLowerCase()),
                where("storeId", "==", store.id),
                where("isActive", "==", true),
                limit(1)
              );
              const staffSnap = await getDocs(staffQuery);
              isStaff = !staffSnap.empty;
            }

            if (isStaff) {
              // Force token refresh if staff metadata exists but claim was stale.
              await loggedInUser.getIdTokenResult(true);
            }
          }
        }

        if (!isOwner && !isStaff) {
          await logout();
          throw new Error(`You are not authorized to access ${store.name}.`);
        }
      }

      toast.success("Welcome back!");
      navigate({ to: "/app/dashboard" });
    } catch (err: any) {
      const message = getAuthErrorMessage(err?.code, err?.message || "Invalid credentials");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 flex text-primary mb-6 shadow-inner ring-8 ring-primary/5">
           {store ? <Building2 className="h-12 w-12" /> : <Package className="h-12 w-12" />}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
          {store ? `Login to ${store.name}` : "Welcome Back"}
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground italic">
          {store ? "Staff & Management Access Only" : "Sign in to your account"}
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6 rounded-[2.5rem] border-2 border-border bg-card p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-2 font-bold focus:border-primary/50 transition-all"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-2 font-bold pr-12 focus:border-primary/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 relative z-10 overflow-hidden group/btn" disabled={loading}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : "Sign In"}
        </Button>
      </form>

      <p className="text-center text-sm font-bold text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/auth/signup" className="text-primary hover:underline decoration-2 underline-offset-4">
          Create one now
        </Link>
      </p>
    </div>
  );
}
