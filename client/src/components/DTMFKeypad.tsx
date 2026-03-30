const DTMF_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

interface DTMFKeypadProps {
  visible: boolean;
  onPress: (key: string) => void;
}

/**
 * DTMF Keypad — numeric keypad for navigating IVRs during an active call.
 * Only renders when `visible` is true.
 */
export default function DTMFKeypad({ visible, onPress }: DTMFKeypadProps) {
  if (!visible) return null;

  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {DTMF_KEYS.map((k) => (
        <button
          key={k}
          onClick={() => onPress(k)}
          className="bg-white/10 py-3 rounded-lg font-bold hover:bg-white/20 active:scale-95 text-xl text-white transition-all"
        >
          {k}
        </button>
      ))}
    </div>
  );
}
