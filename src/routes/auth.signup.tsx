import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signup(email, password, name);
      toast.success("Account created successfully!");
      
      // Wait a moment for custom claims to potentially sync (if staff)
      // or just go to onboarding to check for store creation
      setTimeout(() => {
        navigate({ to: "/onboarding" as any });
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10 flex text-secondary mb-6 shadow-inner">
           <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Get Started</h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground italic">Join 500+ businesses scaling with NEXA</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-6 rounded-[2.5rem] border-2 border-border bg-card p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl border-2 font-bold focus:border-secondary/50 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-2 font-bold focus:border-secondary/50 transition-all"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-2 font-bold focus:border-secondary/50 transition-all"
            />
          </div>
        </div>

        <Button type="submit" variant="secondary" className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-secondary/20 relative z-10 overflow-hidden group/btn" disabled={loading}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
          {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" /> : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm font-bold text-muted-foreground">
        Already have an account?{" "}
        <Link to="/auth/login" className="text-secondary hover:underline decoration-2 underline-offset-4">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
