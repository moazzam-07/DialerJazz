import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plug, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import type { UserSettings } from '@/lib/api';

export default function ConnectorsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Telnyx Modal State
  const [isTelnyxModalOpen, setIsTelnyxModalOpen] = useState(false);
  const [telnyxKey, setTelnyxKey] = useState('');
  const [sipLogin, setSipLogin] = useState('');
  const [sipPassword, setSipPassword] = useState('');
  const [callerNumber, setCallerNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingSip, setIsSavingSip] = useState(false);

  // Twilio Modal State
  const [isTwilioModalOpen, setIsTwilioModalOpen] = useState(false);
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioApiKey, setTwilioApiKey] = useState('');
  const [twilioApiSecret, setTwilioApiSecret] = useState('');
  const [twilioTwimlAppSid, setTwilioTwimlAppSid] = useState('');
  const [twilioCallerNumber, setTwilioCallerNumber] = useState('');
  const [isVerifyingTwilio, setIsVerifyingTwilio] = useState(false);
  const [isSavingTwilio, setIsSavingTwilio] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await settingsApi.get();
      setSettings(data);
      // Pre-fill SIP fields if they exist
      if (data?.telnyx_sip_login) setSipLogin(data.telnyx_sip_login);
      if (data?.telnyx_sip_password) setSipPassword(data.telnyx_sip_password);
      if (data?.telnyx_caller_number) setCallerNumber(data.telnyx_caller_number);
      // Pre-fill Twilio fields if they exist
      if (data?.twilio_account_sid) setTwilioAccountSid(data.twilio_account_sid);
      if (data?.twilio_api_key) setTwilioApiKey(data.twilio_api_key);
      if (data?.twilio_api_secret) setTwilioApiSecret(data.twilio_api_secret);
      if (data?.twilio_twiml_app_sid) setTwilioTwimlAppSid(data.twilio_twiml_app_sid);
      if (data?.twilio_caller_number) setTwilioCallerNumber(data.twilio_caller_number);
    } catch (error: unknown) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const hasTelnyxKey = !!settings?.telnyx_api_key;
  const hasSipCreds = !!settings?.telnyx_sip_login && !!settings?.telnyx_sip_password;
  const hasTwilioKey = !!settings?.twilio_account_sid;
  const hasTwilioApiCreds = !!settings?.twilio_api_key && !!settings?.twilio_api_secret && !!settings?.twilio_twiml_app_sid;

  const handleVerifyTelnyx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telnyxKey.trim()) {
      toast.error('API Key cannot be empty');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await settingsApi.verifyTelnyxKey(telnyxKey);
      if (response.data.success) {
        toast.success(response.data.message || 'Telnyx connected successfully!');
        setIsTelnyxModalOpen(false);
        setTelnyxKey('');
        fetchSettings(); // refresh to show connected state
      } else {
        toast.error(response.data.message || 'Invalid Telnyx API Key');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveSipCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sipLogin.trim() || !sipPassword.trim()) {
      toast.error('SIP Login and Password are required');
      return;
    }
    setIsSavingSip(true);
    try {
      await settingsApi.update({
        telnyx_sip_login: sipLogin,
        telnyx_sip_password: sipPassword,
        telnyx_caller_number: callerNumber || undefined,
      });
      toast.success('SIP credentials saved!');
      fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save SIP credentials';
      toast.error(message);
    } finally {
      setIsSavingSip(false);
    }
  };

  // === Twilio Handlers ===
  const handleVerifyTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioAccountSid.trim() || !twilioAuthToken.trim()) {
      toast.error('Account SID and Auth Token are required');
      return;
    }
    setIsVerifyingTwilio(true);
    try {
      const result = await settingsApi.verifyTwilio(twilioAccountSid, twilioAuthToken);
      toast.success(result.data?.message || 'Twilio credentials verified!');
      fetchSettings();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsVerifyingTwilio(false);
    }
  };

  const handleSaveTwilioCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioApiKey.trim() || !twilioApiSecret.trim() || !twilioTwimlAppSid.trim()) {
      toast.error('API Key, API Secret, and TwiML App SID are all required');
      return;
    }
    setIsSavingTwilio(true);
    try {
      await settingsApi.update({
        twilio_api_key: twilioApiKey,
        twilio_api_secret: twilioApiSecret,
        twilio_twiml_app_sid: twilioTwimlAppSid,
        twilio_caller_number: twilioCallerNumber || undefined,
      });
      toast.success('Twilio WebRTC credentials saved!');
      fetchSettings();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save Twilio credentials');
    } finally {
      setIsSavingTwilio(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Connectors</h1>
        <p className="text-muted-foreground">Manage your external telephony and CRM integrations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Telnyx Card */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-surface p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-[0.85rem] bg-foreground flex items-center justify-center text-background font-bold text-lg mb-4 shadow-sm">
               Tx
            </div>
            <div className="flex flex-col items-end gap-2">
              {hasTelnyxKey ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground border border-black/10 dark:border-white/10 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  API Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-500/20">
                  <XCircle className="h-3 w-3" />
                  API Not Connected
                </span>
              )}
              {hasSipCreds && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border border-border mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  SIP Ready
                </span>
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-2">Telnyx WebRTC</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Power outbound dialing and live call tracking directly from the browser using standard WebRTC.
          </p>
          
          <button
            onClick={() => setIsTelnyxModalOpen(true)}
            className="group flex w-full items-center justify-between rounded-[0.85rem] bg-foreground text-background px-4 py-3.5 text-sm font-medium transition-all hover:opacity-90 shadow-sm"
          >
            {hasTelnyxKey ? 'Update API Key' : 'Connect Telnyx'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Twilio Card */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-surface p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-[0.85rem] bg-[#F22F46] flex items-center justify-center text-white font-bold text-lg mb-4 shadow-sm">
               Tw
            </div>
            <div className="flex flex-col items-end gap-2">
              {hasTwilioKey ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground border border-black/10 dark:border-white/10 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  API Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-500/20">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </span>
              )}
              {hasTwilioApiCreds && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground border border-border mt-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  WebRTC Ready
                </span>
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-2">Twilio Voice</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Route calls via Twilio Voice API. Reliable international calling with browser-based WebRTC.
          </p>
          
          <button
            onClick={() => setIsTwilioModalOpen(true)}
            className="group flex w-full items-center justify-between rounded-[0.85rem] bg-foreground text-background px-4 py-3.5 text-sm font-medium transition-all hover:opacity-90 shadow-sm"
          >
            {hasTwilioKey ? 'Update Twilio Config' : 'Connect Twilio'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Connection Modal */}
      {isTelnyxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold tracking-display text-foreground flex items-center gap-2">
                  <Plug className="h-5 w-5 text-foreground" />
                  Connect Telnyx
                </h3>
                <button
                  onClick={() => setIsTelnyxModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:bg-muted/80 hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-8">
                {/* 1. REST API Form */}
                <form onSubmit={handleVerifyTelnyx} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground tracking-display mb-1">REST API V2</h4>
                    <p className="text-xs text-muted-foreground tracking-body mb-4">Required for backend synchronization.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-foreground text-opacity-90 mb-1">
                      Telnyx V2 API Key
                    </label>
                    <input
                      type="password"
                      id="apiKey"
                      placeholder="KEY0..."
                      value={telnyxKey}
                      onChange={(e) => setTelnyxKey(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-[0.85rem] bg-foreground text-background px-6 py-3 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                      disabled={isVerifying || !telnyxKey.trim()}
                    >
                      {isVerifying ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isVerifying ? 'Verifying...' : (hasTelnyxKey ? 'Update API Key' : 'Verify & Connect')}
                    </button>
                  </div>
                </form>

                <hr className="border-border" />

                {/* 2. WebRTC SIP Form */}
                <form onSubmit={handleSaveSipCreds} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground tracking-display mb-1">WebRTC (SIP) Connection</h4>
                    <p className="text-xs text-muted-foreground tracking-body mb-4">Required for the browser-based dialer.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label htmlFor="sipLogin" className="block text-sm font-medium text-foreground text-opacity-90 mb-1">
                        SIP Username
                      </label>
                      <input
                        type="text"
                        id="sipLogin"
                        placeholder="my_sip_user"
                        value={sipLogin}
                        onChange={(e) => setSipLogin(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <label htmlFor="sipPassword" className="block text-sm font-medium text-foreground text-opacity-90 mb-1">
                        SIP Password
                      </label>
                      <input
                        type="password"
                        id="sipPassword"
                        placeholder="••••••••"
                        value={sipPassword}
                        onChange={(e) => setSipPassword(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label htmlFor="callerNumber" className="block text-sm font-medium text-foreground text-opacity-90 mb-1">
                        Caller ID Number <span className="text-muted-foreground text-opacity-70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        id="callerNumber"
                        placeholder="+1234567890"
                        value={callerNumber}
                        onChange={(e) => setCallerNumber(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-[0.85rem] bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                      disabled={isSavingSip || !sipLogin.trim() || !sipPassword.trim()}
                    >
                      {isSavingSip ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isSavingSip ? 'Saving...' : 'Save SIP Credentials'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Twilio Connection Modal */}
      {isTwilioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold tracking-display text-foreground flex items-center gap-2">
                  <Plug className="h-5 w-5 text-foreground" />
                  Connect Twilio
                </h3>
                <button
                  onClick={() => setIsTwilioModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-8">
                {/* 1. Account SID + Auth Token */}
                <form onSubmit={handleVerifyTwilio} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground tracking-display mb-1">Account Credentials</h4>
                    <p className="text-xs text-muted-foreground tracking-body mb-4">From your Twilio Console dashboard.</p>
                  </div>
                  
                  <div>
                    <label htmlFor="twilioSid" className="block text-sm font-medium text-foreground mb-1">Account SID</label>
                    <input
                      type="text"
                      id="twilioSid"
                      placeholder="AC..."
                      value={twilioAccountSid}
                      onChange={(e) => setTwilioAccountSid(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="twilioToken" className="block text-sm font-medium text-foreground mb-1">Auth Token</label>
                    <input
                      type="password"
                      id="twilioToken"
                      placeholder="••••••••"
                      value={twilioAuthToken}
                      onChange={(e) => setTwilioAuthToken(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-[0.85rem] bg-foreground text-background px-6 py-3 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                      disabled={isVerifyingTwilio || !twilioAccountSid.trim() || !twilioAuthToken.trim()}
                    >
                      {isVerifyingTwilio ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isVerifyingTwilio ? 'Verifying...' : (hasTwilioKey ? 'Update Credentials' : 'Verify & Connect')}
                    </button>
                  </div>
                </form>

                <hr className="border-border" />

                {/* 2. API Key + Secret + TwiML App */}
                <form onSubmit={handleSaveTwilioCreds} className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground tracking-display mb-1">WebRTC Configuration</h4>
                    <p className="text-xs text-muted-foreground tracking-body mb-4">API Key, Secret, and TwiML App SID for browser dialing.</p>
                  </div>

                  <div>
                    <label htmlFor="twilioApiKey" className="block text-sm font-medium text-foreground mb-1">API Key SID</label>
                    <input
                      type="text"
                      id="twilioApiKey"
                      placeholder="SK..."
                      value={twilioApiKey}
                      onChange={(e) => setTwilioApiKey(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="twilioApiSecret" className="block text-sm font-medium text-foreground mb-1">API Secret</label>
                    <input
                      type="password"
                      id="twilioApiSecret"
                      placeholder="••••••••"
                      value={twilioApiSecret}
                      onChange={(e) => setTwilioApiSecret(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="twilioTwiml" className="block text-sm font-medium text-foreground mb-1">TwiML App SID</label>
                    <input
                      type="text"
                      id="twilioTwiml"
                      placeholder="AP..."
                      value={twilioTwimlAppSid}
                      onChange={(e) => setTwilioTwimlAppSid(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="twilioCallerNum" className="block text-sm font-medium text-foreground mb-1">
                      Caller ID Number <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="twilioCallerNum"
                      placeholder="+1234567890"
                      value={twilioCallerNumber}
                      onChange={(e) => setTwilioCallerNumber(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-[0.85rem] bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                      disabled={isSavingTwilio || !twilioApiKey.trim() || !twilioApiSecret.trim() || !twilioTwimlAppSid.trim()}
                    >
                      {isSavingTwilio ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isSavingTwilio ? 'Saving...' : 'Save WebRTC Config'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
