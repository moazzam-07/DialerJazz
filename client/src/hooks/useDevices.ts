import { useCallback, useEffect, useState } from 'react';

export const useDevices = (video = false) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const loadDevices = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }

    try {
      // Prompt for permissions if not already granted
      await navigator.mediaDevices.getUserMedia({ audio: true, video });
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(availableDevices);
    } catch (error) {
      console.error('Failed to load audio devices', error);
      setDevices([]);
    }
  }, [video]);

  useEffect(() => {
    loadDevices();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    const handleDeviceChange = () => loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  return devices;
};
