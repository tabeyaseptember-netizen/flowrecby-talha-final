import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Pause, Play, Square, Mic, MicOff, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPiPControllerProps {
  duration: number;
  isPaused: boolean;
  isMicOn: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  onScreenshot: () => void;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * PiP Control Panel - The actual UI rendered inside the Document PiP window
 */
const PiPControlPanel = ({
  duration,
  isPaused,
  isMicOn,
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onScreenshot,
  onClose,
}: DocumentPiPControllerProps) => {
  return (
    <div className="w-full h-full bg-[#1a1a2e] text-white flex flex-col select-none">
      {/* Header with timer */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#16213e] to-[#0f3460]">
        <div className="flex items-center gap-3">
          {/* Recording indicator */}
          <div className="relative">
            <div 
              className={cn(
                "w-3 h-3 rounded-full",
                isPaused ? "bg-yellow-500" : "bg-red-500"
              )}
            />
            {!isPaused && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          
          {/* Timer */}
          <span className="font-mono text-2xl font-bold tracking-wider">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Status */}
        <span className={cn(
          "text-sm font-medium px-2 py-0.5 rounded",
          isPaused ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
        )}>
          {isPaused ? 'PAUSED' : 'REC'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center justify-center gap-3 px-4 py-3">
        {/* Pause/Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            "hover:scale-105 active:scale-95",
            isPaused 
              ? "bg-green-500/20 border-2 border-green-500 text-green-400" 
              : "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400"
          )}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/20 border-2 border-red-500 text-red-400 hover:scale-105 active:scale-95 transition-all"
          title="Stop Recording"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>

        {/* Screenshot */}
        <button
          onClick={onScreenshot}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/20 border-2 border-blue-500 text-blue-400 hover:scale-105 active:scale-95 transition-all"
          title="Screenshot"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95",
            isMicOn 
              ? "bg-green-500/20 border-2 border-green-500 text-green-400" 
              : "bg-gray-500/20 border-2 border-gray-500 text-gray-400"
          )}
          title={isMicOn ? "Mute Mic" : "Unmute Mic"}
        >
          {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 text-center text-xs text-gray-500 border-t border-gray-700">
        This window stays visible across apps
      </div>
    </div>
  );
};

/**
 * DocumentPiPController - Uses Document Picture-in-Picture API
 * 
 * The Document PiP API allows creating an always-on-top mini window
 * with FULLY INTERACTIVE HTML content. Unlike video PiP, users can
 * click buttons and interact with the controls even when on other apps.
 * 
 * Browser Support:
 * - Chrome 116+ (full support)
 * - Edge 116+ (full support)
 * - Safari/Firefox: Falls back to regular PiP or floating controls
 */
export const DocumentPiPController = ({
  duration,
  isPaused,
  isMicOn,
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onScreenshot,
  onClose,
}: DocumentPiPControllerProps) => {
  const pipWindowRef = useRef<Window | null>(null);
  const rootRef = useRef<Root | null>(null);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const [isPipOpen, setIsPipOpen] = useState(false);

  // Check for Document PiP support
  useEffect(() => {
    // @ts-ignore - Document PiP is a new API
    const supported = 'documentPictureInPicture' in window;
    setIsPipSupported(supported);
    
    if (!supported) {
      console.log('Document PiP not supported. Using fallback controls.');
    }
  }, []);

  // Open Document PiP window
  const openPiP = useCallback(async () => {
    if (!isPipSupported) return;

    try {
      // @ts-ignore - Document PiP API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 160,
      });

      pipWindowRef.current = pipWindow;
      setIsPipOpen(true);

      // Copy styles to PiP window
      const styleSheets = document.querySelectorAll('link[rel="stylesheet"], style');
      styleSheets.forEach((styleSheet) => {
        pipWindow.document.head.appendChild(styleSheet.cloneNode(true));
      });

      // Add base styles
      const baseStyle = pipWindow.document.createElement('style');
      baseStyle.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `;
      pipWindow.document.head.appendChild(baseStyle);

      // Create container and mount React
      const container = pipWindow.document.createElement('div');
      container.id = 'pip-root';
      container.style.width = '100%';
      container.style.height = '100%';
      pipWindow.document.body.appendChild(container);

      // Mount React component
      rootRef.current = createRoot(container);

      // Handle PiP window close
      pipWindow.addEventListener('pagehide', () => {
        setIsPipOpen(false);
        pipWindowRef.current = null;
        rootRef.current = null;
      });

    } catch (err) {
      console.error('Failed to open Document PiP:', err);
    }
  }, [isPipSupported]);

  // Update PiP content when state changes
  useEffect(() => {
    if (!rootRef.current || !isPipOpen) return;

    rootRef.current.render(
      <PiPControlPanel
        duration={duration}
        isPaused={isPaused}
        isMicOn={isMicOn}
        onPause={onPause}
        onResume={onResume}
        onStop={() => {
          onStop();
          closePiP();
        }}
        onToggleMic={onToggleMic}
        onScreenshot={onScreenshot}
        onClose={closePiP}
      />
    );
  }, [duration, isPaused, isMicOn, isPipOpen, onPause, onResume, onStop, onToggleMic, onScreenshot]);

  // Auto-open PiP on mount if supported (with retry)
  useEffect(() => {
    if (!isPipSupported || isPipOpen) return;

    let attempts = 0;
    const maxAttempts = 3;
    
    const tryOpenPiP = async () => {
      try {
        await openPiP();
        console.log('Document PiP opened successfully');
      } catch (err) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Document PiP open failed, retrying... (${attempts}/${maxAttempts})`);
          setTimeout(tryOpenPiP, 1000);
        } else {
          console.log('Document PiP not available after retries. Use the PiP button manually.');
        }
      }
    };

    // First attempt after 500ms
    const timer = setTimeout(tryOpenPiP, 500);
    return () => clearTimeout(timer);
  }, [isPipSupported, openPiP, isPipOpen]);

  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      rootRef.current = null;
      setIsPipOpen(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePiP();
    };
  }, [closePiP]);

  // Return status for parent components
  return {
    isPipSupported,
    isPipOpen,
    openPiP,
    closePiP,
  };
};

// Export a hook version for easier use
export const useDocumentPiP = (props: DocumentPiPControllerProps) => {
  return DocumentPiPController(props);
};
