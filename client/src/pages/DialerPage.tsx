import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  Phone,
  Loader2,
  AlertCircle,
  ArrowLeft,
  User,
  MapPin,
  Mail,
  Zap,
  MousePointerClick,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';
import { callsApi, leadsApi, campaignsApi, settingsApi, telnyxApi } from '@/lib/api';
import type { Lead, Campaign } from '@/lib/api';
import { useTelnyxCall } from '@/hooks/useTelnyxCall';
import type { CallState } from '@/hooks/useTelnyxCall';
import CallControls from '@/components/CallControls';
import InCallHUD from '@/components/InCallHUD';
import DispositionOverlay from '@/components/DispositionOverlay';

type DialerMode = 'power' | 'click';
type Disposition = 'answered' | 'follow_up' | 'not_interested' | 'no_answer' | 'voicemail' | 'busy' | 'dnc';

const DISPOSITIONS: { value: Disposition; label: string; color: string; emoji: string; primary?: boolean }[] = [
  { value: 'answered',       label: 'Interested',     color: 'bg-emerald-500', emoji: '🔥', primary: true },
  { value: 'follow_up',      label: 'Follow-up',      color: 'bg-indigo-500', emoji: '🤝', primary: true },
  { value: 'not_interested',label: 'Not Interested', color: 'bg-zinc-500',   emoji: '❄️', primary: true },
  { value: 'no_answer',      label: 'No Answer',      color: 'bg-amber-500', emoji: '📵' },
  { value: 'voicemail',      label: 'Voicemail',       color: 'bg-purple-500',emoji: '📩' },
  { value: 'busy',           label: 'Wrong Number',    color: 'bg-orange-500',emoji: '❌' },
  { value: 'dnc',            label: 'Do Not Call',     color: 'bg-red-500',   emoji: '🚫' },
];



