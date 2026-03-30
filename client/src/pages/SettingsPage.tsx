export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Settings</h1>
        <p className="text-zinc-400">Manage your account preferences and application settings.</p>
      </div>

      <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 select-none opacity-50">
        <h2 className="text-lg font-semibold text-white mb-1">Telephony & Integrations</h2>
        <p className="text-sm text-zinc-400 mb-4">
          All Telnyx, Twilio, and CRM configurations have been moved to the new Connectors hub.
        </p>
        <div className="px-4 py-3 bg-white/5 rounded-xl text-zinc-300 text-sm border border-white/10 text-center">
          Please navigate to the <strong className="text-emerald-400">Connectors</strong> tab in the sidebar to configure Telnyx API & WebRTC.
        </div>
      </div>

      <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6 select-none opacity-50">
        <h2 className="text-lg font-semibold text-white mb-1">Profile Details</h2>
        <p className="text-sm text-zinc-400 mb-6">Update your personal information and preferences.</p>
        
        <div className="space-y-4">
          <div className="h-10 bg-white/5 rounded-xl border border-white/10 w-full animate-pulse"></div>
          <div className="h-10 bg-white/5 rounded-xl border border-white/10 w-full animate-pulse"></div>
          <div className="h-10 bg-emerald-500/20 rounded-xl border border-emerald-500/10 w-32 animate-pulse mt-4"></div>
        </div>
        <p className="text-xs text-center text-zinc-500 mt-6 mt-4">Profile management coming in next update.</p>
      </div>
    </div>
  );
}
