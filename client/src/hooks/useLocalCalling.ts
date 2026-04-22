import { useCallback, useRef } from 'react';

function sanitizePhoneNumber(phone: string): string {
  // Strip formatting chars but preserve leading + for international numbers
  return phone.replace(/[\s\-().]/g, '');
}

export interface UseLocalCallingReturn {
  call: (phone: string) => void;
}

export function useLocalCalling(onReturn: () => void): UseLocalCallingReturn {
  const callbackRef = useRef(onReturn);
  callbackRef.current = onReturn;

  const call = useCallback((phone: string) => {
    const sanitized = sanitizePhoneNumber(phone);
    const telUri = `tel:${sanitized}`;

    const handler = () => {
      if (document.visibilityState === 'visible') {
        document.removeEventListener('visibilitychange', handler);
        callbackRef.current();
      }
    };

    document.addEventListener('visibilitychange', handler);

    window.open(telUri, '_self');
  }, []);

  return { call };
}
