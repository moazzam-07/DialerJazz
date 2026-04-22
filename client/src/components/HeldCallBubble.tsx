/**
 * HeldCallBubble — Small floating pill shown when a call is on hold.
 * Clicking it resumes the held call (hangs up the current active call).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Pause, PhoneForwarded } from 'lucide-react';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

export default function HeldCallBubble() {
  const {
    heldCall,
    heldCallDuration,
    heldCallerNumber,
    hangupAndResume,
  } = useTelnyxContext();

  const visible = !!heldCall;

  const minutes = Math.floor(heldCallDuration / 60).toString().padStart(2, '0');
  const seconds = (heldCallDuration % 60).toString().padStart(2, '0');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className="fixed bottom-6 right-6 z-[80]"
        >
          <button
            onClick={hangupAndResume}
            className="group flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl rounded-2xl shadow-lg hover:bg-amber-500/20 transition-all hover:scale-105"
          >
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0"
            >
              <Pause className="h-4 w-4 text-amber-400" />
            </motion.div>

            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                On Hold
              </p>
              <p className="text-sm font-mono font-semibold text-white">
                {heldCallerNumber}
              </p>
            </div>

            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums ml-2">
              {minutes}:{seconds}
            </span>

            <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <PhoneForwarded className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
