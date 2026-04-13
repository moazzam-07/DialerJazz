import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { callsApi, leadsApi, campaignsApi } from '@/lib/api';
import type { Lead, Campaign } from '@/lib/api';
import { useVoice } from '@/contexts/VoiceContext';
import type { CallState } from '@/contexts/TelnyxContext';
import CallControls from '@/components/CallControls';
import InCallHUD from '@/components/InCallHUD';
import DispositionOverlay from '@/components/DispositionOverlay';

type DialerMode = 'power' | 'click';
type Disposition = 'answered' | 'follow_up' | 'not_interested' | 'no_answer' | 'voicemail' | 'busy' | 'dnc';

const DISPOSITIONS: { value: Disposition; label: string; color: string; emoji: string; primary?: boolean }[] = [
  { value: 'answered',       label: 'Interested',     color: 'bg-foreground text-background', emoji: '🔥', primary: true },
  { value: 'follow_up',      label: 'Follow-up',      color: 'bg-foreground text-background', emoji: '🤝', primary: true },
  { value: 'not_interested',label: 'Not Interested', color: 'bg-muted text-foreground',   emoji: '❄️', primary: true },
  { value: 'no_answer',      label: 'No Answer',      color: 'bg-muted text-foreground', emoji: '📵' },
  { value: 'voicemail',      label: 'Voicemail',       color: 'bg-muted text-foreground',emoji: '📩' },
  { value: 'busy',           label: 'Wrong Number',    color: 'bg-muted text-foreground',emoji: '❌' },
  { value: 'dnc',            label: 'Do Not Call',     color: 'bg-muted text-foreground',   emoji: '🚫' },
];



