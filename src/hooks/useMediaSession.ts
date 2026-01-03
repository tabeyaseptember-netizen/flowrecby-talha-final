import { useEffect, useCallback } from 'react';

/**
 * useMediaSession - Media Session API for background recording control
 * 
 * This hook integrates with the browser's Media Session API to enable:
 * - Hardware media key controls (play/pause on keyboards)
 * - OS media overlay controls (Windows/Mac media overlays)
 * - Works even when tab is in background or user is on another site
 * 
 * This is the web platform's standard solution for background media control.
 */
export const useMediaSession = ({
  isRecording,
  isPaused,
  duration,
  onPause,
  onResume,
  onStop,
}: {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) => {
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Setup Media Session handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported in this browser');
      return;
    }

    if (!isRecording) {
      // Clear media session when not recording
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    // Set metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: isPaused ? 'Recording Paused' : 'Recording in Progress',
      artist: `Duration: ${formatTime(duration)}`,
      album: 'Screen Recorder',
      artwork: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    // Set playback state
    navigator.mediaSession.playbackState = isPaused ? 'paused' : 'playing';

    // Register action handlers
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (isPaused) {
          onResume();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (!isPaused) {
          onPause();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        onStop();
      });

      // Note: Other actions like 'seekbackward', 'seekforward' aren't applicable for live recording
    } catch (err) {
      console.warn('Some Media Session actions not supported:', err);
    }

    return () => {
      // Cleanup handlers when recording stops
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, [isRecording, isPaused, duration, formatTime, onPause, onResume, onStop]);

  // Update position state for media controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !isRecording) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Infinity, // Live recording
        playbackRate: isPaused ? 0 : 1,
        position: duration,
      });
    } catch {
      // Position state not supported in all browsers
    }
  }, [isRecording, isPaused, duration]);
};
