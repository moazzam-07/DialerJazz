import { motion, AnimatePresence } from 'framer-motion';

interface DispositionOption {
  value: string;
  label: string;
  color: string;
  emoji: string;
  primary?: boolean;
}

interface DispositionOverlayProps {
  visible: boolean;
  dispositions: DispositionOption[];
  isDisposing: boolean;
  onSelect: (label: string) => void;
  onDismiss?: () => void;
}

/**
 * DispositionOverlay — bottom-sheet UI that appears after a call ends.
 */
export default function DispositionOverlay({
  visible,
  dispositions,
  isDisposing,
  onSelect,
  onDismiss,
}: DispositionOverlayProps) {
  const primaryDispositions = dispositions.filter((d) => d.primary);
  const secondaryDispositions = dispositions.filter((d) => !d.primary);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          drag={onDismiss ? "y" : false}
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 && onDismiss) {
              onDismiss();
            }
          }}
          className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] border border-gray-100 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden"
          style={{ height: '65%' }}
        >
          {/* Pull handle */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-4 mb-6" />

          <div className="px-6 flex-1 flex flex-col overflow-y-auto no-scrollbar pb-6">
            <h3 className="text-xl font-bold text-black mb-1 text-center">
              What's the outcome?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-8">
              Select disposition to save and continue.
            </p>

            <div className="space-y-4">
              {/* Primary Row */}
              <div className="grid grid-cols-3 gap-3">
                {primaryDispositions.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => onSelect(d.label)}
                    disabled={isDisposing}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span className="text-2xl">{d.emoji}</span>
                    <span className="text-xs font-bold text-black text-center leading-tight">
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="h-px w-full bg-gray-100 my-4" />
              {/* Secondary Row */}
              <div className="grid grid-cols-3 gap-3">
                {secondaryDispositions.map((d) => (
                  <button
                    key={d.label}
                    onClick={() => onSelect(d.label)}
                    disabled={isDisposing}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-transparent border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-gray-500 hover:text-black"
                  >
                    <span className="text-xl opacity-70">{d.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center">
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