export default function CampaignDialerPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [calledLeadsCount, setCalledLeadsCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New State Flow — restore mode from localStorage so returning to the campaign skips mode selection
  const [dialerSessionMode, setDialerSessionMode] = useState<DialerMode | null>(
    () => {
      const saved = localStorage.getItem(`dialer_mode_${campaignId}`);
      return (saved === 'power' || saved === 'click') ? saved : null;
    }
  );
  const [showDisposition, setShowDisposition] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);
  const [showDTMF, setShowDTMF] = useState(false);
  const [notes, setNotes] = useState('');
  // Voice (from unified context — delegates to Telnyx or Twilio)
  const voice = useVoice();
  const prevCallState = useRef<CallState>('idle');

  // Load backend data
  const loadData = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [campaignRes, leadsRes] = await Promise.all([
        campaignsApi.get(campaignId),
        leadsApi.listByCampaign(campaignId, { limit: 500 }),
      ]);
      setCampaign(campaignRes.data as Campaign);

      const allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : [];
      // Load ALL leads (including already-dialed) so user can navigate freely
      setLeads(allLeads);
      
      // Track total and called counts for display
      const dialedCount = allLeads.filter(l => l.status !== 'new' && l.status !== 'calling').length;
      setTotalLeadsCount(allLeads.length);
      setCalledLeadsCount(dialedCount);

      // Restore position by lead ID (survives array size changes)
      const savedLeadId = localStorage.getItem(`dialer_lead_${campaignId}`);
      if (savedLeadId) {
        const idx = allLeads.findIndex(l => l.id === savedLeadId);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        setCurrentIndex(0);
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
  }, [loadData]);

  // Track this route for the ActiveCallBubble (so it knows where to return).
  // Deliberately NOT clearing on unmount — the route must persist after
  // navigation so the bubble can show it. It gets cleared when the call ends.
  const isOnCall = ['trying', 'ringing', 'active'].includes(voice.primaryCallState);
  useEffect(() => {
    if (campaignId && !isOnCall) {
      voice.setActiveCallRoute(`/campaigns/${campaignId}/dial`);
    }
  }, [campaignId]);

  // Auto-connect to campaign's provider when campaign loads
  useEffect(() => {
    if (campaign?.provider && voice.activeProvider !== campaign.provider) {
      voice.connectProvider(campaign.provider);
    }
  }, [campaign?.provider]);

  // Handle call lifecycle — show disposition after ANY call attempt ends
  useEffect(() => {
    const wasCallAttempt = ['trying', 'ringing', 'active'].includes(prevCallState.current);
    if (wasCallAttempt && voice.primaryCallState === 'done') {
      // Call ended (whether connected or not) -> Show disposition overlay
      setShowDisposition(true);
      setShowDTMF(false);
    }
    prevCallState.current = voice.primaryCallState;
  }, [voice.primaryCallState]);

  useEffect(() => {
    if (voice.sipError) toast.error(voice.sipError, { duration: 5000 });
  }, [voice.sipError]);

  const currentLead = leads[currentIndex];
  // Maintain context
  useEffect(() => {
    if (currentLead) setNotes(currentLead.notes || '');
  }, [currentLead]);

  const handleDial = () => {
    if (!currentLead) return;
    if (!voice.sipConfigured) return toast.error('Configure a telephony provider in Connectors first.');
    if (voice.connectionStatus !== 'registered') return toast.error('Connecting...');
    voice.dial(currentLead.phone);
  };

  const handleHangUp = () => {
    voice.hangup();
  };

  const handleDisposition = async (dispositionLabel: string) => {
    if (!currentLead) return;
    setIsDisposing(true);

    try {
      const dispValue = DISPOSITIONS.find(d => d.label === dispositionLabel)?.value || 'answered';
      
      // Get call duration - ensure it's a valid number
      const callDuration = typeof voice.primaryCallDuration === 'number' ? voice.primaryCallDuration : 0;
      console.log('[CampaignDialer] Saving call - duration:', callDuration, 'disposition:', dispValue);
      
      // Log the full call event, duration, and disposition to our new calls API
      await callsApi.log({
        lead_id: currentLead.id,
        campaign_id: campaign?.id || '',
        duration_seconds: callDuration,
        status: 'completed',
        disposition: dispValue,
        notes: notes,
        provider: campaign?.provider || 'telnyx',
      });
      
      // Update lead status so it won't appear on refresh
      await leadsApi.updateDisposition(currentLead.id, dispValue);
      
      toast.success(`Marked as ${dispositionLabel}`);
      setShowDisposition(false);

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
      setCurrentIndex(newIndex);
      // Save the lead ID we're navigating TO (survives array changes on refresh)
      if (campaignId && leads[newIndex]) {
        localStorage.setItem(`dialer_lead_${campaignId}`, leads[newIndex].id);
      }
    }
    else toast.info('All leads dialed!');
  }

  const navigatePrev = () => {
    if (currentIndex - 1 >= 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (campaignId && leads[newIndex]) {
        localStorage.setItem(`dialer_lead_${campaignId}`, leads[newIndex].id);
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
        <AlertCircle className="h-12 w-12 text-muted-foreground text-opacity-50 mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground">No campaign selected</h2>
      </div>
    );
  }
  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-foreground" /></div>;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Dialer</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <button onClick={() => navigate('/login')} className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-xl transition-colors hover:bg-white/20 font-medium">Re-authenticate</button>
      </div>
    );
  }

  if (leads.length === 0) return <div className="text-center py-40"><h2 className="text-2xl font-bold">All leads dialed!</h2></div>;

  // Helper: persist mode to localStorage when selected
  const selectDialerMode = (mode: DialerMode) => {
    setDialerSessionMode(mode);
    if (campaignId) localStorage.setItem(`dialer_mode_${campaignId}`, mode);
  };

  // Helper: check if a lead has already been dialed
  const isLeadDialed = (lead: Lead) => lead.status !== 'new' && lead.status !== 'calling';

  // -- Pre-Dial Selection Screen --
  if (!dialerSessionMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">Choose Dialing Mode</h1>
          <p className="text-xl text-muted-foreground">How do you want to handle these {leads.length} leads?</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <button onClick={() => selectDialerMode('power')} className="group relative bg-surface border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 p-10 rounded-[1.5rem] text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="h-16 w-16 bg-foreground text-background shadow-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-display text-foreground mb-3">Power Dialer</h2>
            <p className="text-muted-foreground tracking-body leading-relaxed">
              Automated high-speed dialing. After selecting a disposition, the system automatically swipes to the next card and dials immediately.
            </p>
          </button>
          
          <button onClick={() => selectDialerMode('click')} className="group relative bg-surface border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 p-10 rounded-[1.5rem] text-left transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="h-16 w-16 bg-foreground text-background shadow-sm rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MousePointerClick className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-display text-foreground mb-3">Click-to-Call</h2>
            <p className="text-muted-foreground tracking-body leading-relaxed">
              Manual control. Manually click to dial, edit notes after hanging up, and physically swipe left to proceed when you are fully ready.
            </p>
          </button>
        </div>
      </motion.div>
    );
  }

  // -- Main Dialer Card Stack UI --
  const isInCall = ['trying', 'ringing', 'active'].includes(voice.primaryCallState);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-black animate-in fade-in duration-700">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/campaigns')} className="p-2 bg-muted rounded-xl hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10 text-foreground transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold tracking-display text-lg text-foreground">{campaign?.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground text-opacity-70 font-medium tracking-widest uppercase">
               {dialerSessionMode === 'power' ? <Zap className="h-3 w-3 text-foreground" /> : <MousePointerClick className="h-3 w-3 text-foreground"/>}
               {dialerSessionMode} Mode • {calledLeadsCount + currentIndex + 1} of {totalLeadsCount} leads
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {voice.connectionStatus === 'registered' ? (
             <span className="px-3 py-1 bg-background text-foreground border border-black/10 dark:border-white/10 rounded-full text-xs font-bold leading-none flex items-center gap-1.5 shadow-sm"><div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse"/> SIP Registered</span>
          ) : (
             <span className="px-3 py-1 bg-muted text-muted-foreground border border-border rounded-full text-xs font-bold leading-none flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/> Connecting</span>
          )}
        </div>
      </header>

      {/* Center - Swiping Deck Container */}
      <main className="flex-1 relative flex items-center justify-center -mt-6">
        
        {/* Background Hint layer */}
        <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none opacity-20">
            <div className="flex flex-col items-center gap-2"><ArrowLeft className="h-10 w-10 text-foreground"/><span className="font-bold uppercase tracking-widest text-muted-foreground">Next</span></div>
            <div className="flex flex-col items-center gap-2"><ArrowLeft className="h-10 w-10 rotate-180 text-foreground"/><span className="font-bold uppercase tracking-widest text-muted-foreground">Previous</span></div>
        </div>

        {/* Card Deck */}
        <div className="relative w-full max-w-sm h-[600px] flex items-center justify-center z-10 perspective-[1000px]">
          
          {/* Card Next (Behind) */}
          {leads[currentIndex + 1] && (
            <motion.div 
              className="absolute w-full h-full bg-surface/50 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl"
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
              className="absolute w-full h-full glass-solid rounded-[2rem] p-6 flex flex-col cursor-grab active:cursor-grabbing transform-gpu"
              style={{ paddingBottom: '90px' }} // Room for dial button mapping
            >
                  <div className="flex flex-col items-center text-center mt-6 mb-8 relative">
                 {/* Dialed checkmark badge */}
                 {isLeadDialed(currentLead) && (
                   <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center shadow-sm z-20">
                     <svg className="h-4 w-4 bg-transparent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                   </div>
                 )}
                 <div className="h-24 w-24 rounded-full bg-muted border border-black/5 dark:border-white/5 shadow-sm flex items-center justify-center mb-4">
                    <User className="h-10 w-10 text-foreground" />
                 </div>
                 <h2 className="text-3xl font-extrabold tracking-display text-foreground">{currentLead.first_name} {currentLead.last_name || ''}</h2>
                 {currentLead.company && <h3 className="text-lg text-muted-foreground font-medium mt-1 tracking-body">{currentLead.company}</h3>}
              </div>

              <div className="space-y-4 mb-6 relative z-10 bg-black/20 rounded-2xl p-4 border border-border">
                 <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground text-opacity-70 shrink-0" />
                    <span className="text-lg font-mono font-semibold text-foreground">{currentLead.phone}</span>
                 </div>
                 {currentLead.email && (
                 <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground text-opacity-70 shrink-0" />
                    <span className="text-sm font-medium text-foreground text-opacity-90 truncate">{currentLead.email}</span>
                 </div>
                 )}
                 {(currentLead.city || currentLead.state) && (
                 <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground text-opacity-70 shrink-0" />
                    <span className="text-sm font-medium text-foreground text-opacity-90 truncate">{currentLead.city}, {currentLead.state}</span>
                 </div>
                 )}
              </div>

              {/* Editable Tags / Notes Layer (Always present, but easier to type when static) */}
              <div className="flex-1 flex flex-col gap-2 relative z-10">
                 <div className="flex items-center gap-2 mb-1 px-1">
                    <Edit3 className="h-3 w-3 text-muted-foreground text-opacity-70" />
                    <span className="text-xs uppercase font-bold text-muted-foreground text-opacity-70 tracking-widest">Scratchpad</span>
                 </div>
                 <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Jot down notes before, during, or after the call..."
                    className="w-full flex-1 bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl resize-none p-3 text-sm text-foreground text-opacity-90 hover:bg-white/[0.04] focus:bg-white/[0.04] focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 focus:outline-none transition-colors"
                 />
              </div>

              {/* Call Controls (Dial / Hang Up / DTMF Toggle) */}
              <CallControls
                callState={voice.primaryCallState}
                dialerMode={dialerSessionMode!}
                onDial={handleDial}
                onHangUp={handleHangUp}
                onToggleDTMF={() => setShowDTMF(!showDTMF)}
              />

              {/* In-Call HUD (Timer + Visualizer + DTMF) */}
              <InCallHUD
                callState={voice.primaryCallState}
                callDuration={voice.primaryCallDuration}
                remoteStream={voice.primaryCall?.remoteStream || null}
                showDTMF={showDTMF}
                onSendDTMF={voice.sendDTMF}
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
              <h2 className="text-2xl font-bold text-muted-foreground text-opacity-50">No leads available</h2>
            </div>
          )}

        </div>
      </main>

      {/* Hidden audio element for remote stream playback */}
      {voice.primaryCall?.remoteStream && (
        <audio autoPlay ref={(el) => { if (el && voice.primaryCall?.remoteStream) { el.srcObject = voice.primaryCall.remoteStream; } }} />
      )}
    </div>
  );
}
