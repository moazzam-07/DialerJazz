import { Phone, PhoneOff, Hash } from 'lucide-react';
import type { CallState } from '@/hooks/useTelnyxCall';

interface CallControlsProps {
  callState: CallState;
  dialerMode: 'power' | 'click';
  onDial: () => void;
  onHangUp: () => void;
  onToggleDTMF: () => void;
}

const isInCallState = (state: CallState) =>
  ['trying', 'ringing', 'active'].includes(state);

/**
 * Call Controls — the dial/hangup button bar pinned to the bottom of a lead card.
 * Extracted from DialerPage to follow component composition patterns.
 */
export default function CallControls({
  callState,
  dialerMode,
  onDial,
  onHangUp,
  onToggleDTMF,
}: CallControlsProps) {
  const inCall = isInCallState(callState);

  return (
    <div className="absolute bottom-6 left-6 right-6">
      {!inCall ? (
        <button
          onClick={(e) => { e.stopPropagation(); onDial(); }}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95"
        >
          <Phone className="h-6 w-6" />
          {dialerMode === 'power' ? 'Dial Now' : 'Click to Call'}
        </button>
      ) : (
        <div className="w-full flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onHangUp(); }}
            className="flex-1 h-14 bg-red-500 hover:bg-red-400 text-white font-bold text-lg rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <PhoneOff className="h-6 w-6" /> Hang Up
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDTMF(); }}
            className="h-14 w-14 bg-black/40 border border-white/10 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all"
          >
            <Hash className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
