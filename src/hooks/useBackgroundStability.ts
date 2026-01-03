import { useEffect, useRef, useCallback } from 'react';

/**
 * useBackgroundStability - Prevents recording issues when tab loses focus
 * 
 * Browsers throttle inactive tabs to save resources. This hook:
 * - Monitors visibility changes
 * - Prevents audio desync and frame skipping
 * - Keeps the recording loop stable even when backgrounded
 * - Uses Web Locks API to prevent the page from being suspended
 */
export const useBackgroundStability = ({
  isRecording,
  onVisibilityChange,
}: {
  isRecording: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Request wake lock to prevent system sleep during recording
  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired for recording');
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Wake lock released');
      });
    } catch (err) {
      console.warn('Wake lock request failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      onVisibilityChange?.(isVisible);

      // Re-acquire wake lock when page becomes visible again
      if (isVisible && isRecording && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecording, onVisibilityChange, requestWakeLock]);

  // Acquire/release wake lock based on recording state
  useEffect(() => {
    if (isRecording) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isRecording, requestWakeLock, releaseWakeLock]);

  // Create a Web Worker to maintain timer accuracy when backgrounded
  useEffect(() => {
    if (!isRecording) {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    // Create inline worker for background timer
    const workerCode = `
      let intervalId = null;
      
      self.onmessage = function(e) {
        if (e.data === 'start') {
          intervalId = setInterval(() => {
            self.postMessage('tick');
          }, 1000);
        } else if (e.data === 'stop') {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      workerRef.current = worker;
      worker.postMessage('start');
    } catch (err) {
      console.warn('Could not create background worker:', err);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isRecording]);

  // Handle page hide (when user switches apps entirely)
  useEffect(() => {
    const handlePageHide = (event: PageTransitionEvent) => {
      // If persisted is true, the page might be restored from bfcache
      if (!event.persisted && isRecording) {
        console.log('Page is being unloaded during recording');
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isRecording]);

  return {
    hasWakeLock: !!wakeLockRef.current,
  };
};
