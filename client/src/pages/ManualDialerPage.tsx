import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Delete, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { callsApi } from '@/lib/api';
import { useTelnyxContext } from '@/contexts/TelnyxContext';
import CallControls from '@/components/CallControls';

export default function ManualDialerPage() {
  const navigate = useNavigate();
  const telnyx = useTelnyxContext();

  const [numberInput, setNumberInput] = useState('');
  const [showDTMF, setShowDTMF] = useState(false);

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
        <h2 className="text-2xl font-bold text-white mb-2">Error Loading Dialer</h2>
        <p className="text-zinc-400 mb-6">{telnyx.error}</p>
        <button onClick={() => navigate('/login')} className="bg-white/10 text-white px-6 py-2 rounded-xl transition-colors hover:bg-white/20 font-medium">Re-authenticate</button>
      </div>
    );
  }

  const isInCall = ['trying', 'ringing', 'active'].includes(telnyx.primaryCallState);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-black animate-in fade-in duration-700">
      {/* Top Header */}
      <header className="flex items-center justify-between p-6 shrink-0 z-10">
        <div>
          <h1 className="font-bold text-2xl text-white">Manual Dialer</h1>
        </div>
        <div className="flex items-center gap-2">
          {telnyx.connectionStatus === 'registered' ? (
             <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold leading-none flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/> SIP Registered</span>
          ) : (
             <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold leading-none flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin"/> Connecting</span>
          )}
        </div>
      </header>

      {/* Main Numpad Container */}
      <main className="flex-1 relative flex items-center justify-center -mt-6">
        <div className="relative w-full max-w-sm h-[600px] flex items-center justify-center z-10 perspective-[1000px]">
          
          <motion.div 
            className="absolute w-full h-full bg-[#1A1A1E] border border-white/10 shadow-2xl shadow-black/50 rounded-3xl p-6 flex flex-col transform-gpu"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
          >
            {/* Display / Input Area */}
            <div className="flex flex-col items-center justify-center mb-6 pt-4 h-24 bg-black/40 rounded-2xl border border-white/5 relative">
               <input 
                 value={numberInput}
                 onChange={(e) => setNumberInput(e.target.value)}
                 className="text-3xl font-mono text-center font-bold tracking-widest text-white bg-transparent w-full outline-none"
                 placeholder="Phone Number"
                 disabled={isInCall}
               />
               <button 
                 onClick={handleDelete} 
                 disabled={isInCall || numberInput.length === 0}
                 className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-300 disabled:opacity-0 transition-opacity"
               >
                 <Delete className="h-6 w-6" />
               </button>
            </div>

            {/* Numpad */}
            <div className={`grid grid-cols-3 gap-4 mb-8 ${isInCall ? 'opacity-50 pointer-events-none' : ''}`}>
               {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                 <button
                   key={digit}
                   onClick={() => handleNumberInput(digit)}
                   className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-2xl font-semibold text-white transition-colors"
                 >
                   {digit}
                 </button>
               ))}
            </div>

            {/* Call Controls Wrapper */}
            <div className="mt-auto px-4">
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
                   className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                 >
                   <Phone className="h-6 w-6" />
                   Call
                 </button>
               )}
            </div>

          </motion.div>
        
        </div>
      </main>

      {/* Hidden audio element for remote stream playback */}
      {telnyx.primaryCall?.remoteStream && (
        <audio autoPlay ref={(el) => { if (el && telnyx.primaryCall?.remoteStream) { el.srcObject = telnyx.primaryCall.remoteStream; } }} />
      )}
    </div>
  );
}
