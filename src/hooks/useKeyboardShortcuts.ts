import { useEffect, useCallback, useState } from 'react';
import { useRecording } from '@/contexts/RecordingContext';
import { toast } from '@/hooks/use-toast';

/**
 * useKeyboardShortcuts - Focus-aware keyboard shortcuts for recording control
 * 
 * SIMPLIFIED SHORTCUTS (no Ctrl required):
 * - Shift+R: Start/Resume Recording
 * - Shift+P: Pause Recording
 * - Shift+X: Stop Recording
 * - Shift+S: Screenshot
 * - Shift+M: Toggle Mic
 * - Shift+C: Toggle Camera
 * 
 * IMPORTANT BROWSER LIMITATION:
 * Keyboard shortcuts ONLY work when the browser tab/window has focus.
 * When you switch to another application or browser window, these shortcuts
 * will NOT work. This is a fundamental web browser security limitation.
 * 
 * SOLUTIONS FOR BACKGROUND CONTROL:
 * 1. Media Session API - Hardware media keys work in background
 * 2. Picture-in-Picture - Floating clickable controls
 * 3. Document PiP - Interactive mini control window
 */
export const useKeyboardShortcuts = () => {
  const {
    isRecording,
    isPaused,
    settings,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    takeScreenshot,
    toggleMic,
    updateSettings,
    isUIHidden,
  } = useRecording();

  const [isTabFocused, setIsTabFocused] = useState(true);
  const [hasShownFocusWarning, setHasShownFocusWarning] = useState(false);

  // Track tab focus state
  useEffect(() => {
    const handleFocus = () => {
      setIsTabFocused(true);
    };

    const handleBlur = () => {
      setIsTabFocused(false);
      
      // Show warning once when recording and tab loses focus
      if (isRecording && !hasShownFocusWarning) {
        setHasShownFocusWarning(true);
        toast({
          title: "Tab Lost Focus",
          description: "Keyboard shortcuts won't work. Use media keys or PiP controls.",
          duration: 5000,
        });
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsTabFocused(true);
      } else {
        setIsTabFocused(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRecording, hasShownFocusWarning]);

  // Reset warning flag when recording stops
  useEffect(() => {
    if (!isRecording) {
      setHasShownFocusWarning(false);
    }
  }, [isRecording]);

  const toggleCamera = useCallback(() => {
    updateSettings({ cameraEnabled: !settings.cameraEnabled });
    toast({
      title: settings.cameraEnabled ? "Camera Disabled" : "Camera Enabled",
      description: `Shortcut: Shift+C`,
    });
  }, [settings.cameraEnabled, updateSettings]);

  const handleStartResume = useCallback(() => {
    if (!isRecording) {
      startRecording();
    } else if (isPaused) {
      resumeRecording();
      toast({
        title: "Recording Resumed",
        description: "Shortcut: Shift+R",
      });
    }
  }, [isRecording, isPaused, startRecording, resumeRecording]);

  const handlePause = useCallback(() => {
    if (isRecording && !isPaused) {
      pauseRecording();
      toast({
        title: "Recording Paused",
        description: "Shortcut: Shift+P",
      });
    }
  }, [isRecording, isPaused, pauseRecording]);

  const handleStop = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleScreenshot = useCallback(() => {
    if (isRecording) {
      takeScreenshot();
      toast({
        title: "Screenshot Taken",
        description: "Shortcut: Shift+S",
      });
    }
  }, [isRecording, takeScreenshot]);

  const handleToggleMic = useCallback(() => {
    toggleMic();
    const hasMic = settings.audioSource === 'mic' || settings.audioSource === 'both';
    toast({
      title: hasMic ? "Microphone Muted" : "Microphone Enabled",
      description: "Shortcut: Shift+M",
    });
  }, [toggleMic, settings.audioSource]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only check for Shift key, no Ctrl required
      if (!e.shiftKey) return;
      
      // Ignore if Ctrl or Alt is also pressed (to avoid conflicts with browser shortcuts)
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      
      // Ignore if typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = e.key.toUpperCase();

      switch (key) {
        case 'R':
          e.preventDefault();
          handleStartResume();
          break;
        case 'P':
          e.preventDefault();
          handlePause();
          break;
        case 'X':
          e.preventDefault();
          handleStop();
          break;
        case 'S':
          e.preventDefault();
          handleScreenshot();
          break;
        case 'M':
          e.preventDefault();
          handleToggleMic();
          break;
        case 'C':
          e.preventDefault();
          toggleCamera();
          break;
      }
    };

    // Add listener to window for global capture
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    handleStartResume,
    handlePause,
    handleStop,
    handleScreenshot,
    handleToggleMic,
    toggleCamera,
  ]);

  return {
    isTabFocused,
    shortcuts: [
      { key: 'R', description: 'Start / Resume Recording', shortcut: 'Shift+R' },
      { key: 'P', description: 'Pause Recording', shortcut: 'Shift+P' },
      { key: 'X', description: 'Stop & Save Recording', shortcut: 'Shift+X' },
      { key: 'S', description: 'Take Screenshot', shortcut: 'Shift+S' },
      { key: 'M', description: 'Toggle Microphone', shortcut: 'Shift+M' },
      { key: 'C', description: 'Toggle Camera', shortcut: 'Shift+C' },
    ],
  };
};
