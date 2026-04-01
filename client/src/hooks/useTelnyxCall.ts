/**
 * useTelnyxCall — React hook wrapping the Telnyx WebRTC SDK.
 *
 * Based on patterns from: https://github.com/team-telnyx/webrtc-demo-js
 *
 * Provides:
 *   - connect(login, password) → registers with Telnyx SIP
 *   - dial(destinationNumber, callerNumber?) → initiates outbound call
 *   - hangup() → ends the active call
 *   - toggleMute() → mute/unmute microphone
 *   - sendDTMF(digit) → send DTMF tones for IVR navigation
 *   - connectionStatus: 'disconnected' | 'connecting' | 'registered'
 *   - callState: 'idle' | 'trying' | 'ringing' | 'active' | 'done' | 'hangup'
 *   - isMuted, callDuration (seconds), activeCall reference
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { TelnyxRTC, Call, SwEvent } from '@telnyx/webrtc';
import type { INotification } from '@telnyx/webrtc';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'registered';
export type CallState = 'idle' | 'trying' | 'ringing' | 'active' | 'held' | 'done' | 'hangup';

export interface QualityMetrics {
  rtt: number;
  quality: string;
  jitter: number;
  mos: number;
}

export interface UseTelnyxCallReturn {
  // Actions
  connect: (login: string, password: string, callerNumber?: string) => void;
  connectWithToken: (token: string, callerNumber?: string) => void;
  disconnect: () => void;
  dial: (destinationNumber: string, callerNumber?: string) => void;
  hangup: () => void;
  answer: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDTMF: (digit: string) => void;
  setAudioInput: (deviceId: string) => Promise<void>;

  // State
  connectionStatus: ConnectionStatus;
  callState: CallState;
  isMuted: boolean;
  isHeld: boolean;
  callDuration: number;
  activeCall: Call | null;
  error: string | null;
  sipError: string | null;
  qualityMetrics: QualityMetrics | null;
}

export function useTelnyxCall(): UseTelnyxCallReturn {
  const clientRef = useRef<TelnyxRTC | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callerNumberRef = useRef<string>('');

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sipError, setSipError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  // Start the call duration timer
  const startTimer = useCallback(() => {
    stopTimer();
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Connect to Telnyx ──────────────────────────────
  const connect = useCallback((login: string, password: string, callerNumber?: string) => {
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch { /* noop */ }
    }

    if (callerNumber) callerNumberRef.current = callerNumber;
    setError(null);
    setConnectionStatus('connecting');

    // Determine environment - use production RTC server for prod
    const isProduction = import.meta.env.PROD || !import.meta.env.DEV;
    const rtcHost = isProduction ? 'wss://rtc.telnyx.com' : 'wss://rtcdev.telnyx.com';
    const env = isProduction ? 'production' : 'development';

    console.log('[useTelnyxCall] Connecting with:', { login, host: rtcHost, env });

    const client = new TelnyxRTC({
      login,
      password,
      host: rtcHost,
      env: env as 'production' | 'development',
      ringtoneFile: '/ringtone.mp3',
      ringbackFile: '/ringback.mp3'
    } as any);

    // Socket event handlers for better debugging
    client.on('telnyx.socket.open', () => {
      console.log('[useTelnyxCall] Socket connected');
    });

    client.on('telnyx.socket.error', (err: unknown) => {
      console.error('[useTelnyxCall] Socket error:', err);
      setSipError(`Socket error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });

    client.on('telnyx.ready', () => {
      setConnectionStatus('registered');
      setError(null);
      console.log('[useTelnyxCall] Registered successfully');
    });

    client.on('telnyx.error', (err: unknown) => {
      setConnectionStatus('disconnected');
      const msg = err instanceof Error ? err.message : 'Telnyx connection error';
      setError(msg);
      console.error('[useTelnyxCall] Telnyx error:', msg);
    });

    client.on('telnyx.socket.close', () => {
      setConnectionStatus('disconnected');
      console.log('[useTelnyxCall] Socket closed');
    });

    client.on(SwEvent.StatsFrame, (frame: QualityMetrics) => {
      setQualityMetrics(frame);
    });

    client.on('telnyx.notification', (notification: INotification) => {
      if (notification.type !== 'callUpdate' || !notification.call) return;

      const call = TelnyxRTC.telnyxStateCall(notification.call);
      const state = call.state;

      // Always update call instance for early manipulation (ringing, etc)
      activeCallRef.current = call;
      setActiveCall(call);

      if (['trying', 'requesting'].includes(state)) {
        setCallState('trying');
      } else if (state === 'ringing') {
        setCallState('ringing');
      } else if (state === 'active') {
        setCallState('active');
        setIsHeld(false);
        if (callState !== 'active') startTimer();
        setSipError(null);
      } else if (state === 'held') {
        setCallState('held');
        setIsHeld(true);
      } else if (['done', 'hangup', 'destroy'].includes(state)) {
        setCallState('done');
        stopTimer();
        activeCallRef.current = null;
        setActiveCall(null);
        setQualityMetrics(null);
        setIsMuted(false);
        setIsHeld(false);

        if (call.sipReason) {
            setSipError(`Call Failed: ${call.sipReason}`);
        } else if (call.cause) {
            setSipError(`Call Failed: ${call.cause}`);
        }
      }
    });

    client.connect();
    clientRef.current = client;
  }, [startTimer, stopTimer, callState]);

  // ── Connect with JWT Token (Secure) ────────────────
  const connectWithToken = useCallback((token: string, callerNumber?: string) => {
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch { /* noop */ }
    }

    if (callerNumber) callerNumberRef.current = callerNumber;
    setError(null);
    setConnectionStatus('connecting');

    // Determine environment - use production RTC server for prod
    const isProduction = import.meta.env.PROD || !import.meta.env.DEV;
    const rtcHost = isProduction ? 'wss://rtc.telnyx.com' : 'wss://rtcdev.telnyx.com';
    const env = isProduction ? 'production' : 'development';

    console.log('[useTelnyxCall] Connecting with token, host:', rtcHost, 'env:', env);

    const client = new TelnyxRTC({
      login_token: token,
      host: rtcHost,
      env: env as 'production' | 'development',
      ringtoneFile: '/ringtone.mp3',
      ringbackFile: '/ringback.mp3'
    } as any);

    // Socket event handlers
    client.on('telnyx.socket.open', () => {
      console.log('[useTelnyxCall] Socket connected (token mode)');
    });

    client.on('telnyx.socket.error', (err: unknown) => {
      console.error('[useTelnyxCall] Socket error:', err);
      setSipError(`Socket error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });

    client.on('telnyx.ready', () => {
      setConnectionStatus('registered');
      setError(null);
      console.log('[useTelnyxCall] Registered successfully (token mode)');
    });

    client.on('telnyx.error', (err: unknown) => {
      setConnectionStatus('disconnected');
      const msg = err instanceof Error ? err.message : 'Telnyx connection error';
      setError(msg);
      console.error('[useTelnyxCall] Telnyx error:', msg);
    });

    client.on('telnyx.socket.close', () => {
      setConnectionStatus('disconnected');
      console.log('[useTelnyxCall] Socket closed (token mode)');
    });

    client.on(SwEvent.StatsFrame, (frame: QualityMetrics) => {
      setQualityMetrics(frame);
    });

    client.on('telnyx.notification', (notification: INotification) => {
      if (notification.type !== 'callUpdate' || !notification.call) return;

      const call = TelnyxRTC.telnyxStateCall(notification.call);
      const state = call.state;

      activeCallRef.current = call;
      setActiveCall(call);

      if (['trying', 'requesting'].includes(state)) {
        setCallState('trying');
      } else if (state === 'ringing') {
        setCallState('ringing');
      } else if (state === 'active') {
        setCallState('active');
        setIsHeld(false);
        if (callState !== 'active') startTimer();
        setSipError(null);
      } else if (state === 'held') {
        setCallState('held');
        setIsHeld(true);
      } else if (['done', 'hangup', 'destroy'].includes(state)) {
        setCallState('done');
        stopTimer();
        activeCallRef.current = null;
        setActiveCall(null);
        setQualityMetrics(null);
        setIsMuted(false);
        setIsHeld(false);

        if (call.sipReason) {
            setSipError(`Call Failed: ${call.sipReason}`);
        } else if (call.cause) {
            setSipError(`Call Failed: ${call.cause}`);
        }
      }
    });

    client.connect();
    clientRef.current = client;
  }, [startTimer, stopTimer, callState]);

  const disconnect = useCallback(() => {
    stopTimer();
    if (clientRef.current) {
      try { clientRef.current.disconnect(); } catch { /* noop */ }
      clientRef.current = null;
    }
    setConnectionStatus('disconnected');
    setCallState('idle');
    setActiveCall(null);
    activeCallRef.current = null;
    setQualityMetrics(null);
    setSipError(null);
    setIsMuted(false);
    setIsHeld(false);
  }, [stopTimer]);

  const dial = useCallback((destinationNumber: string, callerNumber?: string) => {
    const client = clientRef.current;
    if (!client) {
      setError('Telnyx client not initialized. Connect first.');
      return;
    }
    if (connectionStatus !== 'registered') {
      setError('Telnyx not registered yet. Wait for connection.');
      return;
    }
    if (activeCallRef.current) {
      setError('A call is already in progress.');
      return;
    }

    setError(null);
    setSipError(null);
    setCallState('trying');
    setIsMuted(false);
    setIsHeld(false);
    setCallDuration(0);

    client.newCall({
      destinationNumber,
      callerNumber: callerNumber || callerNumberRef.current || '',
      callerName: 'Jazz Caller',
    });
  }, [connectionStatus]);

  const hangup = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.hangup();
    }
    stopTimer();
    setCallState('done');
    activeCallRef.current = null;
    setActiveCall(null);
    setQualityMetrics(null);
    setIsMuted(false);
    setIsHeld(false);
  }, [stopTimer]);

  const answer = useCallback(() => {
    if (activeCallRef.current && activeCallRef.current.state === 'ringing') {
      activeCallRef.current.answer();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.toggleAudioMute();
      setIsMuted(activeCallRef.current.isAudioMuted);
    }
  }, []);

  const toggleHold = useCallback(() => {
    if (activeCallRef.current) {
      if (isHeld) {
        activeCallRef.current.unhold();
      } else {
        activeCallRef.current.hold();
      }
      setIsHeld(!isHeld);
    }
  }, [isHeld]);


  const sendDTMF = useCallback((digit: string) => {
    if (activeCallRef.current) {
      activeCallRef.current.dtmf(digit);
    }
  }, []);

  const setAudioInput = useCallback(async (deviceId: string) => {
    if (activeCallRef.current) {
        try {
            await activeCallRef.current.setAudioInDevice(deviceId, isMuted);
            setIsMuted(activeCallRef.current.isAudioMuted);
        } catch (error) {
            console.error('Failed to swap microphone', error);
            throw error;
        }
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (clientRef.current) {
        try { clientRef.current.disconnect(); } catch { /* noop */ }
      }
    };
  }, [stopTimer]);

  return {
    connect,
    connectWithToken,
    disconnect,
    dial,
    hangup,
    answer,
    toggleMute,
    sendDTMF,
    setAudioInput,
    connectionStatus,
    callState,
    isMuted,
    callDuration,
    activeCall,
    error,
    sipError,
    qualityMetrics,
    toggleHold,
    isHeld,
  };
}
