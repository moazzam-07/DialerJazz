import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  SkipForward,
  ChevronDown,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  Building,
  MapPin,
  Star,
  Mail,
  Globe,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Hash,
  Activity,
  Settings2,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { leadsApi, campaignsApi, settingsApi } from '@/lib/api';
import type { Lead, Campaign } from '@/lib/api';
import { useTelnyxCall } from '@/hooks/useTelnyxCall';
import type { CallState } from '@/hooks/useTelnyxCall';
import { useDevices } from '@/hooks/useDevices';
import AudioVisualizer from '@/components/AudioVisualizer';
import AudioPlayer from '@/components/AudioPlayer';

type Disposition = 'answered' | 'no_answer' | 'voicemail' | 'busy' | 'dnc';

const DISPOSITIONS: { value: Disposition; label: string; color: string; emoji: string }[] = [
  { value: 'answered',   label: 'Answered',    color: 'bg-emerald-500', emoji: '🔥' },
  { value: 'no_answer',  label: 'No Answer',   color: 'bg-amber-500', emoji: '📵' },
  { value: 'voicemail',  label: 'Voicemail',   color: 'bg-blue-500', emoji: '📫' },
  { value: 'busy',       label: 'Busy',        color: 'bg-orange-500', emoji: '⏳' },
  { value: 'dnc',        label: 'Do Not Call',  color: 'bg-red-500', emoji: '🚫' },
];

const DTMF_KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];

function formatMS(s: number) {
  return `${(s * 1000).toFixed(2)}ms`;
}

