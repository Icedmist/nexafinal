import { useState, useEffect } from "react";
import { User, Mail, Lock, Save, BadgeCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { cn } from "@/lib/utils";
import { useUpdateSelf } from "@/hooks/useStaffData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadImage } from "@/lib/storage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserProfile() {
  const { user } = useAuth();
  const { updateProfile, isLoading } = useUpdateSelf();
  
  const [fullName, setFullName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [isUploading, setIsUploading] = useState(false);
  const [email] = useState(user?.email || ""); // Email is usually fixed for staff
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (user?.displayName) {
      setFullName(user.displayName);
    }
    if (user?.photoURL) {
      setPhotoURL(user.photoURL);
    }
  }, [user?.displayName, user?.photoURL]);

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
      });
      
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      // Error handled by hook toast
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
              readOnly
              className="bg-muted pl-10 cursor-not-allowed"
              placeholder="Enter your email"
            />
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
            Email cannot be changed by staff. Contact admin if needed.
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
  );
}