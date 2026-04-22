import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  // Hydration safety for next-themes
  const [mounted, setMounted] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<'telnyx' | 'twilio'>('telnyx');

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.get();
      if (response.data) {
        setDefaultProvider(response.data.default_provider || 'telnyx');
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProvider = async (provider: 'telnyx' | 'twilio') => {
    setIsSaving(true);
    try {
      await settingsApi.update({ default_provider: provider });
      setDefaultProvider(provider);
      toast.success('Default provider updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update provider');
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-display text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground tracking-body">Manage your account preferences and application settings.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 select-none shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold tracking-display text-foreground mb-4">Appearance</h2>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border ${
              theme === "light" 
                ? "border-black/20 dark:border-white/20 bg-foreground/5 text-foreground font-semibold shadow-sm" 
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            } transition-all duration-200`}
          >
            <Sun className="w-5 h-5 mb-2" />
            <span className="text-sm font-medium">Light</span>
          </button>
          
          <button
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border ${
              theme === "dark" 
                ? "border-black/20 dark:border-white/20 bg-foreground/5 text-foreground font-semibold shadow-sm" 
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            } transition-all duration-200`}
          >
            <Moon className="w-5 h-5 mb-2" />
            <span className="text-sm font-medium">Dark</span>
          </button>
          
          <button
            onClick={() => setTheme("system")}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border ${
              theme === "system" 
                ? "border-black/20 dark:border-white/20 bg-foreground/5 text-foreground font-semibold shadow-sm" 
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            } transition-all duration-200`}
          >
            <Monitor className="w-5 h-5 mb-2" />
            <span className="text-sm font-medium">System</span>
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold tracking-display text-foreground mb-1">Telephony default</h2>
        <p className="text-sm text-muted-foreground mb-4 tracking-body">
          Select which provider the manual dialer should use by default.
        </p>
        
        {isLoading ? (
           <div className="flex space-x-3">
             <div className="h-16 bg-muted rounded-xl w-32 animate-pulse"></div>
             <div className="h-16 bg-muted rounded-xl w-32 animate-pulse"></div>
           </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSaveProvider('telnyx')}
              disabled={isSaving}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-48 ${
                defaultProvider === 'telnyx'
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border bg-transparent hover:bg-muted'
              }`}
            >
              <div className="h-9 w-9 rounded-lg bg-foreground flex items-center justify-center text-background font-bold text-xs shrink-0">Tx</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Telnyx</p>
              </div>
            </button>
            <button
              onClick={() => handleSaveProvider('twilio')}
              disabled={isSaving}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all w-48 ${
                defaultProvider === 'twilio'
                  ? 'border-foreground bg-foreground/5'
                  : 'border-border bg-transparent hover:bg-muted'
              }`}
            >
              <div className="h-9 w-9 rounded-lg bg-[#F22F46] flex items-center justify-center text-white font-bold text-xs shrink-0">Tw</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Twilio</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 select-none shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold tracking-display text-foreground mb-1">Telephony & Integrations</h2>
        <p className="text-sm text-muted-foreground mb-4 tracking-body">
          All Telnyx, Twilio, and CRM configurations have been moved to the new Connectors hub.
        </p>
        <div className="px-4 py-3 bg-muted rounded-xl text-foreground text-sm border border-border text-center">
          Please navigate to the <strong className="text-foreground font-semibold underline decoration-black/20 dark:decoration-white/20 underline-offset-4">Connectors</strong> tab in the sidebar to configure Telnyx API & WebRTC.
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 select-none opacity-60 shadow-sm transition-colors duration-300">
        <h2 className="text-lg font-semibold tracking-display text-foreground mb-1">Profile Details</h2>
        <p className="text-sm text-muted-foreground mb-6 tracking-body">Update your personal information and preferences.</p>
        
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded-xl w-full animate-pulse"></div>
          <div className="h-10 bg-muted rounded-xl w-full animate-pulse"></div>
          <div className="h-10 bg-foreground/20 rounded-xl w-32 animate-pulse mt-4"></div>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-6 tracking-body">Profile management coming in next update.</p>
      </div>
    </div>
  );
}
