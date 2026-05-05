import { useState } from "react";
import { User, Mail, Lock, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserProfile() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement email and password change with Firebase
      // This requires reauthentication for security
      toast.info("Profile update functionality coming soon");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-widest">
          <User className="h-4 w-4" /> User Profile
        </CardTitle>
        <CardDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Manage your account settings and security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest">
            Login Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest">
            New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              placeholder="Enter new password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs font-black uppercase tracking-widest">
            Confirm New Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}