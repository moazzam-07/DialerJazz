import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';
import DTMFKeypad from './DTMFKeypad';
import type { CallState } from '@/contexts/TelnyxContext';

interface InCallHUDProps {
  callState: CallState;
  callDuration: number;
  remoteStream: MediaStream | null;
  showDTMF: boolean;
  onSendDTMF: (key: string) => void;
}

const CALL_STATE_LABELS: Record<string, string> = {
  trying: 'Dialing...',
  ringing: 'Ringing...',
  active: 'In Call',
};

/**
 * InCallHUD — overlay shown inside the lead card during an active call.
 * Displays call timer, audio visualizer, and optional DTMF keypad.
 */
export default function InCallHUD({
  callState,
  callDuration,
  remoteStream,
  showDTMF,
  onSendDTMF,
}: InCallHUDProps) {
  const isInCall = ['trying', 'ringing', 'active'].includes(callState);
  const minutes = Math.floor(callDuration / 60).toString().padStart(2, '0');
  const seconds = (callDuration % 60).toString().padStart(2, '0');

  return (
    <AnimatePresence>
      {isInCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-x-6 bottom-[100px] backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl z-20 flex flex-col items-center justify-center p-6 text-center"
          style={{ top: 'auto', height: 'auto', minHeight: '280px' }}
        >
          <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse mb-4 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          <span className="text-sm font-bold tracking-widest uppercase text-emerald-400 mb-1">
            {CALL_STATE_LABELS[callState] || callState}
          </span>
          <span className="text-5xl font-extrabold text-white tabular-nums tracking-tighter mb-6">
            {minutes}:{seconds}
          </span>

          {/* Audio Visualizer */}
          <div className="w-full h-16 bg-white/5 rounded-xl border border-white/5 mb-6 flex justify-center items-center overflow-hidden">
            {callState === 'active' && remoteStream ? (
              <AudioVisualizer mediaStream={remoteStream} color="#10b981" />
            ) : (
              <div className="h-px w-full bg-white/20" />
            )}
          </div>

          {/* DTMF Keypad */}
          <DTMFKeypad visible={showDTMF} onPress={onSendDTMF} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
