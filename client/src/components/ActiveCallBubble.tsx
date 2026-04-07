/**
 * ActiveCallBubble — Floating pill shown when the user has an active call
 * but has navigated AWAY from the dialer page.
 *
 * Clicking navigates the user back to the page where the call was initiated.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTelnyxContext } from '@/contexts/TelnyxContext';

// Routes where the call UI is already visible and the bubble would be redundant
const DIALER_EXACT = '/dialer';

export default function ActiveCallBubble() {
  const {
    primaryCallState,
    primaryCallDuration,
    activeCallRoute,
  } = useTelnyxContext();

  const navigate = useNavigate();
  const location = useLocation();

  const isOnCall = ['trying', 'ringing', 'active'].includes(primaryCallState);

  // Only hide when on the exact dialer page or a campaign's /dial page
  const isOnDialerPage =
    location.pathname === DIALER_EXACT ||
    location.pathname.endsWith('/dial');

  const visible = isOnCall && !isOnDialerPage && !!activeCallRoute;

  const minutes = Math.floor(primaryCallDuration / 60).toString().padStart(2, '0');
  const seconds = (primaryCallDuration % 60).toString().padStart(2, '0');

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          onClick={() => activeCallRoute && navigate(activeCallRoute)}
          className="fixed bottom-6 left-6 z-[85] flex items-center gap-3 px-5 py-3 bg-surface/90 border border-black/10 dark:border-white/10 backdrop-blur-3xl rounded-full shadow-2xl hover:bg-surface transition-all hover:scale-105 group"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 shadow-sm"
          >
            <Phone className="h-5 w-5" />
          </motion.div>

          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">
              In Call
            </p>
            <p className="text-lg font-mono font-bold text-foreground tabular-nums">
              {minutes}:{seconds}
            </p>
          </div>

          <span className="text-xs font-medium text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Return →
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
