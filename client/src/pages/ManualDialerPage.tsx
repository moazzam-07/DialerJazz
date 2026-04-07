import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Delete, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { callsApi } from '@/lib/api';
import { useTelnyxContext } from '@/contexts/TelnyxContext';
import CallControls from '@/components/CallControls';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ManualDialerPage() {
  const navigate = useNavigate();
  const telnyx = useTelnyxContext();

  const [numberInput, setNumberInput] = useState('');
  const [showDTMF, setShowDTMF] = useState(false);

  // Track this route for the ActiveCallBubble — only set if no call is already active
  // (prevents overwriting campaign route when user visits this page mid-call)
  const isOnCall = ['trying', 'ringing', 'active'].includes(telnyx.primaryCallState);
  useEffect(() => {
    if (!isOnCall) {
      telnyx.setActiveCallRoute('/dialer');
    }
  }, []);

  const handleDial = () => {
    if (!telnyx.sipConfigured) return toast.error('Configure Telnyx SIP in Connectors first.');
    if (telnyx.connectionStatus !== 'registered') return toast.error('Connecting...');
    if (numberInput.trim() === '') return toast.error('Please enter a phone number to call.');
    telnyx.dial(numberInput);
  };

  const handleHangUp = async () => {
    const duration = telnyx.primaryCallDuration;
    telnyx.hangup();
    if (duration > 0) {
      try {
        await callsApi.log({
          lead_id: null,
          campaign_id: null,
          duration_seconds: duration,
          status: 'completed',
          disposition: 'manual_call',
          notes: 'Manual out-of-band call',
        });
      } catch (err) {
        console.error('Failed to save manual call log', err);
      }
    }
  };

  const handleNumberInput = (digit: string) => {
    setNumberInput((prev) => prev + digit);
  };

  const handleDelete = () => {
    setNumberInput((prev) => prev.slice(0, -1));
  };

  if (telnyx.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Dialer</h2>
        <p className="text-muted-foreground mb-6">{telnyx.error}</p>
        <button onClick={() => navigate('/login')} className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-xl transition-colors hover:bg-white/20 font-medium">Re-authenticate</button>
      </div>
    );
  }

  const isInCall = ['trying', 'ringing', 'active'].includes(telnyx.primaryCallState);

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-700">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 shrink-0 z-10 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Manual Dialer</h1>
          <p className="text-muted-foreground text-sm mt-1">Make direct ad-hoc calls outside of active campaigns.</p>
        </div>
        <div className="flex items-center gap-2">
          {telnyx.connectionStatus === 'registered' ? (
             <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border border-emerald-500/20 font-medium py-1">
               <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse mr-2"/> SIP Registered
             </Badge>
          ) : (
             <Badge variant="outline" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 shadow-none border border-amber-500/20 font-medium py-1">
               <Loader2 className="h-3 w-3 animate-spin mr-2"/> Connecting
             </Badge>
          )}
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 overflow-auto p-6 flex justify-center items-start lg:items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-6xl">
          
          {/* Numpad Widget */}
          <Card className="lg:col-span-5 xl:col-span-4 bg-surface/50 border-border shadow-sm flex flex-col h-[650px]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Softphone</CardTitle>
              <CardDescription>Enter destination number</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col grow justify-between h-full">
              {/* Display / Input Area */}
              <div className="flex flex-col items-center justify-center mb-6 pt-4 h-20 bg-background rounded-xl border border-border shadow-inner relative overflow-hidden">
                 <input 
                   value={numberInput}
                   onChange={(e) => setNumberInput(e.target.value)}
                   className="text-3xl font-mono text-center font-bold tracking-wider text-foreground bg-transparent w-full outline-none placeholder:text-muted-foreground/30"
                   placeholder="(555) 000-0000"
                   disabled={isInCall}
                 />
                 <button 
                   onClick={handleDelete} 
                   disabled={isInCall || numberInput.length === 0}
                   className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground disabled:opacity-0 transition-opacity rounded-full hover:bg-muted"
                 >
                   <Delete className="h-5 w-5" />
                 </button>
              </div>

              {/* Numpad */}
              <div className={`grid grid-cols-3 gap-3 mb-8 ${isInCall ? 'opacity-50 pointer-events-none' : ''}`}>
                 {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                   <button
                     key={digit}
                     onClick={() => handleNumberInput(digit)}
                     className="h-16 rounded-xl bg-muted hover:bg-muted/80 active:bg-foreground/10 text-2xl font-semibold text-foreground transition-colors shadow-sm border border-border/50"
                   >
                     {digit}
                   </button>
                 ))}
              </div>

              {/* Call Controls Wrapper */}
              <div className="mt-auto">
                 {isInCall ? (
                   <CallControls
                      callState={telnyx.primaryCallState}
                      dialerMode="click"
                      onDial={() => {}}
                      onHangUp={handleHangUp}
                      onToggleDTMF={() => setShowDTMF(!showDTMF)}
                   />
                 ) : (
                   <button
                     onClick={handleDial}
                     disabled={!telnyx.sipConfigured || telnyx.connectionStatus !== 'registered'}
                     className="w-full h-16 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold text-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                   >
                     <Phone className="h-5 w-5" />
                     {telnyx.connectionStatus !== 'registered' ? 'Connecting...' : 'Call'}
                   </button>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Activity / Info Pane */}
          <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 bg-surface/30 border border-border shadow-sm flex-col">
            <CardHeader className="border-b border-border bg-surface/50">
              <CardTitle className="text-lg flex items-center gap-2">
                 <div className={`h-2.5 w-2.5 rounded-full ${isInCall ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                 {isInCall ? 'Active Call Details' : 'Ready'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
               {isInCall ? (
                 <div className="text-center animate-in zoom-in-95 duration-500">
                    <div className="h-32 w-32 rounded-full border-4 border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                      <Phone className="h-12 w-12 text-emerald-500 animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-mono font-bold text-foreground mb-2">{numberInput}</h2>
                    <p className="text-lg text-emerald-500 font-medium">Connecting Call...</p>
                 </div>
               ) : (
                 <div className="text-center">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Phone className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Active Call</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">Use the softphone on the left to manually dial a number outside of your campaign workflows.</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Hidden audio element for remote stream playback */}
      {telnyx.primaryCall?.remoteStream && (
        <audio autoPlay ref={(el) => { if (el && telnyx.primaryCall?.remoteStream) { el.srcObject = telnyx.primaryCall.remoteStream; } }} />
      )}
    </div>
  );
}
