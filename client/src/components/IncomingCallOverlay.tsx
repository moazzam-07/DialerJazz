/**
 * IncomingCallOverlay — Full-screen incoming call UI.
 * Shown when there is an inbound ringing call and NO active primary call.
 * Mimics a mobile phone's incoming call screen.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, User } from 'lucide-react';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

export default function IncomingCallOverlay() {
  const {
    incomingCall,
    incomingCallerNumber,
    incomingCallerName,
    primaryCall,
    answerIncoming,
    rejectIncoming,
  } = useTelnyxContext();

  // Only show full-screen when incoming + NO active call
  const visible = !!incomingCall && !primaryCall;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
        >
          {/* Animated rings */}
          <div className="relative mb-12">
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-2 border-foreground/40"
              style={{ width: 160, height: 160, top: -40, left: -40 }}
            />
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              className="absolute inset-0 rounded-full border-2 border-foreground/30"
              style={{ width: 160, height: 160, top: -40, left: -40 }}
            />
            <div className="relative h-20 w-20 rounded-full bg-muted border-2 border-black/10 dark:border-white/10 flex items-center justify-center">
              <User className="h-10 w-10 text-foreground" />
            </div>
          </div>

          {/* Caller info */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3">
              Incoming Call
            </p>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-2">
              {incomingCallerName || 'Unknown Caller'}
            </h1>
            <p className="text-xl font-mono text-muted-foreground">
              {incomingCallerNumber}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-12"
          >
            {/* Decline */}
            <button
              onClick={rejectIncoming}
              className="group flex flex-col items-center gap-3"
            >
              <div className="h-16 w-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center transition-all group-hover:bg-red-500/30 group-hover:scale-110 group-active:scale-95">
                <PhoneOff className="h-7 w-7 text-red-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                Decline
              </span>
            </button>

            {/* Accept */}
            <button
              onClick={answerIncoming}
              className="group flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="h-20 w-20 rounded-full bg-foreground flex items-center justify-center shadow-lg transition-all group-hover:bg-foreground/90 group-hover:scale-110 group-active:scale-95"
              >
                <Phone className="h-9 w-9 text-background" />
              </motion.div>
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Accept
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
