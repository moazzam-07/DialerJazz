import { Phone, PhoneOff, Hash } from 'lucide-react';
import type { CallState } from '@/contexts/TelnyxContext';

interface CallControlsProps {
  callState: CallState;
  dialerMode: 'power' | 'click';
  isLocalCallActive?: boolean;
  onDial: () => void;
  onHangUp: () => void;
  onToggleDTMF: () => void;
}

const isInCallState = (state: CallState, isLocalActive?: boolean) =>
  ['trying', 'ringing', 'active'].includes(state) || !!isLocalActive;

/**
 * Call Controls — the dial/hangup button bar pinned to the bottom of a lead card.
 */
export default function CallControls({
  callState,
  dialerMode,
  isLocalCallActive,
  onDial,
  onHangUp,
  onToggleDTMF,
}: CallControlsProps) {
  const inCall = isInCallState(callState, isLocalCallActive);

  return (
    <div className="absolute bottom-6 left-6 right-6">
      {!inCall ? (
        <button
          onClick={(e) => { e.stopPropagation(); onDial(); }}
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Phone className="h-6 w-6" />
          {dialerMode === 'power' ? 'Dial Now' : 'Call'}
        </button>
      ) : (
        <div className="w-full flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onHangUp(); }}
            className="flex-1 h-14 bg-red-500 hover:bg-red-600 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <PhoneOff className="h-6 w-6" /> End Call
          </button>
          {!isLocalCallActive && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleDTMF(); }}
              className="h-14 w-14 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
            >
              <Hash className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
