/**
 * VoiceContext — Unified provider-agnostic abstraction over Telnyx + Twilio.
 *
 * All UI components import `useVoice()` from this file.
 * The VoiceContext delegates all calls to whichever provider is currently active.
 *
 * Both TelnyxProvider and TwilioProvider must be mounted as parents.
 * This context reads from them and exposes a single unified interface.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useTelnyxContext } from './TelnyxContext';
import { useTwilioContext } from './TwilioContext';
import type { ConnectionStatus, CallState, QualityMetrics } from './TelnyxContext';

// ── Types ────────────────────────────────────────────────────────────
export type VoiceProviderType = 'telnyx' | 'twilio';

export interface VoiceContextValue {
  // Which provider is active
  activeProvider: VoiceProviderType | null;

  // Delegated state
  connectionStatus: ConnectionStatus;
  sipConfigured: boolean;
  primaryCall: any;
  primaryCallState: CallState;
  primaryCallDuration: number;
  isMuted: boolean;
  isHeld: boolean;

  // Incoming
  incomingCall: any;
  incomingCallerNumber: string;
  incomingCallerName: string;

  // Held
  heldCall: any;
  heldCallDuration: number;
  heldCallerNumber: string;

  // Actions
  connectProvider: (provider: VoiceProviderType) => Promise<void>;
  disconnectProvider: () => void;
  dial: (destination: string, callerNumber?: string) => void;
  hangup: () => void;
  answerIncoming: () => void;
  rejectIncoming: () => void;
  holdAndAnswer: () => void;
  hangupAndResume: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDTMF: (digit: string) => void;

  // Navigation
  activeCallRoute: string | null;
  setActiveCallRoute: (route: string | null) => void;

  // Errors & metrics
  error: string | null;
  sipError: string | null;
  qualityMetrics: QualityMetrics | null;

  // Legacy direct access (for gradual migration)
  telnyx: ReturnType<typeof useTelnyxContext>;
  twilio: ReturnType<typeof useTwilioContext>;
}

const VoiceCtx = createContext<VoiceContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────
export function VoiceContextProvider({ children }: { children: ReactNode }) {
  const telnyx = useTelnyxContext();
  const twilio = useTwilioContext();
  const [activeProvider, setActiveProvider] = useState<VoiceProviderType | null>(null);

  // Select the active adapter based on current provider
  const active = activeProvider === 'twilio' ? twilio : telnyx;

  const connectProvider = useCallback(async (provider: VoiceProviderType) => {
    console.log(`[VoiceContext] Switching to provider: ${provider}`);

    // Disconnect current provider if switching
    if (activeProvider && activeProvider !== provider) {
      if (activeProvider === 'telnyx') {
        telnyx.disconnect();
      } else {
        twilio.disconnect();
      }
    }

    setActiveProvider(provider);

    // Init the new provider
    if (provider === 'telnyx') {
      await telnyx.initConnection();
    } else {
      await twilio.initConnection();
    }
  }, [activeProvider, telnyx, twilio]);

  const disconnectProvider = useCallback(() => {
    if (activeProvider === 'telnyx') {
      telnyx.disconnect();
    } else if (activeProvider === 'twilio') {
      twilio.disconnect();
    }
    setActiveProvider(null);
  }, [activeProvider, telnyx, twilio]);

  // Delegate all reads + actions from the active provider
  const value: VoiceContextValue = {
    activeProvider,

    // State (from active provider)
    connectionStatus: active.connectionStatus,
    sipConfigured: active.sipConfigured,
    primaryCall: active.primaryCall,
    primaryCallState: active.primaryCallState,
    primaryCallDuration: active.primaryCallDuration,
    isMuted: active.isMuted,
    isHeld: active.isHeld,

    // Incoming (from active provider)
    incomingCall: active.incomingCall,
    incomingCallerNumber: active.incomingCallerNumber,
    incomingCallerName: active.incomingCallerName,

    // Held (from active provider)
    heldCall: active.heldCall,
    heldCallDuration: active.heldCallDuration,
    heldCallerNumber: active.heldCallerNumber,

    // Actions (delegated to active)
    connectProvider,
    disconnectProvider,
    dial: active.dial,
    hangup: active.hangup,
    answerIncoming: active.answerIncoming,
    rejectIncoming: active.rejectIncoming,
    holdAndAnswer: active.holdAndAnswer,
    hangupAndResume: active.hangupAndResume,
    toggleMute: active.toggleMute,
    toggleHold: active.toggleHold,
    sendDTMF: active.sendDTMF,

    // Navigation
    activeCallRoute: active.activeCallRoute,
    setActiveCallRoute: active.setActiveCallRoute,

    // Errors
    error: active.error,
    sipError: active.sipError,
    qualityMetrics: active.qualityMetrics,

    // Direct access (for gradual migration or special cases)
    telnyx,
    twilio,
  };

  return (
    <VoiceCtx.Provider value={value}>
      {children}
    </VoiceCtx.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceCtx);
  if (!ctx) {
    throw new Error('useVoice must be used within a VoiceContextProvider');
  }
  return ctx;
}
