import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';

export default function SettingsPage() {
  const [telnyxKey, setTelnyxKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await settingsApi.get();
        if (data?.telnyx_api_key) {
          setTelnyxKey(data.telnyx_api_key);
          setIsConnected(true);
        }
      } catch {
        // No settings yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telnyxKey.trim()) return toast.error('API key is required');
    
    setIsSaving(true);
    try {
      await settingsApi.update({ telnyx_api_key: telnyxKey.trim() });
      toast.success('Settings saved!');
      setIsConnected(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Settings</h1>
        <p className="text-zinc-400">Manage your Telnyx integration and account preferences.</p>
      </div>

      {/* Telnyx Configuration */}
      <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Telnyx API Key</h2>
            <p className="text-sm text-zinc-500">Required for making outbound calls through the dialer.</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs font-medium ${
            isConnected 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800 border-white/5 text-zinc-500'
          }`}>
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="telnyx-key" className="block text-sm font-medium text-zinc-400 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  id="telnyx-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="KEY..."
                  value={telnyxKey}
                  onChange={(e) => setTelnyxKey(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-black/30 border border-white/10 text-white placeholder-zinc-600 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSaving || !telnyxKey.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
