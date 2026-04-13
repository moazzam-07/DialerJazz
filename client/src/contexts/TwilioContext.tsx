/**
 * TwilioContext — Global React Context that owns the Twilio Voice Device.
 *
 * Mirrors the same interface as TelnyxContext so VoiceContext can
 * delegate to either one transparently.
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { twilioApi, settingsApi } from '@/lib/api';

import type { ConnectionStatus, CallState, QualityMetrics } from './TelnyxContext';

// ── Types ────────────────────────────────────────────────────────────
export interface TwilioContextValue {
  // Connection
  connectionStatus: ConnectionStatus;
  initConnection: () => Promise<void>;
  disconnect: () => void;
  sipConfigured: boolean;

  // Primary call
  primaryCall: Call | null;
  primaryCallState: CallState;
  primaryCallDuration: number;
  isMuted: boolean;
  isHeld: boolean;

  // Incoming call
  incomingCall: Call | null;
  incomingCallerNumber: string;
  incomingCallerName: string;

  // Held call (not fully supported in Twilio browser SDK, but keeping interface parity)
  heldCall: Call | null;
  heldCallDuration: number;
  heldCallerNumber: string;

  // Actions
  dial: (destinationNumber: string, callerNumber?: string) => void;
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

  // Errors
  error: string | null;
  sipError: string | null;
  qualityMetrics: QualityMetrics | null;
}

const TwilioContext = createContext<TwilioContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────
export function TwilioProvider({ children }: { children: ReactNode }) {
  const deviceRef = useRef<Device | null>(null);
  const callerNumberRef = useRef<string>('');

  // Timers
  const primaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connection
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [sipConfigured, setSipConfigured] = useState(false);

  // Primary call state
  const primaryCallRef = useRef<Call | null>(null);
  const [primaryCall, setPrimaryCall] = useState<Call | null>(null);
  const [primaryCallState, setPrimaryCallState] = useState<CallState>('idle');
  const [primaryCallDuration, setPrimaryCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  // Incoming call state
  const incomingCallRef = useRef<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [incomingCallerNumber, setIncomingCallerNumber] = useState('');
  const [incomingCallerName, setIncomingCallerName] = useState('');

  // Held call state (interface parity — limited support)
  const [heldCall, setHeldCall] = useState<Call | null>(null);
  const [heldCallDuration, _setHeldCallDuration] = useState(0);
  const [heldCallerNumber, _setHeldCallerNumber] = useState('');

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [sipError, setSipError] = useState<string | null>(null);
  const [qualityMetrics] = useState<QualityMetrics | null>(null);

  // Navigation
  const [activeCallRoute, setActiveCallRoute] = useState<string | null>(null);

  // ── Timer helpers ──────────────────────────────────────────────────
  const startPrimaryTimer = useCallback(() => {
    if (primaryTimerRef.current) clearInterval(primaryTimerRef.current);
    setPrimaryCallDuration(0);
    primaryTimerRef.current = setInterval(() => {
      setPrimaryCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopPrimaryTimer = useCallback(() => {
    if (primaryTimerRef.current) {
      clearInterval(primaryTimerRef.current);
      primaryTimerRef.current = null;
    }
  }, []);

  // ── Helper to attach Call event listeners ──────────────────────────
  const attachCallListeners = useCallback((call: Call) => {
    call.on('accept', () => {
      console.log('[TwilioContext] Call accepted');
      primaryCallRef.current = call;
      setPrimaryCall(call);
      setPrimaryCallState('active');
      startPrimaryTimer();
      setSipError(null);
    });

    call.on('disconnect', () => {
      console.log('[TwilioContext] Call disconnected');
      stopPrimaryTimer();
      primaryCallRef.current = null;
      setPrimaryCall(null);
      setPrimaryCallState('done');
      setIsMuted(false);
      setIsHeld(false);
      setActiveCallRoute(null);
    });

    call.on('cancel', () => {
      console.log('[TwilioContext] Call cancelled');
      stopPrimaryTimer();
      primaryCallRef.current = null;
      setPrimaryCall(null);
      setPrimaryCallState('done');
      setIsMuted(false);
      setIsHeld(false);
      setActiveCallRoute(null);
    });

    call.on('reject', () => {
      console.log('[TwilioContext] Call rejected');
      stopPrimaryTimer();
      primaryCallRef.current = null;
      setPrimaryCall(null);
      setPrimaryCallState('done');
      setIsMuted(false);
      setActiveCallRoute(null);
    });

    call.on('error', (err: any) => {
      console.error('[TwilioContext] Call error:', err);
      setSipError(`Call error: ${err?.message || 'Unknown error'}`);
    });

    // Ringing event
    call.on('ringing', () => {
      console.log('[TwilioContext] Call ringing');
      setPrimaryCallState('ringing');
    });
  }, [startPrimaryTimer, stopPrimaryTimer]);

  // ── Connect to Twilio ──────────────────────────────────────────────
  const initConnection = useCallback(async () => {
    if (deviceRef.current) {
      try { deviceRef.current.destroy(); } catch { /* noop */ }
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      // Check if Twilio is configured
      const settingsRes = await settingsApi.get();
      const settings = settingsRes.data;

      if (!settings?.twilio_account_sid || !settings?.twilio_api_key) {
        setSipConfigured(false);
        setConnectionStatus('disconnected');
        return;
      }

      setSipConfigured(true);
      if (settings.twilio_caller_number) {
        callerNumberRef.current = settings.twilio_caller_number;
      }

      // Fetch Access Token from our backend
      const tokenRes = await twilioApi.getToken();
      if (!tokenRes.data?.token) {
        throw new Error('Failed to get Twilio token');
      }

      console.log('[TwilioContext] Creating Device with token');

      const device = new Device(tokenRes.data.token, {
        logLevel: 1, // DEBUG
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      // Device events
      device.on('registered', () => {
        console.log('[TwilioContext] Device registered');
        setConnectionStatus('registered');
        setError(null);
      });

      device.on('error', (err: any) => {
        console.error('[TwilioContext] Device error:', err);
        setError(`Twilio error: ${err?.message || 'Unknown error'}`);
      });

      device.on('incoming', (call: Call) => {
        console.log('[TwilioContext] Incoming call:', call.parameters);
        incomingCallRef.current = call;
        setIncomingCall(call);
        setIncomingCallerNumber(call.parameters?.From || 'Unknown');
        setIncomingCallerName(call.parameters?.FromCity || '');

        // Listen for cancel/reject on incoming call
        call.on('cancel', () => {
          incomingCallRef.current = null;
          setIncomingCall(null);
          setIncomingCallerNumber('');
          setIncomingCallerName('');
        });

        call.on('reject', () => {
          incomingCallRef.current = null;
          setIncomingCall(null);
          setIncomingCallerNumber('');
          setIncomingCallerName('');
        });
      });

      device.on('tokenWillExpire', async () => {
        console.log('[TwilioContext] Token expiring, refreshing...');
        try {
          const refreshRes = await twilioApi.getToken();
          if (refreshRes.data?.token) {
            device.updateToken(refreshRes.data.token);
          }
        } catch (err) {
          console.error('[TwilioContext] Failed to refresh token:', err);
        }
      });

      await device.register();
      deviceRef.current = device;

      console.log('[TwilioContext] Device connected and registered');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Twilio';
      setError(message);
      setConnectionStatus('disconnected');
      console.error('[TwilioContext] Init error:', err);
    }
  }, []);

  const disconnect = useCallback(() => {
    stopPrimaryTimer();
    if (deviceRef.current) {
      try { deviceRef.current.destroy(); } catch { /* noop */ }
      deviceRef.current = null;
    }
    setConnectionStatus('disconnected');
    setPrimaryCallState('idle');
    setPrimaryCall(null);
    primaryCallRef.current = null;
    setIncomingCall(null);
    incomingCallRef.current = null;
    setHeldCall(null);
    setSipError(null);
    setIsMuted(false);
    setIsHeld(false);
  }, [stopPrimaryTimer]);

  // ── Call actions ───────────────────────────────────────────────────
  const dial = useCallback(
    (destinationNumber: string, callerNumber?: string) => {
      const device = deviceRef.current;
      if (!device) { setError('Twilio device not initialized.'); return; }
      if (connectionStatus !== 'registered') { setError('Twilio not registered yet.'); return; }
      if (primaryCallRef.current) { setError('A call is already in progress.'); return; }

      const resolvedCallerNumber = callerNumber || callerNumberRef.current || '';

      console.log('[TwilioContext] dial():', { destinationNumber, resolvedCallerNumber });

      setError(null);
      setSipError(null);
      setPrimaryCallState('trying');
      setIsMuted(false);
      setIsHeld(false);
      setPrimaryCallDuration(0);

      device.connect({
        params: {
          To: destinationNumber,
          From: resolvedCallerNumber,
        },
      }).then((call) => {
        primaryCallRef.current = call;
        setPrimaryCall(call);
        attachCallListeners(call);
      }).catch((err: any) => {
        console.error('[TwilioContext] Connect failed:', err);
        setError(`Failed to dial: ${err?.message || 'Unknown error'}`);
        setPrimaryCallState('idle');
      });
    },
    [connectionStatus, attachCallListeners]
  );

  const hangup = useCallback(() => {
    if (primaryCallRef.current) {
      primaryCallRef.current.disconnect();
    }
    stopPrimaryTimer();
    setPrimaryCallState('done');
    primaryCallRef.current = null;
    setPrimaryCall(null);
    setIsMuted(false);
    setIsHeld(false);
    setActiveCallRoute(null);
  }, [stopPrimaryTimer]);

  const answerIncoming = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.accept();
      primaryCallRef.current = incomingCallRef.current;
      setPrimaryCall(incomingCallRef.current);
      setPrimaryCallState('active');
      startPrimaryTimer();
      attachCallListeners(incomingCallRef.current);

      // Clear incoming state
      incomingCallRef.current = null;
      setIncomingCall(null);
      setIncomingCallerNumber('');
      setIncomingCallerName('');
    }
  }, [startPrimaryTimer, attachCallListeners]);

  const rejectIncoming = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.reject();
      incomingCallRef.current = null;
      setIncomingCall(null);
      setIncomingCallerNumber('');
      setIncomingCallerName('');
    }
  }, []);

  // Hold is limited in Twilio Browser SDK — stub for interface parity
  const holdAndAnswer = useCallback(() => {
    console.warn('[TwilioContext] holdAndAnswer not fully supported in Twilio browser SDK');
  }, []);

  const hangupAndResume = useCallback(() => {
    console.warn('[TwilioContext] hangupAndResume not fully supported in Twilio browser SDK');
  }, []);

  const toggleMute = useCallback(() => {
    if (primaryCallRef.current) {
      const newMuted = !primaryCallRef.current.isMuted();
      primaryCallRef.current.mute(newMuted);
      setIsMuted(newMuted);
    }
  }, []);

  const toggleHold = useCallback(() => {
    console.warn('[TwilioContext] Hold is not directly supported in Twilio browser SDK');
    // In real implementation, this would require TwiML conference or REST API
  }, []);

  const sendDTMF = useCallback((digit: string) => {
    if (primaryCallRef.current) {
      primaryCallRef.current.sendDigits(digit);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPrimaryTimer();
      if (deviceRef.current) {
        try { deviceRef.current.destroy(); } catch { /* noop */ }
      }
    };
  }, [stopPrimaryTimer]);

  const value: TwilioContextValue = {
    connectionStatus,
    initConnection,
    disconnect,
    sipConfigured,

    primaryCall,
    primaryCallState,
    primaryCallDuration,
    isMuted,
    isHeld,

    incomingCall,
    incomingCallerNumber,
    incomingCallerName,

    heldCall,
    heldCallDuration,
    heldCallerNumber,

    dial,
    hangup,
    answerIncoming,
    rejectIncoming,
    holdAndAnswer,
    hangupAndResume,
    toggleMute,
    toggleHold,
    sendDTMF,

    error,
    sipError,
    qualityMetrics,

    activeCallRoute,
    setActiveCallRoute,
  };

  return (
    <TwilioContext.Provider value={value}>
      {children}
    </TwilioContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTwilioContext(): TwilioContextValue {
  const ctx = useContext(TwilioContext);
  if (!ctx) {
    throw new Error('useTwilioContext must be used within a TwilioProvider');
  }
  return ctx;
}
