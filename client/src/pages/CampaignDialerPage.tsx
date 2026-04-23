import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import {
  Phone,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Star,
  User,
  MapPin,
  Mail,
  Edit3,
  Link,
  Globe,
  Navigation,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { callsApi, leadsApi, campaignsApi } from '@/lib/api';
import type { Lead, Campaign } from '@/lib/api';
import { useVoice } from '@/contexts/VoiceContext';
import type { CallState } from '@/contexts/TelnyxContext';
import { useLocalCalling } from '@/hooks/useLocalCalling';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dialerSessionMode = (campaign?.dialer_mode as DialerMode) || 'click';
  const [isLocalCallActive, setIsLocalCallActive] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);
  const [showDTMF, setShowDTMF] = useState(false);
  const [notes, setNotes] = useState('');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  // Voice (from unified context — delegates to Telnyx or Twilio)
  const voice = useVoice();
  const prevCallState = useRef<CallState>('idle');

  // Local SIM calling — just opens tel URI. User must tap "End Call" manually per new spec.
  const { call: localCall } = useLocalCalling(() => {}); // Empty callback, we trigger on button click now

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
      setLeads(allLeads);
      
      setTotalLeadsCount(allLeads.length);

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

  const isOnCall = ['trying', 'ringing', 'active'].includes(voice.primaryCallState) || isLocalCallActive;
  useEffect(() => {
    if (campaignId && !isOnCall) {
      voice.setActiveCallRoute(`/campaigns/${campaignId}/dial`);
    }
  }, [campaignId, isOnCall, voice]);

  useEffect(() => {
    if (campaign?.provider && campaign.provider !== 'local' && voice.activeProvider !== campaign.provider) {
      voice.connectProvider(campaign.provider);
    }
  }, [campaign?.provider, voice]);

  useEffect(() => {
    const wasCallAttempt = ['trying', 'ringing', 'active'].includes(prevCallState.current);
    if (wasCallAttempt && voice.primaryCallState === 'done') {
      setShowDisposition(true);
      setShowDTMF(false);
    }
    prevCallState.current = voice.primaryCallState;
  }, [voice.primaryCallState]);

  useEffect(() => {
    if (voice.sipError) toast.error(voice.sipError, { duration: 5000 });
  }, [voice.sipError]);

  const currentLead = leads[currentIndex];
  
  useEffect(() => {
    if (currentLead) {
      setNotes(currentLead.notes || '');
    }
    setIsDetailsExpanded(false);
    setIsLocalCallActive(false);
  }, [currentLead]);

  const handleDial = () => {
    if (!currentLead) return;

    if (campaign?.provider === 'local') {
      // Delay state change so the DOM isn't destroyed before the tel: URI processes on mobile
      localCall(currentLead.phone);
      setTimeout(() => {
        setIsLocalCallActive(true);
      }, 300);
      return;
    }

    if (!voice.sipConfigured) return toast.error('Configure a telephony provider in Connectors first.');
    if (voice.connectionStatus !== 'registered') return toast.error('Connecting...');
    voice.dial(currentLead.phone);
  };

  const handleHangUp = () => {
    if (campaign?.provider === 'local') {
      setIsLocalCallActive(false);
      setShowDisposition(true);
    } else {
      voice.hangup();
    }
  };

  const handleDisposition = async (dispositionLabel: string) => {
    if (!currentLead) return;
    setIsDisposing(true);

    try {
      const dispValue = DISPOSITIONS.find(d => d.label === dispositionLabel)?.value || 'answered';
      const callDuration = typeof voice.primaryCallDuration === 'number' ? voice.primaryCallDuration : 0;
      
      await callsApi.log({
        lead_id: currentLead.id,
        campaign_id: campaign?.id || '',
        duration_seconds: callDuration,
        status: 'completed',
        disposition: dispValue,
        notes: notes,
        provider: campaign?.provider || 'telnyx',
      });
      
      await leadsApi.updateDisposition(currentLead.id, dispValue);
      toast.success(`Marked as ${dispositionLabel}`);
      setShowDisposition(false);

      if (dialerSessionMode === 'power') {
        setTimeout(() => triggerSwipeLeft(), 1500);
      }
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
    if (isOnCall) return; // Disable navigation during call
    if (currentIndex + 1 < leads.length) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (campaignId && leads[newIndex]) {
        localStorage.setItem(`dialer_lead_${campaignId}`, leads[newIndex].id);
      }
    } else toast.info('All leads dialed!');
  }

  const navigatePrev = () => {
    if (isOnCall) return; // Disable navigation during call
    if (currentIndex - 1 >= 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (campaignId && leads[newIndex]) {
        localStorage.setItem(`dialer_lead_${campaignId}`, leads[newIndex].id);
      }
    }
  }

  const controls = useAnimation();
  const handleDragEnd = async (_event: any, info: PanInfo) => {
    if (isOnCall) return; // Disable swipe during active call per spec
    const swipeThreshold = 100;
    
    if (info.offset.y < -swipeThreshold && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      await controls.start({ y: -1000, opacity: 0, transition: { duration: 0.3 } });
      markMeetingBooked();
      controls.set({ x: 0, y: 0, opacity: 1 });
    }
    else if (info.offset.x < -swipeThreshold) {
      await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.3 } });
      navigateNext();
      controls.set({ x: 0, y: 0, opacity: 1 });
    }
    else if (info.offset.x > swipeThreshold) {
      await controls.start({ x: 1000, opacity: 0, transition: { duration: 0.3 } });
      navigatePrev();
      controls.set({ x: 0, y: 0, opacity: 1 });
    } 
    else {
      controls.start({ x: 0, y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4 } });
    }
  };

  const triggerSwipeLeft = async () => {
    if (isOnCall) return;
    await controls.start({ x: -1000, opacity: 0, transition: { duration: 0.3 } });
    navigateNext();
    controls.set({ x: 0, y: 0, opacity: 1 });
  }

  if (!campaignId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-500">No campaign selected</h2>
      </div>
    );
  }
  if (isLoading) return <div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-black" /></div>;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-black mb-2">Error Loading Dialer</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button onClick={() => navigate('/login')} className="bg-gray-100 hover:bg-gray-200 text-black px-6 py-2 rounded-xl transition-colors font-medium">Re-authenticate</button>
      </div>
    );
  }

  if (leads.length === 0) return <div className="text-center py-40"><h2 className="text-2xl font-bold">All leads dialed!</h2></div>;

  const isInCall = ['trying', 'ringing', 'active'].includes(voice.primaryCallState) || isLocalCallActive;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-white md:bg-[#F5F5F7] animate-in fade-in duration-700">
      
      {/* Center - Swiping Deck Container */}
      <main className="flex-1 relative flex items-center justify-center pt-4 pb-0 md:py-8">
        
        {/* Card Deck */}
        <div className="relative w-full h-full md:max-w-[420px] md:h-[750px] flex items-center justify-center z-10 perspective-[1000px]">
          
          {/* Card Next (Behind) */}
          {leads[currentIndex + 1] && (
            <motion.div 
              className="absolute w-full h-full bg-gray-50 border border-gray-200/50 shadow-sm rounded-t-[2.5rem] md:rounded-3xl"
              initial={{ scale: 0.95, y: 20, z: -50 }}
              animate={{ scale: 0.95, y: 20, z: -50 }}
            />
          )}

          {/* Current Card (Interactive) */}
          {currentLead ? (
            <motion.div 
              key={currentLead.id}
              drag={!isInCall && !showDisposition && !isDetailsExpanded} // Disable swipe if details expanded or on call
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              onDragEnd={handleDragEnd}
              animate={controls}
              className="absolute w-full h-full bg-white md:border md:border-gray-200 md:shadow-xl rounded-t-[2.5rem] md:rounded-3xl flex flex-col cursor-grab active:cursor-grabbing transform-gpu overflow-hidden"
            >
              {/* Top Navigation Bar inside card */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0 bg-white z-20">
                <button onClick={() => navigate('/campaigns')} className="p-2 -ml-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                  <button onClick={navigatePrev} disabled={isOnCall || currentIndex === 0} className="p-2 text-gray-400 hover:text-black disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-bold text-gray-600 tracking-widest font-mono">
                    {currentIndex + 1} / {totalLeadsCount}
                  </span>
                  <button onClick={navigateNext} disabled={isOnCall || currentIndex >= leads.length - 1} className="p-2 text-gray-400 hover:text-black disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div 
                className="flex-1 flex flex-col relative z-10 overflow-y-auto no-scrollbar pointer-events-auto pb-32" 
                onPointerDownCapture={(e) => {
                  if (isDetailsExpanded) e.stopPropagation();
                }}
              >
                {/* Top Zone: Business Identity */}
                <div className="px-8 pt-4 pb-6 flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-gray-100 shadow-sm flex items-center justify-center mb-5 border border-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  {/* Tier 1 Typography */}
                  <h2 className="text-[26px] leading-tight font-bold text-black mb-1">
                    {currentLead.company || `${currentLead.first_name} ${currentLead.last_name || ''}`.trim()}
                  </h2>
                  
                  {currentLead.company && (currentLead.first_name || currentLead.last_name) && (
                    <p className="text-gray-500 font-medium text-[15px] mb-2">
                      {currentLead.first_name} {currentLead.last_name || ''}
                    </p>
                  )}

                  {/* Rating & Review Count */}
                  {(currentLead.google_rating || currentLead.review_count) && (
                    <div className="flex items-center gap-1 mb-2 text-[14px] font-medium text-gray-700">
                      <span className="text-black font-bold">{currentLead.google_rating?.toFixed(1) || '4.0'}</span>
                      <Star className="w-4 h-4 text-[#FABB05] fill-[#FABB05]" />
                      <span className="text-gray-400 ml-1">({currentLead.review_count || 0})</span>
                    </div>
                  )}

                  {/* Location */}
                  {(currentLead.city || currentLead.state) && (
                    <div className="flex items-center gap-1.5 text-[14px] font-medium text-gray-500">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{currentLead.city}{currentLead.city && currentLead.state ? ', ' : ''}{currentLead.state}</span>
                    </div>
                  )}
                </div>

                {/* Middle Zone: Action Pills */}
                <div className="px-6 flex flex-col gap-3 mb-6">
                  {/* Phone Pill */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDial(); }}
                    className="w-full flex items-center justify-center gap-3 bg-gray-100 hover:bg-gray-200 active:scale-95 py-4 rounded-2xl transition-all"
                  >
                    <Phone className="w-5 h-5 text-gray-600" />
                    <span className="text-[18px] font-bold text-black font-mono tracking-wide">{currentLead.phone}</span>
                  </button>

                  {/* Links Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {currentLead.website ? (
                      <a href={currentLead.website} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 text-black font-semibold text-[13px] transition-colors">
                        <Globe className="w-4 h-4 text-blue-500" /> Website
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50/50 border border-gray-100 text-gray-400 font-semibold text-[13px]">
                        <Globe className="w-4 h-4 opacity-50" /> No Website
                      </div>
                    )}
                    
                    {currentLead.google_maps_url ? (
                      <a href={currentLead.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 text-black font-semibold text-[13px] transition-colors">
                        <Navigation className="w-4 h-4 text-emerald-500" /> Maps Profile
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50/50 border border-gray-100 text-gray-400 font-semibold text-[13px]">
                        <Navigation className="w-4 h-4 opacity-50" /> No Maps
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Details Toggle */}
                <div className="px-6 flex items-center justify-center mb-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsDetailsExpanded(!isDetailsExpanded); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-black transition-colors"
                  >
                    {isDetailsExpanded ? 'Hide Details' : 'Show Details'} <ChevronDown className={`w-4 h-4 transition-transform ${isDetailsExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expandable Zone */}
                {isDetailsExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-6 flex flex-col gap-4 overflow-hidden">
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {currentLead.linkedin_url && (
                        <a href={currentLead.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-50 text-blue-700 font-medium text-[13px]">
                          <Link className="h-4 w-4 shrink-0" /> LinkedIn
                        </a>
                      )}
                      {currentLead.email && (
                        <button onClick={() => { navigator.clipboard.writeText(currentLead.email!); toast.success('Copied email') }} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 text-gray-700 font-medium text-[13px] text-left">
                          <Mail className="h-4 w-4 shrink-0" /> <span className="truncate">{currentLead.email}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-1">Scratchpad</span>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onPointerDownCapture={(e) => e.stopPropagation()} 
                        placeholder="Jot down notes before, during, or after the call..."
                        className="w-full min-h-[120px] bg-gray-50 border border-gray-200 rounded-2xl resize-none p-4 text-sm text-black hover:bg-gray-100 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 focus:outline-none transition-all"
                      />
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Call Controls (Dial / Hang Up / DTMF Toggle) */}
              <CallControls
                callState={voice.primaryCallState}
                dialerMode={dialerSessionMode!}
                isLocalCallActive={isLocalCallActive}
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
                onDismiss={() => setShowDisposition(false)}
              />
              
              {/* Floating "Log Disposition" Button if sheet is dismissed but not logged */}
              {!showDisposition && (voice.primaryCallState === 'done' || prevCallState.current !== 'idle') && currentLead.status !== 'answered' && currentLead.status !== 'completed' && (
                <div className="absolute top-20 right-6 z-40">
                  <button onClick={() => setShowDisposition(true)} className="bg-black text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg flex items-center gap-2 animate-in slide-in-from-right-4">
                    <Edit3 className="w-3 h-3" /> Log Outcome
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-400">No leads available</h2>
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