export default function DialerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaign');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisposition, setShowDisposition] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);
  const [showDTMF, setShowDTMF] = useState(false);
  const [sipConfigured, setSipConfigured] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Telnyx WebRTC hook — with advanced features
  const telnyx = useTelnyxCall();
  const prevCallState = useRef<CallState>('idle');

  // Device management
  const devices = useDevices();
  const audioInDevices = devices.filter((device) => device.kind === 'audioinput');
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string>('');

  // Load campaign + its leads + SIP creds
  const loadData = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    try {
      const [campaignRes, leadsRes, settingsRes] = await Promise.all([
        campaignsApi.get(campaignId),
        leadsApi.listByCampaign(campaignId, { limit: 500 }),
        settingsApi.get(),
      ]);
      setCampaign(campaignRes.data as Campaign);

      const allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
      const undialedLeads = allLeads.filter(l => l.status === 'new' || l.status === 'calling');
      setLeads(undialedLeads);

      // Auto-connect to Telnyx if SIP creds are configured
      const settings = settingsRes.data;
      if (settings?.telnyx_sip_login && settings?.telnyx_sip_password) {
        setSipConfigured(true);
        telnyx.connect(
          settings.telnyx_sip_login,
          settings.telnyx_sip_password,
          settings.telnyx_caller_number
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load campaign';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    loadData();
    return () => {
      telnyx.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

  // Watch for call state changes → auto-show disposition when call ends
  useEffect(() => {
    if (prevCallState.current === 'active' && telnyx.callState === 'done') {
      setShowDisposition(true);
      setShowDTMF(false);
    }
    prevCallState.current = telnyx.callState;
  }, [telnyx.callState]);

  // Show telnyx SIP errors
  useEffect(() => {
    if (telnyx.sipError) {
      toast.error(telnyx.sipError, { duration: 5000 });
    }
  }, [telnyx.sipError]);

  // Initialize default mic
  useEffect(() => {
    if (!selectedAudioInputId && audioInDevices.length > 0) {
      setSelectedAudioInputId(audioInDevices[0].deviceId);
    }
  }, [audioInDevices, selectedAudioInputId]);

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedAudioInputId(deviceId);
    if (telnyx.activeCall) {
      try {
        await telnyx.setAudioInput(deviceId);
        toast.success('Microphone switched');
      } catch (err) {
        toast.error('Failed to switch microphone');
      }
    }
  };

  // Keyboard shortcut for spacebar to dial
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && telnyx.callState === 'idle' && !showDisposition && leads.length > 0 && currentIndex < leads.length) {
        e.preventDefault();
        handleDial();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telnyx.callState, showDisposition, leads, currentIndex]);

  const currentLead = leads[currentIndex];
  const nextLead = leads[currentIndex + 1];
  const thirdLead = leads[currentIndex + 2];
  const isInCall = ['trying', 'ringing', 'active'].includes(telnyx.callState);

  const handleDial = () => {
    if (!currentLead) return;

    if (!sipConfigured) {
      toast.error('Please configure your Telnyx SIP credentials in the Connectors page first.');
      return;
    }

    if (telnyx.connectionStatus !== 'registered') {
      toast.error('Telnyx is still connecting. Please wait...');
      return;
    }

    telnyx.dial(currentLead.phone);
  };

  const handleHangUp = () => {
    telnyx.hangup();
    setShowDisposition(true);
    setShowDTMF(false);
  };

  const handleDisposition = async (disposition: Disposition) => {
    if (!currentLead) return;
    setIsDisposing(true);
    try {
      await leadsApi.updateDisposition(currentLead.id, disposition);
      toast.success(`Marked as ${disposition.replace('_', ' ')}`);
      setShowDisposition(false);
      // Move to next lead
      if (currentIndex + 1 < leads.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        toast.info('All leads dialed! Campaign complete.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save disposition';
      toast.error(message);
    } finally {
      setIsDisposing(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex + 1 < leads.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.info('No more leads to skip to.');
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── No campaign selected ───────────────────────────
  if (!campaignId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
        <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-400 mb-2">No campaign selected</h2>
        <p className="text-zinc-500 mb-6 max-w-sm">
          Open a campaign first, then click &quot;Start Dialing&quot; to begin.
        </p>
        <button onClick={() => navigate('/campaigns')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition-colors">
          Go to Campaigns
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
        <Phone className="h-12 w-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-400 mb-2">All leads dialed!</h2>
        <p className="text-zinc-500 mb-6 max-w-sm">There are no more untouched leads in this campaign.</p>
        <button onClick={() => navigate('/campaigns')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition-colors">
          Back to Campaigns
        </button>
      </div>
    );
  }

  const allDone = currentIndex >= leads.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/campaigns')} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {campaign?.name || 'Dialer'}
          </h1>
          <p className="text-sm text-zinc-500">
            Lead {Math.min(currentIndex + 1, leads.length)} of {leads.length} •{' '}
            <span className="text-emerald-400">{leads.length - Math.min(currentIndex + 1, leads.length)} remaining</span>
          </p>
        </div>

        {/* Helper Top-Right Navigation */}
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-[#1A1A1E]">
            {telnyx.connectionStatus === 'registered' ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-400">Connected</span>
              </>
            ) : telnyx.connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span className="text-xs font-medium text-amber-400">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-red-400">Disconnected</span>
              </>
            )}
          </div>

          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg border transition-colors ${showSettings ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#1A1A1E] border-white/5 text-zinc-400 hover:text-white'}`} title="Audio Settings">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {/* Progress ring */}
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${((currentIndex) / leads.length) * 100}, 100`} strokeLinecap="round" className="transition-all duration-500" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400">
            {Math.round((currentIndex / leads.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#1A1A1E] border border-emerald-500/20 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 mx-auto lg:mx-0 max-w-lg">
          <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Audio Input Device</label>
          <div className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-emerald-500 shrink-0" />
            <select
              value={selectedAudioInputId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="bg-black/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 w-full focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              {audioInDevices.length === 0 ? <option value="">Loading microphones...</option> : null}
              {audioInDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {allDone ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <Phone className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Campaign Complete!</h2>
          <p className="text-zinc-400 mb-8">All leads have been dialed and dispositioned.</p>
          <button onClick={() => navigate('/campaigns')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl font-semibold transition-colors">
            Back to Campaigns
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============ LEFT: Card Stack ============ */}
          <div className="lg:col-span-2 flex flex-col items-center">
            <div className="relative w-full max-w-lg mx-auto" style={{ minHeight: 480 }}>
              {/* Third card (background) */}
              {thirdLead && (
                <div className="absolute inset-x-0 top-4 mx-auto w-[90%] h-[400px] bg-[#1A1A1E] border border-white/5 rounded-2xl opacity-30 scale-[0.92] transition-all duration-300" />
              )}
              {/* Second card */}
              {nextLead && (
                <div className="absolute inset-x-0 top-2 mx-auto w-[95%] h-[410px] bg-[#1A1A1E] border border-white/5 rounded-2xl opacity-50 scale-[0.96] transition-all duration-300" />
              )}
              {/* Current card */}
              {currentLead && (
                <div key={currentLead.id} className="relative w-full bg-[#1A1A1E] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-300">
                  {/* Avatar */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <User className="h-8 w-8 text-emerald-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                          {[currentLead.first_name, currentLead.last_name].filter(Boolean).join(' ') || 'Unknown Contact'}
                        </h2>
                        {currentLead.company && (
                          <div className="flex items-center gap-1.5 mt-1 text-zinc-400">
                            <Building className="h-3.5 w-3.5" />
                            <span className="text-sm">{currentLead.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {currentLead.google_rating && (
                      <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 shrink-0">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-semibold text-amber-400">{currentLead.google_rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1.5">
                        <Phone className="h-3.5 w-3.5" /> PHONE
                      </div>
                      <p className="text-lg font-semibold text-emerald-400 tabular-nums">{currentLead.phone}</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1.5">
                        <MapPin className="h-3.5 w-3.5" /> LOCATION
                      </div>
                      <p className="text-sm font-medium text-zinc-300">
                        {[currentLead.city, currentLead.state].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                    {currentLead.email && (
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1.5">
                          <Mail className="h-3.5 w-3.5" /> EMAIL
                        </div>
                        <p className="text-sm font-medium text-zinc-300 truncate">{currentLead.email}</p>
                      </div>
                    )}
                    {currentLead.website && (
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1.5">
                          <Globe className="h-3.5 w-3.5" /> WEBSITE
                        </div>
                        <a href={currentLead.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-400 truncate hover:underline">
                          {currentLead.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    {currentLead.business_category && (
                      <div className="bg-black/20 rounded-xl p-4 border border-white/5 col-span-2">
                        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1.5">
                          <Building className="h-3.5 w-3.5" /> CATEGORY
                        </div>
                        <p className="text-sm font-medium text-zinc-300">{currentLead.business_category}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Call controls ── */}
                  <div className="flex items-center gap-4">
                    {!isInCall && !showDisposition && (
                      <>
                        <button
                          onClick={handleDial}
                          disabled={telnyx.connectionStatus !== 'registered'}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-lg transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]"
                        >
                          <Phone className="h-5 w-5" /> Dial
                        </button>
                        <button onClick={handleSkip} className="p-4 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Skip">
                          <SkipForward className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {isInCall && (
                      <div className="flex-1 flex flex-col gap-4">
                        <div className="flex-1 flex items-center gap-4">
                          {/* Call status / timer */}
                          <div className="flex-1 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                                {telnyx.callState === 'trying' ? 'Dialing...' : telnyx.callState === 'ringing' ? 'Ringing...' : telnyx.isHeld ? 'Call Hold' : 'In Call'}
                              </span>
                            </div>
                            <span className="text-3xl font-bold tabular-nums text-white">
                              {formatDuration(telnyx.callDuration)}
                            </span>
                            {telnyx.callState === 'active' && !telnyx.isHeld && telnyx.activeCall?.remoteStream && (
                              <div className="mt-2 text-center opacity-80 h-8 flex justify-center overflow-hidden">
                                <AudioVisualizer mediaStream={telnyx.activeCall.remoteStream} color="#10b981" />
                                <AudioPlayer mediaStream={telnyx.activeCall.remoteStream} />
                              </div>
                            )}
                          </div>

                          {/* In-call controls */}
                          <div className="flex items-center gap-2">
                            {/* Mute */}
                            <button
                              onClick={() => telnyx.toggleMute()}
                              className={`p-3 rounded-xl transition-all ${telnyx.isMuted ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'}`}
                              title={telnyx.isMuted ? 'Unmute' : 'Mute'}
                            >
                              {telnyx.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </button>

                            {/* Hold */}
                            {telnyx.callState !== 'done' && telnyx.callState !== 'idle' && (
                              <button
                                onClick={() => telnyx.toggleHold()}
                                className={`p-3 rounded-xl transition-all ${telnyx.isHeld ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'}`}
                                title={telnyx.isHeld ? 'Resume' : 'Hold'}
                              >
                                {telnyx.isHeld ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                              </button>
                            )}

                            {/* DTMF */}
                            <button
                              onClick={() => setShowDTMF(!showDTMF)}
                              className={`p-3 rounded-xl transition-all ${showDTMF ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'}`}
                              title="Keypad"
                            >
                              <Hash className="h-5 w-5" />
                            </button>

                            {/* Hang up */}
                            <button
                              onClick={handleHangUp}
                              className="bg-red-500 hover:bg-red-400 text-white p-3 rounded-full transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]"
                            >
                              <PhoneOff className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Quality Metrics Rendering */}
                        {telnyx.qualityMetrics && telnyx.callState === 'active' && (
                          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                            <div className="bg-black/20 rounded-lg py-2 px-1 text-center">
                              <Activity className="h-3 w-3 text-emerald-500 mx-auto mb-1 opacity-70" />
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Jitter</div>
                              <div className="text-xs font-mono text-white/90">{formatMS(telnyx.qualityMetrics.jitter)}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg py-2 px-1 text-center">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5 mt-4">RTT (Ping)</div>
                              <div className="text-xs font-mono text-white/90">{formatMS(telnyx.qualityMetrics.rtt)}</div>
                            </div>
                            <div className="bg-black/20 rounded-lg py-2 px-1 text-center flex flex-col justify-end">
                              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">MOS Quality</div>
                              <div className={`text-xs font-mono ${telnyx.qualityMetrics.mos > 4 ? 'text-emerald-400' : telnyx.qualityMetrics.mos > 3 ? 'text-amber-400' : 'text-red-400'}`}>
                                {telnyx.qualityMetrics.mos.toFixed(2)} / 5.00
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DTMF Keypad (in-call) */}
                  {showDTMF && isInCall && (
                    <div className="mt-4 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      {DTMF_KEYS.map((key) => (
                        <button
                          key={key}
                          onClick={() => telnyx.sendDTMF(key)}
                          className="py-3 rounded-xl bg-black/30 border border-white/5 text-white font-bold text-lg hover:bg-white/10 transition-colors active:scale-95"
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Keyboard hint */}
                  {!isInCall && !showDisposition && (
                    <p className="text-center text-xs text-zinc-600 mt-4">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 font-mono text-[10px]">Space</kbd> to dial
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ============ RIGHT SIDEBAR ============ */}
          <div className="lg:col-span-1 space-y-4">
            {/* Disposition Panel */}
            {showDisposition ? (
              <div className="bg-[#1A1A1E] border border-white/10 rounded-2xl p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-white mb-1">Call Outcome</h3>
                <p className="text-sm text-zinc-500 mb-2">
                  Duration: <span className="text-white font-mono">{formatDuration(telnyx.callDuration)}</span>
                </p>
                <p className="text-sm text-zinc-500 mb-6">How did the call go?</p>
                <div className="space-y-3">
                  {DISPOSITIONS.map((d) => (
                    <button
                      key={d.value}
                      disabled={isDisposing}
                      onClick={() => handleDisposition(d.value)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                    >
                      <span className="text-lg">{d.emoji}</span>
                      <span className="text-white font-medium">{d.label}</span>
                      {isDisposing && <Loader2 className="h-4 w-4 animate-spin text-zinc-500 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#1A1A1E] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Queue Preview</h3>
                {leads.slice(currentIndex + 1, currentIndex + 6).length > 0 ? (
                  <div className="space-y-3">
                    {leads.slice(currentIndex + 1, currentIndex + 6).map((lead, i) => (
                      <div
                        key={lead.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
                        style={{ opacity: 1 - (i * 0.15) }}
                      >
                        <div className="h-9 w-9 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                          {(lead.first_name?.[0] || lead.company?.[0] || '#').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-300 truncate">
                            {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'Unknown'}
                          </p>
                          <p className="text-xs text-zinc-500">{lead.phone}</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-700 rotate-[-90deg] shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No more leads in queue</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden audio element for remote stream playback */}
      {telnyx.activeCall?.remoteStream && (
        <audio
          autoPlay
          ref={(el) => {
            if (el && telnyx.activeCall?.remoteStream) {
              el.srcObject = telnyx.activeCall.remoteStream;
            }
          }}
        />
      )}
    </div>
  );
}