export default function DialerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaignId = searchParams.get('campaign');

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [calledLeadsCount, setCalledLeadsCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New State Flow
  const [dialerSessionMode, setDialerSessionMode] = useState<DialerMode | null>(null);
  const [showDisposition, setShowDisposition] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);
  const [showDTMF, setShowDTMF] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [sipConfigured, setSipConfigured] = useState(false);

  // Telnyx
  const telnyx = useTelnyxCall();
  const prevCallState = useRef<CallState>('idle');

  // Load backend data
  const loadData = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [campaignRes, leadsRes, settingsRes] = await Promise.all([
        campaignsApi.get(campaignId),
        leadsApi.listByCampaign(campaignId, { limit: 500 }),
        settingsApi.get(),
      ]);
      setCampaign(campaignRes.data as Campaign);

      const allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
      // Filter to only undialed leads (status: new or calling)
      const undialedLeads = allLeads.filter(l => l.status === 'new' || l.status === 'calling');
      setLeads(undialedLeads);
      
      // Track total and called counts for display
      setTotalLeadsCount(allLeads.length);
      setCalledLeadsCount(allLeads.length - undialedLeads.length);

      // Restore saved progress from localStorage
      const savedIndex = localStorage.getItem(`dialer_progress_${campaignId}`);
      if (savedIndex) {
        const idx = parseInt(savedIndex, 10);
        if (!isNaN(idx) && idx < undialedLeads.length) {
          setCurrentIndex(idx);
        }
      }

      const settings = settingsRes.data;
      if (!settings?.telnyx_sip_login && !settings?.telnyx_api_key) return;

      setSipConfigured(true);

      // Strategy: Try JWT token first (secure), fall back to raw SIP creds
      try {
        const tokenRes = await telnyxApi.getToken();
        if (tokenRes.data?.token) {
          telnyx.connectWithToken(tokenRes.data.token, settings.telnyx_caller_number);
          return;
        }
      } catch {
        // Token endpoint failed — fall back to raw SIP credentials
        console.warn('[DialerPage] JWT token fetch failed, falling back to SIP credentials');
      }

      // Fallback: raw SIP login/password
      if (settings?.telnyx_sip_login && settings?.telnyx_sip_password) {
        telnyx.connect(
          settings.telnyx_sip_login,
          settings.telnyx_sip_password,
          settings.telnyx_caller_number
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load campaign';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadData();
    return () => telnyx.disconnect();
  }, [loadData]);

  // Handle call lifecycle exactly as requested
  useEffect(() => {
    if (prevCallState.current === 'active' && telnyx.callState === 'done') {
      // Call dropped -> Show Bottom Sheet overlay
      setShowDisposition(true);
      setShowDTMF(false);
    }
    prevCallState.current = telnyx.callState;
  }, [telnyx.callState]);

  useEffect(() => {
    if (telnyx.sipError) toast.error(telnyx.sipError, { duration: 5000 });
  }, [telnyx.sipError]);

  const currentLead = leads[currentIndex];
  // Maintain context
  useEffect(() => {
    if (currentLead) setNotes(currentLead.notes || '');
  }, [currentLead]);

  const handleDial = () => {
    if (!currentLead) return;
    if (!sipConfigured) return toast.error('Configure Telnyx SIP in Connectors first.');
    if (telnyx.connectionStatus !== 'registered') return toast.error('Connecting...');
    telnyx.dial(currentLead.phone);
  };

  const handleHangUp = () => {
    telnyx.hangup();
  };

  const handleDisposition = async (dispositionLabel: string) => {
    if (!currentLead) return;
    setIsDisposing(true);

    try {
      const dispValue = DISPOSITIONS.find(d => d.label === dispositionLabel)?.value || 'answered';
      
      // Get call duration - ensure it's a valid number
      const callDuration = typeof telnyx.callDuration === 'number' ? telnyx.callDuration : 0;
      console.log('[DialerPage] Saving call - duration:', callDuration, 'disposition:', dispValue);
      
      // Log the full call event, duration, and disposition to our new calls API
      await callsApi.log({
        lead_id: currentLead.id,
        campaign_id: campaign?.id || '',
        duration_seconds: callDuration,
        status: 'completed',
        disposition: dispValue,
        notes: notes 
      });
      
      // Update lead status so it won't appear on refresh
      await leadsApi.updateDisposition(currentLead.id, dispValue);
      
      toast.success(`Marked as ${dispositionLabel}`);
      setShowDisposition(false);

      // Save progress to localStorage after disposition
      if (campaignId) {
        localStorage.setItem(`dialer_progress_${campaignId}`, String(currentIndex));
      }

      if (dialerSessionMode === 'power') {
        // Auto-swipe in 1.5 seconds if power dialer
        setTimeout(() => {
           triggerSwipeLeft();
        }, 1500);
      }
      // If click-to-call, we do nothing and wait for manual swipe!

    } catch (err: unknown) {
      toast.error('Failed to save disposition');
    } finally {
      setIsDisposing(false);
    }
  };

  const markMeetingBooked = async () => {
    if (!currentLead) return;
    try {
      await leadsApi.updateDisposition(currentLead.id, 'answered');
      toast.success('🎉 Meeting Booked & Saved!');
      triggerSwipeLeft();
    } catch(e) {
      toast.error('Failed to book meeting');
    }
  }

  const navigateNext = () => {
    if (currentIndex + 1 < leads.length) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(p => p + 1);
      // Save progress to localStorage
      if (campaignId) {
        localStorage.setItem(`dialer_progress_${campaignId}`, String(newIndex));
      }
    }
    else toast.info('All leads dialed!');
  }

  const navigatePrev = () => {
    if (currentIndex - 1 >= 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(p => p - 1);
      // Save progress to localStorage
      if (campaignId) {
        localStorage.setItem(`dialer_progress_${campaignId}`, String(newIndex));
      }
    }
  }

  // --- Framer Motion Swipe Physics ---
  const controls = useAnimation();
  const handleDragEnd = async (_event: any, info: PanInfo) => {
    const swipeThreshold = 100; // px
    
    // Swipe Up: Book Meeting
    if (info.offset.y < -swipeThreshold && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      await controls.start({ y: -1000, opacity: 0, transition: { duration: 0.3 } });
      markMeetingBooked();
      controls.set({ x: 0, y: 0, opacity: 1 });
    }
    // Swipe Left: Next Lead (Navigate forward)
    else if (info.offset.x < -swipeThreshold) {
      await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.3 } });
      navigateNext();
      controls.set({ x: 0, y: 0, opacity: 1 });
    }
    // Swipe Right: Previous Lead (Navigate backwards)
    else if (info.offset.x > swipeThreshold) {
      await controls.start({ x: 1000, opacity: 0, transition: { duration: 0.3 } });
      navigatePrev();
      controls.set({ x: 0, y: 0, opacity: 1 });
    } 
    // Snap back
    else {
      controls.start({ x: 0, y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4 } });
    }
  };

  const triggerSwipeLeft = async () => {
    await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.3 } });
    navigateNext();
    controls.set({ x: 0, y: 0, opacity: 1 });
  }

  // Early returns
  if (!campaignId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-400">No campaign selected</h2>
      </div>
    );
  }
  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error Loading Dialer</h2>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button onClick={() => navigate('/login')} className="bg-white/10 text-white px-6 py-2 rounded-xl transition-colors hover:bg-white/20 font-medium">Re-authenticate</button>
      </div>
    );
  }

  if (leads.length === 0) return <div className="text-center py-40"><h2 className="text-2xl font-bold">All leads dialed!</h2></div>;

  // -- Pre-Dial Selection Screen --
  if (!dialerSessionMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">Choose Dialing Mode</h1>
          <p className="text-xl text-zinc-400">How do you want to handle these {leads.length} leads?</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => setDialerSessionMode('power')} className="group relative bg-[#1A1A1E] border border-white/10 hover:border-emerald-500/50 p-10 rounded-3xl text-left transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Power Dialer</h2>
            <p className="text-zinc-400 leading-relaxed">
              Automated high-speed dialing. After selecting a disposition, the system automatically swipes to the next card and dials immediately.
            </p>
          </button>
          
          <button onClick={() => setDialerSessionMode('click')} className="group relative bg-[#1A1A1E] border border-white/10 hover:border-blue-500/50 p-10 rounded-3xl text-left transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.1)]">
            <div className="h-16 w-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MousePointerClick className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Click-to-Call</h2>
            <p className="text-zinc-400 leading-relaxed">
              Manual control. Manually click to dial, edit notes after hanging up, and physically swipe left to proceed when you are fully ready.
            </p>
          </button>
        </div>
      </motion.div>
    );
  }

  // -- Main Dialer Card Stack UI --
  const isInCall = ['trying', 'ringing', 'active'].includes(telnyx.callState);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-black animate-in fade-in duration-700">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/campaigns')} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-white">{campaign?.name}</h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium tracking-wider uppercase">
               {dialerSessionMode === 'power' ? <Zap className="h-3 w-3 text-emerald-500" /> : <MousePointerClick className="h-3 w-3 text-blue-500"/>}
               {dialerSessionMode} Mode • {calledLeadsCount + currentIndex + 1} of {totalLeadsCount} leads
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {telnyx.connectionStatus === 'registered' ? (
             <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold leading-none flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/> SIP Registered</span>
          ) : (
             <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold leading-none flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/> Connecting</span>
          )}
        </div>
      </header>

      {/* Center - Swiping Deck Container */}
      <main className="flex-1 relative flex items-center justify-center -mt-6">
        
        {/* Background Hint layer */}
        <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none opacity-20">
            <div className="flex flex-col items-center gap-2"><ArrowLeft className="h-10 w-10 text-white"/><span className="font-bold uppercase tracking-widest text-zinc-400">Next</span></div>
            <div className="flex flex-col items-center gap-2"><ArrowLeft className="h-10 w-10 rotate-180 text-white"/><span className="font-bold uppercase tracking-widest text-zinc-400">Previous</span></div>
        </div>

        {/* Card Deck */}
        <div className="relative w-full max-w-sm h-[600px] flex items-center justify-center z-10 perspective-[1000px]">
          
          {/* Card Next (Behind) */}
          {leads[currentIndex + 1] && (
            <motion.div 
              className="absolute w-full h-full bg-[#161618] border border-white/5 shadow-2xl rounded-3xl"
              initial={{ scale: 0.95, y: 20, z: -50 }}
              animate={{ scale: 0.95, y: 20, z: -50 }}
            />
          )}

          {/* Current Card (Interactive) */}
          {currentLead ? (
            <motion.div 
              key={currentLead.id}
              drag={!isInCall && !showDisposition}
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              animate={controls}
              className="absolute w-full h-full bg-[#1A1A1E] border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 flex flex-col cursor-grab active:cursor-grabbing transform-gpu"
              style={{ paddingBottom: '90px' }} // Room for dial button mapping
            >
              {/* Card Contents */}
              <div className="flex flex-col items-center text-center mt-6 mb-8">
                 <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/30 flex items-center justify-center mb-4">
                    <User className="h-10 w-10 text-emerald-500" />
                 </div>
                 <h2 className="text-3xl font-extrabold tracking-tight text-white">{currentLead.first_name} {currentLead.last_name || ''}</h2>
                 {currentLead.company && <h3 className="text-lg text-emerald-400 font-medium mt-1">{currentLead.company}</h3>}
              </div>

              <div className="space-y-4 mb-6 relative z-10 bg-black/20 rounded-2xl p-4 border border-white/5">
                 <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-lg font-mono font-semibold text-zinc-200">{currentLead.phone}</span>
                 </div>
                 {currentLead.email && (
                 <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-sm font-medium text-zinc-300 truncate">{currentLead.email}</span>
                 </div>
                 )}
                 {(currentLead.city || currentLead.state) && (
                 <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span className="text-sm font-medium text-zinc-300 truncate">{currentLead.city}, {currentLead.state}</span>
                 </div>
                 )}
              </div>

              {/* Editable Tags / Notes Layer (Always present, but easier to type when static) */}
              <div className="flex-1 flex flex-col gap-2 relative z-10">
                 <div className="flex items-center gap-2 mb-1 px-1">
                    <Edit3 className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Scratchpad</span>
                 </div>
                 <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down notes before, during, or after the call..."
                    className="w-full flex-1 bg-white/[0.02] border border-white/5 rounded-xl resize-none p-3 text-sm text-zinc-300 hover:bg-white/[0.04] focus:bg-white/[0.04] focus:border-emerald-500/30 focus:outline-none transition-colors"
                 />
              </div>

              {/* Call Controls (Dial / Hang Up / DTMF Toggle) */}
              <CallControls
                callState={telnyx.callState}
                dialerMode={dialerSessionMode!}
                onDial={handleDial}
                onHangUp={handleHangUp}
                onToggleDTMF={() => setShowDTMF(!showDTMF)}
              />

              {/* In-Call HUD (Timer + Visualizer + DTMF) */}
              <InCallHUD
                callState={telnyx.callState}
                callDuration={telnyx.callDuration}
                remoteStream={telnyx.activeCall?.remoteStream || null}
                showDTMF={showDTMF}
                onSendDTMF={telnyx.sendDTMF}
              />

              {/* Post-Call Disposition Bottom Sheet */}
              <DispositionOverlay
                visible={showDisposition}
                dispositions={DISPOSITIONS}
                isDisposing={isDisposing}
                onSelect={handleDisposition}
              />
            </motion.div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-600">No leads available</h2>
            </div>
          )}

        </div>
      </main>

      {/* Hidden audio element for remote stream playback */}
      {telnyx.activeCall?.remoteStream && (
        <audio autoPlay ref={(el) => { if (el && telnyx.activeCall?.remoteStream) { el.srcObject = telnyx.activeCall.remoteStream; } }} />
      )}
    </div>
  );
}
