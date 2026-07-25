import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { useDemo } from "@/hooks/useDemo";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Mail, Lock, User, Play, KeyRound, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const { login, signup, resetPassword } = useAuth();
  const { enterDemoMode } = useDemo();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const inviteStoreName = sessionStorage.getItem("nexa_invite_storeName");
  const inviteRole = sessionStorage.getItem("nexa_invite_role");

  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      toast.error("Please enter your email address");
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(cleanEmail);
      setIsForgotPassword(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setResetLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = formData.email.trim();
    const cleanPassword = formData.password;
    const cleanName = formData.name.trim();

    try {
      if (tab === "login") {
        await login(cleanEmail, cleanPassword);
        toast.success("Successfully logged in");
      } else {
        if (!cleanName) {
          toast.error("Please enter your name");
          setLoading(false);
          return;
        }
        try {
          await signup(cleanEmail, cleanPassword, cleanName);
          toast.success("Account created successfully");
        } catch (regError: unknown) {
          const regErrObj = regError as { code?: string; message?: string };
          const regCode = regErrObj?.code || "";
          const regRawMessage = regErrObj?.message || "";
          if (regCode === "auth/email-already-in-use" || regRawMessage.includes("email-already-in-use")) {
            await login(cleanEmail, cleanPassword);
            toast.success("Logged in with existing account");
          } else {
            throw regError;
          }
        }
      }
      onClose();
    } catch (error: unknown) {
      const errObj = error as { code?: string; message?: string };
      const code = errObj?.code || "";
      const rawMessage = errObj?.message || "";

      const isExpectedUserError = 
        code === "auth/wrong-password" || 
        code === "auth/user-not-found" || 
        code === "auth/invalid-credential" ||
        code === "auth/invalid-email" ||
        code === "auth/weak-password" ||
        code === "auth/email-already-in-use" ||
        rawMessage.includes("invalid-credential") ||
        rawMessage.includes("auth/invalid-credential") ||
        rawMessage.includes("wrong-password") ||
        rawMessage.includes("user-not-found") ||
        rawMessage.includes("email-already-in-use");

      if (isExpectedUserError) {
        console.warn("Auth warning (expected user error):", rawMessage || code);
      } else {
        console.error("Auth error:", error);
      }

      let message = "Authentication failed. Please check your credentials.";
      
      if (code === "auth/email-already-in-use") {
        message = "This email is already registered. Please sign in instead.";
        setTab("login");
      } else if (
        code === "auth/wrong-password" || 
        code === "auth/user-not-found" || 
        code === "auth/invalid-credential" ||
        rawMessage.includes("invalid-credential") ||
        rawMessage.includes("auth/invalid-credential")
      ) {
        message = "Invalid email or password.";
      } else if (code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (code === "auth/operation-not-allowed") {
        message = "Email/Password sign-in is not enabled in Firebase Console.";
      } else if (code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (rawMessage) {
        try {
          const parsed = JSON.parse(rawMessage);
          if (parsed.error) message = parsed.error;
          else message = rawMessage;
        } catch {
          message = rawMessage;
        }
      }
      
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    enterDemoMode({
      businessType: "retail",
      categories: ["Apparel", "Electronics", "Groceries"],
      storeName: "Nexa Demo OS",
      storePhone: "+1 (555) 019-2834",
      storeAddress: "742 Evergreen Terrace, Springfield",
      receiptFooter: "Thank you for shopping at Nexa Demo OS!",
      taxRate: 8.25,
      brandColor: "#059669"
    });
    localStorage.setItem("stackwise-onboarding-done", "true");
    toast.success("Demo session initialized locally!");
    onClose();
    navigate("/app/dashboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {isForgotPassword ? (
                <KeyRound className="h-6 w-6 text-primary" />
              ) : (
                <ShieldCheck className="h-6 w-6 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {isForgotPassword 
              ? "Reset Password" 
              : tab === "login" 
                ? "Welcome back" 
                : "Create your account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isForgotPassword 
              ? "Enter your email address and we'll send you a recovery link"
              : tab === "login" 
                ? "Enter your credentials to access your store" 
                : "Get started with Nexa OS and scale your business"}
          </DialogDescription>
        </DialogHeader>

        {inviteStoreName && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 text-center -mt-2 mb-2">
            You have been added to <strong>{inviteStoreName}</strong> as {inviteRole === "admin" ? "an Admin" : "an Inventory Manager"}. Please <strong>Login</strong> with the email and temporary password provided by your store administrator.
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Password Reset Link
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setIsForgotPassword(false)}
            >
              Back to Login
            </Button>
          </form>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <form onSubmit={handleAction} className="space-y-4 mt-6">
            {tab === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(formData.email);
                      setIsForgotPassword(true);
                    }}
                    className="text-xs text-primary hover:underline font-medium focus:outline-none"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tab === "login" ? "Sign In" : "Create Account"}
            </Button>

            {tab === "login" && (
              <>
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-muted-foreground/25"></div>
                  <span className="flex-shrink mx-3 text-[10px] tracking-wider uppercase font-medium text-muted-foreground/75">Or bypass for testing</span>
                  <div className="flex-grow border-t border-muted-foreground/25"></div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full gap-2 border-dashed border-emerald-500/50 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-all text-sm font-medium"
                  onClick={handleDemoBypass}
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Launch Instant Demo Mode
                </Button>
              </>
            )}
          </form>
        </Tabs>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </DialogContent>
    </Dialog>
  );
}
