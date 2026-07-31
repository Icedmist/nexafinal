import { useState, useEffect } from "react";
import { User, Mail, Lock, Save, BadgeCheck, Upload, Zap, Sparkles, Layers, Calendar, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { cn } from "@/lib/utils";
import { useUpdateSelf } from "@/hooks/useStaffData";
import { useBusiness } from "@/contexts/BusinessContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useCurrency } from "@/hooks/useCurrency";
import { useRole } from "@/hooks/useRole";
import { PaymentDialog } from "@/components/settings/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadImage } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserProfile() {
  const { user, resetPassword } = useAuth();
  const { role } = useRole();
  const { updateProfile, isLoading } = useUpdateSelf();
  const { profile, updateProfile: updateBusinessProfile } = useBusiness();
  const { flags } = useFeatureFlags();
  const { format } = useCurrency();
  
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [isUploading, setIsUploading] = useState(false);
   const [email, setEmail] = useState(user?.email || ""); 
   const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [description, setDescription] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [targetTier, setTargetTier] = useState<"starter" | "professional" | "enterprise">("professional");

  useEffect(() => {
    if (user?.displayName) {
      setFullName(user.displayName);
    }
    if (user?.photoURL) {
      setPhotoURL(user.photoURL);
    }
  }, [user?.displayName, user?.photoURL]);

  const handleSaveBio = async () => {
    if (!user) return;
    setIsSavingBio(true);
    try {
      await setDoc(doc(db, "users", user.uid), { description }, { merge: true });
      toast.success("Biography updated successfully");
    } catch (error) {
      toast.error("Failed to update biography");
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      await resetPassword(user.email);
      toast.success("Password reset link sent to your email");
    } catch (error) {
      toast.error("Failed to send reset link");
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await uploadImage(file, "user_profiles", `avatar_${user?.uid}`);
      setPhotoURL(result.url);
      await updateProfile({
        photoURL: result.url,
      });
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password && password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await updateProfile({
        displayName: fullName,
        photoURL: photoURL,
        password: password || undefined,
        email: email !== user?.email ? email : undefined,
      });
      
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Error handled by hook toast
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-primary/20 transition-all group-hover:border-primary">
              <AvatarImage src={photoURL} alt={fullName} />
              <AvatarFallback className="text-2xl font-black uppercase tracking-widest bg-primary/10 text-primary">
                {fullName.charAt(0) || user?.email?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload" 
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity cursor-pointer group-hover:opacity-100",
                isUploading && "opacity-100 pointer-events-none"
              )}
            >
              {isUploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </label>
            <input 
              id="avatar-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload} 
              disabled={isUploading}
            />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-black uppercase tracking-widest">{fullName || "Anonymous User"}</h4>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Profile Avatar</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
          <Badge variant="secondary" className="capitalize">{role || "member"}</Badge>
          {user?.uid && (
            <span className="text-[10px] font-mono text-muted-foreground">
              User ID: {user.uid.substring(0, 8)}...
            </span>
          )}
          {user?.metadata?.creationTime && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {new Date(user.metadata.creationTime).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-xs font-black uppercase tracking-widest">
            Personal Biography & Shift Description
          </Label>
          <textarea
            id="bio"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your role, typical shifts, qualifications, or personal notes to share with other admins..."
            className="flex-1 min-h-[100px] rounded-lg border bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            onClick={handleSaveBio}
            disabled={isSavingBio}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSavingBio ? "Saving..." : "Save Bio"}
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest">Forgot Password or Need a Fast Link?</h4>
              <p className="text-[10px] text-muted-foreground mt-1">
                We can send a secure, direct link to your email ({user?.email || "your email"}) to reset your password. You'll be logged out across devices once complete.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendResetEmail}
            disabled={isSendingReset || !user?.email}
            className="md:self-center shrink-0"
          >
            <KeyRound className="h-3.5 w-3.5 mr-2" />
            {isSendingReset ? "Sending Link..." : "Send Reset Link"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest">
            Full Name
          </Label>
          <div className="relative">
            <BadgeCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              placeholder="Enter your full name"
            />
          </div>
        </div>

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
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Changing your email will update your login credentials.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-card px-2 text-muted-foreground font-black">Change Password</span>
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
                placeholder="Enter new password (optional)"
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
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Subscription & Billing
          </CardTitle>
          <CardDescription>
            Migrate between subscription plans, update your billing profile, or unlock store features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-5 rounded-xl border border-teal-500/10 bg-teal-50/10 dark:bg-teal-950/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Active Plan:</span>
                <Badge className="bg-primary/15 text-primary border-none font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">
                  {flags.planName}
                </Badge>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">{flags.status}</span>
              </div>
              <p className="text-sm font-bold text-foreground mt-2">
                {flags.planId === "enterprise" 
                  ? "Enterprise License Mode" 
                  : flags.planId === "professional" 
                    ? "Professional License Mode" 
                    : "Starter License Mode"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xl">
                {flags.planId === "enterprise"
                  ? "Enjoy unlimited branches, global B2B syndication, dynamic AI demand curves, and cohort customer analysis."
                  : flags.planId === "professional"
                    ? "Enjoy up to 3 branch locations, predictive replenishment suggestions, cross-branch pools, and email Movement summaries."
                    : "Ideal for small standalone shops. Unlock premium operations by migrating to Professional or Enterprise."}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="font-semibold text-sm">Available Migrations & Tier Actions</h4>
            <p className="text-xs text-muted-foreground">Select a subscription plan below to migrate your business features immediately.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Starter Column */}
              <div className="p-4 rounded-lg border bg-card/40 flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs flex items-center gap-1.5"><Layers className="h-4 w-4 text-slate-500" /> Starter Plan</h5>
                  <p className="text-[10px] text-muted-foreground mt-1">Core operations features enabled for all stores.</p>
                  <p className="text-xs font-extrabold mt-2 text-foreground">Free / {format(0)}</p>
                </div>
                {flags.planId === "starter" ? (
                  <Button disabled size="sm" className="w-full text-xs font-semibold" variant="secondary">Currently Active</Button>
                ) : (
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={async () => {
                      try {
                        await updateBusinessProfile({ settings: { ...(profile?.settings || {}), planId: "starter", planName: "Starter", subscriptionStatus: "active" } });
                        toast.success("Downgraded to Starter Plan successfully.");
                      } catch (err) {
                        toast.error("Failed to downgrade plan.");
                      }
                    }}
                    className="w-full text-xs font-semibold" 
                    variant="outline"
                  >
                    Select Starter
                  </Button>
                )}
              </div>

              {/* Professional Column */}
              <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/[0.01] flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> Professional Plan</h5>
                  <p className="text-[10px] text-muted-foreground mt-1">Scale operations with intelligent optimization models.</p>
                  <p className="text-xs font-extrabold mt-2 text-foreground">{format(6500)} / mo</p>
                </div>
                {flags.planId === "professional" ? (
                  <Button disabled size="sm" className="w-full text-xs font-semibold" variant="secondary">Currently Active</Button>
                ) : (
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={() => {
                      setTargetTier("professional");
                      setPaymentOpen(true);
                    }}
                    className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    Select Professional
                  </Button>
                )}
              </div>

              {/* Enterprise Column */}
              <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/[0.01] flex flex-col justify-between space-y-3">
                <div>
                  <h5 className="font-bold text-xs flex items-center gap-1.5"><Zap className="h-4 w-4 text-blue-500" /> Enterprise Plan</h5>
                  <p className="text-[10px] text-muted-foreground mt-1">Automate and syndicate multi-channel pipelines seamlessly.</p>
                  <p className="text-xs font-extrabold mt-2 text-foreground">{format(45000)} / mo</p>
                </div>
                {flags.planId === "enterprise" ? (
                  <Button disabled size="sm" className="w-full text-xs font-semibold" variant="secondary">Currently Active</Button>
                ) : (
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={() => {
                      setTargetTier("enterprise");
                      setPaymentOpen(true);
                    }}
                    className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Select Enterprise
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PaymentDialog 
        open={paymentOpen} 
        onOpenChange={setPaymentOpen} 
        targetTier={targetTier} 
      />
    </div>
  );
}