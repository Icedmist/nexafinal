import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/FirebaseAuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const authContext = useAuth();
  const userId = authContext?.user?.uid;

  const getStorageKey = (uid?: string) => (uid ? `nexa_theme_${uid}` : "nexa_theme_guest");

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(getStorageKey(userId)) as Theme;
      if (saved === "dark" || saved === "light") return saved;
    }
    return "light";
  });

  // Re-sync theme whenever the active account changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getStorageKey(userId);
    const saved = localStorage.getItem(key) as Theme;
    if (saved === "dark" || saved === "light") {
      setThemeState(saved);
    } else {
      setThemeState("light");
    }
  }, [userId]);

  // Apply .dark class to DOM root element
  useEffect(() => {
    const root = document.documentElement;
    const key = getStorageKey(userId);
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(key, theme);
    }
  }, [theme, userId]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (userId) {
      try {
        const userRef = doc(db, "users", userId);
        updateDoc(userRef, { theme: newTheme }).catch(() => {});
      } catch (e) {
        // Safe fallback if offline or Firestore error
      }
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
