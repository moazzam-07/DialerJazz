/**
 * TelnyxContext — Global React Context that owns the TelnyxRTC client.
 *
 * Provides multi-call management:
 *   - primaryCall: the user's current active/outbound call
 *   - incomingCall: a ringing inbound call waiting for answer/reject
 *   - heldCall: a call that was put on hold when the user answered a second call
 *
 * The SIP connection persists across all authenticated pages so incoming
 * calls can be received on Dashboard, Leads, Settings — anywhere.
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
import { TelnyxRTC, Call, SwEvent } from '@telnyx/webrtc';
import type { INotification } from '@telnyx/webrtc';
import { settingsApi, telnyxApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────
export type ConnectionStatus = 'disconnected' | 'connecting' | 'registered';
export type CallState = 'idle' | 'trying' | 'ringing' | 'active' | 'held' | 'done' | 'hangup';

export interface QualityMetrics {
  rtt: number;
  quality: string;
  jitter: number;
  mos: number;
}

export interface TelnyxContextValue {
  // Connection
  connectionStatus: ConnectionStatus;
  initConnection: () => Promise<void>;
  disconnect: () => void;
  sipConfigured: boolean;

  // Primary call (outbound or answered inbound)
  primaryCall: Call | null;
  primaryCallState: CallState;
  primaryCallDuration: number;
  isMuted: boolean;
  isHeld: boolean;

  // Incoming call (ringing inbound, not yet answered)
  incomingCall: Call | null;
  incomingCallerNumber: string;
  incomingCallerName: string;

  // Held call (first call put on hold when second was answered)
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

  // Errors
  error: string | null;
  sipError: string | null;
  qualityMetrics: QualityMetrics | null;
}

const TelnyxContext = createContext<TelnyxContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────
export function TelnyxProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const callerNumberRef = useRef<string>('');

  // Timers
  const primaryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Held call state (first call put on hold)
  const heldCallRef = useRef<Call | null>(null);
  const [heldCall, setHeldCall] = useState<Call | null>(null);
  const [heldCallDuration, setHeldCallDuration] = useState(0);
  const [heldCallerNumber, setHeldCallerNumber] = useState('');

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [sipError, setSipError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

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

  const startHeldTimer = useCallback(() => {
    if (heldTimerRef.current) clearInterval(heldTimerRef.current);
    heldTimerRef.current = setInterval(() => {
      setHeldCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopHeldTimer = useCallback(() => {
    if (heldTimerRef.current) {
      clearInterval(heldTimerRef.current);
      heldTimerRef.current = null;
    }
  }, []);

  // ── Notification handler (core routing logic) ──────────────────────
  const handleNotification = useCallback(
    (notification: INotification) => {
      if (notification.type !== 'callUpdate' || !notification.call) return;

      const call = TelnyxRTC.telnyxStateCall(notification.call);
      const state = call.state;
      const direction = call.direction;
      const callId = call.id;

      console.log(`[TelnyxContext] Notification: id=${callId}, direction=${direction}, state=${state}`);

      // ── INBOUND RINGING → track as incoming ──────────────────────
      if (direction === 'inbound' && state === 'ringing') {
        // Only track if this is a NEW incoming call (not the one we already answered)
        if (!incomingCallRef.current || incomingCallRef.current.id !== callId) {
          incomingCallRef.current = call;
          setIncomingCall(call);
          setIncomingCallerNumber(call.options?.callerNumber || call.options?.remoteCallerNumber || 'Unknown');
          setIncomingCallerName(call.options?.callerName || '');
          console.log('[TelnyxContext] Incoming call detected:', call.options?.callerNumber);
        }
        return;
      }

      // ── Incoming call that was answered → promote to primary ──────
      if (incomingCallRef.current && incomingCallRef.current.id === callId) {
        if (state === 'active') {
          // Incoming call was answered — it becomes primaryCall
          primaryCallRef.current = call;
          setPrimaryCall(call);
          setPrimaryCallState('active');
          startPrimaryTimer();
          setSipError(null);

          // Clear incoming state
          incomingCallRef.current = null;
          setIncomingCall(null);
          setIncomingCallerNumber('');
          setIncomingCallerName('');
          return;
        }

        if (['done', 'hangup', 'destroy'].includes(state)) {
          // Incoming was rejected or caller hung up before answer
          incomingCallRef.current = null;
          setIncomingCall(null);
          setIncomingCallerNumber('');
          setIncomingCallerName('');
          return;
        }

        // Other incoming states (trying etc) — just update ref
        return;
      }

      // ── Held call updates ────────────────────────────────────────
      if (heldCallRef.current && heldCallRef.current.id === callId) {
        if (state === 'active') {
          // Held call was resumed — it becomes primaryCall again
          heldCallRef.current = null;
          setHeldCall(null);
          setHeldCallerNumber('');
          stopHeldTimer();

          primaryCallRef.current = call;
          setPrimaryCall(call);
          setPrimaryCallState('active');
          setIsHeld(false);
          return;
        }

        if (['done', 'hangup', 'destroy'].includes(state)) {
          // Held call was hung up by remote party
          heldCallRef.current = null;
          setHeldCall(null);
          setHeldCallerNumber('');
          stopHeldTimer();
          setHeldCallDuration(0);
          return;
        }

        return;
      }

      // ── Primary call updates ─────────────────────────────────────
      if (['trying', 'requesting'].includes(state)) {
        primaryCallRef.current = call;
        setPrimaryCall(call);
        setPrimaryCallState('trying');
      } else if (state === 'ringing' && direction === 'outbound') {
        primaryCallRef.current = call;
        setPrimaryCall(call);
        setPrimaryCallState('ringing');
      } else if (state === 'active') {
        primaryCallRef.current = call;
        setPrimaryCall(call);
        setPrimaryCallState('active');
        setIsHeld(false);
        if (primaryCallState !== 'active') startPrimaryTimer();
        setSipError(null);
      } else if (state === 'held') {
        setPrimaryCallState('held');
        setIsHeld(true);
      } else if (['done', 'hangup', 'destroy'].includes(state)) {
        // Primary call ended
        stopPrimaryTimer();
        primaryCallRef.current = null;
        setPrimaryCall(null);
        setPrimaryCallState('done');
        setQualityMetrics(null);
        setIsMuted(false);
        setIsHeld(false);

        if (call.sipReason) {
          setSipError(`Call Failed: ${call.sipReason}`);
        } else if (call.cause) {
          setSipError(`Call Failed: ${call.cause}`);
        }
      }
    },
    [primaryCallState, startPrimaryTimer, stopPrimaryTimer, stopHeldTimer]
  );

  // ── Connect to Telnyx ──────────────────────────────────────────────
  const setupClient = useCallback(
    (client: TelnyxRTC) => {
      client.on('telnyx.socket.open', () => {
        console.log('[TelnyxContext] Socket connected');
      });

      client.on('telnyx.socket.error', (err: unknown) => {
        console.error('[TelnyxContext] Socket error:', err);
        setSipError(`Socket error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      });

      client.on('telnyx.ready', () => {
        setConnectionStatus('registered');
        setError(null);
        console.log('[TelnyxContext] Registered successfully');
      });

      client.on('telnyx.error', (err: unknown) => {
        setConnectionStatus('disconnected');
        const msg = err instanceof Error ? err.message : 'Telnyx connection error';
        setError(msg);
        console.error('[TelnyxContext] Telnyx error:', msg);
      });

      client.on('telnyx.socket.close', () => {
        setConnectionStatus('disconnected');
        console.log('[TelnyxContext] Socket closed');
      });

      client.on(SwEvent.StatsFrame, (frame: QualityMetrics) => {
        setQualityMetrics(frame);
      });

      client.on('telnyx.notification', handleNotification);

      client.connect();
      clientRef.current = client;
    },
    [handleNotification]
  );

  const initConnection = useCallback(async () => {
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch { /* noop */ }
    }

    setConnectionStatus('connecting');
    setError(null);

    try {
      const settingsRes = await settingsApi.get();
      const settings = settingsRes.data;

      if (!settings?.telnyx_sip_login && !settings?.telnyx_api_key) {
        setSipConfigured(false);
        setConnectionStatus('disconnected');
        return;
      }

      setSipConfigured(true);
      if (settings.telnyx_caller_number) {
        callerNumberRef.current = settings.telnyx_caller_number;
      }

      const isProduction = import.meta.env.PROD || !import.meta.env.DEV;
      const rtcHost = isProduction ? 'wss://rtc.telnyx.com' : 'wss://rtcdev.telnyx.com';
      const env = isProduction ? 'production' : 'development';

      // Try JWT token first (secure)
      try {
        const tokenRes = await telnyxApi.getToken();
        if (tokenRes.data?.token) {
          const client = new TelnyxRTC({
            login_token: tokenRes.data.token,
            host: rtcHost,
            env: env as 'production' | 'development',
            ringtoneFile: '/ringtone.mp3',
            ringbackFile: '/ringback.mp3',
          } as any);
          setupClient(client);
          return;
        }
      } catch {
        console.warn('[TelnyxContext] JWT token fetch failed, falling back to SIP credentials');
      }

      // Fallback: raw SIP login/password
      if (settings?.telnyx_sip_login && settings?.telnyx_sip_password) {
        const client = new TelnyxRTC({
          login: settings.telnyx_sip_login,
          password: settings.telnyx_sip_password,
          host: rtcHost,
          env: env as 'production' | 'development',
          ringtoneFile: '/ringtone.mp3',
          ringbackFile: '/ringback.mp3',
        } as any);
        setupClient(client);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Telnyx';
      setError(message);
      setConnectionStatus('disconnected');
    }
  }, [setupClient]);

  const disconnect = useCallback(() => {
    stopPrimaryTimer();
    stopHeldTimer();
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch { /* noop */ }
      clientRef.current = null;
    }
    setConnectionStatus('disconnected');
    setPrimaryCallState('idle');
    setPrimaryCall(null);
    primaryCallRef.current = null;
    setIncomingCall(null);
    incomingCallRef.current = null;
    setHeldCall(null);
    heldCallRef.current = null;
    setQualityMetrics(null);
    setSipError(null);
    setIsMuted(false);
    setIsHeld(false);
  }, [stopPrimaryTimer, stopHeldTimer]);

  // ── Call actions ───────────────────────────────────────────────────
  const dial = useCallback(
    (destinationNumber: string, callerNumber?: string) => {
      const client = clientRef.current;
      if (!client) { setError('Telnyx client not initialized.'); return; }
      if (connectionStatus !== 'registered') { setError('Telnyx not registered yet.'); return; }
      if (primaryCallRef.current) { setError('A call is already in progress.'); return; }

      setError(null);
      setSipError(null);
      setPrimaryCallState('trying');
      setIsMuted(false);
      setIsHeld(false);
      setPrimaryCallDuration(0);

      client.newCall({
        destinationNumber,
        callerNumber: callerNumber || callerNumberRef.current || '',
        callerName: 'Jazz Caller',
      });
    },
    [connectionStatus]
  );

  const hangup = useCallback(() => {
    if (primaryCallRef.current) {
      primaryCallRef.current.hangup();
    }
    stopPrimaryTimer();
    setPrimaryCallState('done');
    primaryCallRef.current = null;
    setPrimaryCall(null);
    setQualityMetrics(null);
    setIsMuted(false);
    setIsHeld(false);
  }, [stopPrimaryTimer]);

  const answerIncoming = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.answer();
      // State transition handled by notification handler
    }
  }, []);

  const rejectIncoming = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.hangup();
      incomingCallRef.current = null;
      setIncomingCall(null);
      setIncomingCallerNumber('');
      setIncomingCallerName('');
    }
  }, []);

  const holdAndAnswer = useCallback(() => {
    // Put current primary call on hold, then answer the incoming call
    if (!primaryCallRef.current || !incomingCallRef.current) return;

    // Save primary call duration before holding
    const savedDuration = primaryCallDuration;

    // Hold the primary call
    primaryCallRef.current.hold();
    heldCallRef.current = primaryCallRef.current;
    setHeldCall(primaryCallRef.current);
    setHeldCallerNumber(
      primaryCallRef.current.options?.remoteCallerNumber ||
      primaryCallRef.current.options?.destinationNumber ||
      'Unknown'
    );
    setHeldCallDuration(savedDuration);
    startHeldTimer();

    // Clear primary
    stopPrimaryTimer();
    primaryCallRef.current = null;
    setPrimaryCall(null);
    setPrimaryCallState('idle');

    // Answer the incoming call (notification handler will promote it to primary)
    incomingCallRef.current.answer();
  }, [primaryCallDuration, startHeldTimer, stopPrimaryTimer]);

  const hangupAndResume = useCallback(() => {
    // Hang up current primary call, then resume the held call
    if (primaryCallRef.current) {
      primaryCallRef.current.hangup();
      stopPrimaryTimer();
      primaryCallRef.current = null;
      setPrimaryCall(null);
    }

    if (heldCallRef.current) {
      heldCallRef.current.unhold();
      // Notification handler will promote the held call to primary when it goes 'active'
    }
  }, [stopPrimaryTimer]);

  const toggleMute = useCallback(() => {
    if (primaryCallRef.current) {
      primaryCallRef.current.toggleAudioMute();
      setIsMuted(primaryCallRef.current.isAudioMuted);
    }
  }, []);

  const toggleHold = useCallback(() => {
    if (primaryCallRef.current) {
      if (isHeld) {
        primaryCallRef.current.unhold();
      } else {
        primaryCallRef.current.hold();
      }
      setIsHeld(!isHeld);
    }
  }, [isHeld]);

  const sendDTMF = useCallback((digit: string) => {
    if (primaryCallRef.current) {
      primaryCallRef.current.dtmf(digit);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPrimaryTimer();
      stopHeldTimer();
      if (clientRef.current) {
        try { clientRef.current.disconnect(); } catch { /* noop */ }
      }
    };
  }, [stopPrimaryTimer, stopHeldTimer]);

  const value: TelnyxContextValue = {
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
  };

  return (
    <TelnyxContext.Provider value={value}>
      {children}
    </TelnyxContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTelnyxContext(): TelnyxContextValue {
  const ctx = useContext(TelnyxContext);
  if (!ctx) {
    throw new Error('useTelnyxContext must be used within a TelnyxProvider');
  }
  return ctx;
}
