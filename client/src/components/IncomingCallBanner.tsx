/**
 * IncomingCallBanner — Small popup/banner shown when there is an inbound call
 * AND the user is already on an active call.
 *
 * Can be minimized to a small floating bubble by dragging down.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, User, Minimize2 } from 'lucide-react';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

export default function IncomingCallBanner() {
  const {
    incomingCall,
    incomingCallerNumber,
    incomingCallerName,
    primaryCall,
    holdAndAnswer,
    rejectIncoming,
  } = useTelnyxContext();

  const [isMinimized, setIsMinimized] = useState(false);

  // Only show when incoming + already on a call
  const visible = !!incomingCall && !!primaryCall;

  // Reset minimized state when banner disappears
  if (!visible && isMinimized) {
    setIsMinimized(false);
  }

  if (!visible) return null;

  // ── Minimized bubble ─────────────────────────────────────────────
  if (isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 z-[90] flex items-center gap-2 px-4 py-2.5 bg-foreground/20 border border-foreground/30 backdrop-blur-xl rounded-full shadow-lg hover:bg-foreground/30 transition-colors"
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-3 w-3 rounded-full bg-foreground"
        />
        <span className="text-sm font-bold text-background">
          Incoming: {incomingCallerNumber}
        </span>
      </motion.button>
    );
  }

  // ── Full banner ──────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 60) setIsMinimized(true);
        }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md cursor-grab active:cursor-grabbing"
      >
        <div className="bg-surface/95 backdrop-blur-xl border border-foreground/20 rounded-2xl p-4 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-12 w-12 rounded-full bg-foreground/20 border border-foreground/30 flex items-center justify-center shrink-0"
            >
              <User className="h-6 w-6 text-background" />
            </motion.div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-background">
                Incoming Call
              </p>
              <p className="text-foreground font-semibold truncate">
                {incomingCallerName || incomingCallerNumber}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={rejectIncoming}
                className="h-10 w-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <PhoneOff className="h-5 w-5 text-red-400" />
              </button>
              <button
                onClick={holdAndAnswer}
                className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-background transition-colors"
              >
                <Phone className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="h-10 w-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted hover:bg-muted/80 transition-colors"
              >
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Drag hint */}
          <div className="flex justify-center mt-2">
            <div className="h-1 w-10 rounded-full bg-muted hover:bg-muted/80" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
