import { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';

interface DocumentPiPControllerProps {
  duration: number;
  isPaused: boolean;
  isMicOn: boolean;
  isDrawingMode?: boolean;
  isZoomMode?: boolean;
  isCanvasOpen?: boolean;
  drawingColor?: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleMic: () => void;
  onScreenshot: () => void;
  onClose: () => void;
  onToggleDrawing?: () => void;
  onToggleZoom?: () => void;
  onToggleCanvas?: () => void;
  onChangeDrawingColor?: (color: string) => void;
  onClearDrawings?: () => void;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Inline styles for offline support - no external CSS dependencies
const styles = {
  container: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    userSelect: 'none' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    background: 'linear-gradient(90deg, #0f3460 0%, #16213e 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  timerSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  recordingDot: (isPaused: boolean) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: isPaused ? '#eab308' : '#ef4444',
    boxShadow: isPaused ? 'none' : '0 0 6px #ef4444',
    animation: isPaused ? 'none' : 'pulse 1.5s infinite',
  }),
  timer: {
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  status: (isPaused: boolean) => ({
    fontSize: '7px',
    fontWeight: '600',
    padding: '1px 4px',
    borderRadius: '3px',
    background: isPaused ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
    color: isPaused ? '#fbbf24' : '#f87171',
  }),
  controls: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    padding: '4px 6px',
    flexWrap: 'wrap' as const,
  },
  button: (color: string, isActive: boolean = true) => ({
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${color}`,
    background: isActive ? `${color}30` : `${color}15`,
    color: isActive ? color : '#6b7280',
    cursor: 'pointer',
    transition: 'transform 0.15s, background 0.15s',
  }),
  buttonIcon: {
    width: '12px',
    height: '12px',
  },
  colorDot: (color: string) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    border: '1px solid rgba(255,255,255,0.5)',
  }),
  footer: {
    padding: '2px 6px',
    textAlign: 'center' as const,
    fontSize: '7px',
    color: '#6b7280',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  divider: {
    width: '1px',
    height: '18px',
    background: 'rgba(255,255,255,0.15)',
    margin: '0 2px',
  },
};

// SVG Icons as inline components for offline support
const PauseIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5,3 19,12 5,21" fill="currentColor" />
  </svg>
);

const StopIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

const CameraIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const MicIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const PencilIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

const SpotlightIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const TrashIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CanvasIcon = () => (
  <svg style={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

// Available drawing colors
const DRAWING_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff'];

/**
 * PiP Control Panel - Compact UI rendered inside the Document PiP window
 * Uses inline styles for complete offline support
 */
const PiPControlPanel = ({
  duration,
  isPaused,
  isMicOn,
  isDrawingMode = false,
  isZoomMode = false,
  isCanvasOpen = false,
  drawingColor = '#ef4444',
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onScreenshot,
  onToggleDrawing,
  onToggleZoom,
  onToggleCanvas,
  onChangeDrawingColor,
  onClearDrawings,
}: DocumentPiPControllerProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div style={styles.container}>
      {/* Inline keyframe animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        button:hover { transform: scale(1.08); }
        button:active { transform: scale(0.95); }
      `}</style>

      {/* Compact Header with timer */}
      <div style={styles.header}>
        <div style={styles.timerSection}>
          <div style={styles.recordingDot(isPaused)} />
          <span style={styles.timer}>{formatDuration(duration)}</span>
        </div>
        <span style={styles.status(isPaused)}>
          {isPaused ? 'PAUSED' : 'REC'}
        </span>
      </div>

      {/* Compact Controls */}
      <div style={styles.controls}>
        {/* Pause/Resume */}
        <button
          onClick={isPaused ? onResume : onPause}
          style={styles.button(isPaused ? '#22c55e' : '#eab308', true)}
          title={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>

        {/* Stop */}
        <button
          onClick={onStop}
          style={styles.button('#ef4444', true)}
          title="Stop"
        >
          <StopIcon />
        </button>

        {/* Screenshot */}
        <button
          onClick={onScreenshot}
          style={styles.button('#3b82f6', true)}
          title="Screenshot"
        >
          <CameraIcon />
        </button>

        {/* Mic Toggle */}
        <button
          onClick={onToggleMic}
          style={styles.button(isMicOn ? '#22c55e' : '#6b7280', isMicOn)}
          title={isMicOn ? "Mute" : "Unmute"}
        >
          {isMicOn ? <MicIcon /> : <MicOffIcon />}
        </button>

        <div style={styles.divider} />

        {/* Drawing Tool */}
        {onToggleDrawing && (
          <button
            onClick={onToggleDrawing}
            style={styles.button('#8b5cf6', isDrawingMode)}
            title="Draw/Annotate"
          >
            <PencilIcon />
          </button>
        )}

        {/* Color Picker (when drawing mode is active) */}
        {isDrawingMode && onChangeDrawingColor && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{
                ...styles.button('#ffffff', true),
                padding: '2px',
              }}
              title="Change Color"
            >
              <div style={styles.colorDot(drawingColor)} />
            </button>
            
            {/* Color picker dropdown */}
            {showColorPicker && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '4px',
                display: 'flex',
                gap: '3px',
                padding: '4px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {DRAWING_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      onChangeDrawingColor(color);
                      setShowColorPicker(false);
                    }}
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: color,
                      border: color === drawingColor ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clear Drawings */}
        {isDrawingMode && onClearDrawings && (
          <button
            onClick={onClearDrawings}
            style={styles.button('#6b7280', true)}
            title="Clear All"
          >
            <TrashIcon />
          </button>
        )}

        {/* Spotlight/Zoom Tool */}
        {onToggleZoom && (
          <button
            onClick={onToggleZoom}
            style={styles.button('#f97316', isZoomMode)}
            title="Spotlight"
          >
            <SpotlightIcon />
          </button>
        )}

        <div style={styles.divider} />

        {/* Canvas Popup Tool */}
        {onToggleCanvas && (
          <button
            onClick={onToggleCanvas}
            style={styles.button('#06b6d4', isCanvasOpen)}
            title="Open Canvas"
          >
            <CanvasIcon />
          </button>
        )}
      </div>

      {/* Compact Footer */}
      <div style={styles.footer}>
        {isCanvasOpen ? 'Canvas open • Draw or add text' :
         isDrawingMode ? 'Draw on screen • ESC to clear' : 
         isZoomMode ? 'Click to spotlight' : 'Tools ready'}
      </div>
    </div>
  );
};

/**
 * DocumentPiPController - Uses Document Picture-in-Picture API
 * Compact size with full offline styling support
 */
export const DocumentPiPController = ({
  duration,
  isPaused,
  isMicOn,
  isDrawingMode = false,
  isZoomMode = false,
  isCanvasOpen = false,
  drawingColor = '#ef4444',
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onScreenshot,
  onClose,
  onToggleDrawing,
  onToggleZoom,
  onToggleCanvas,
  onChangeDrawingColor,
  onClearDrawings,
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

  // Open Document PiP window - COMPACT SIZE
  const openPiP = useCallback(async () => {
    if (!isPipSupported) return;

    try {
      // @ts-ignore - Document PiP API
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 260,  // Slightly wider for new tools
        height: 90,  // Compact height
      });

      pipWindowRef.current = pipWindow;
      setIsPipOpen(true);

      // Add base styles directly (no external CSS needed)
      const baseStyle = pipWindow.document.createElement('style');
      baseStyle.textContent = `
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        html, body { 
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #1a1a2e;
        }
        button {
          border: none;
          outline: none;
          cursor: pointer;
        }
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
        isDrawingMode={isDrawingMode}
        isZoomMode={isZoomMode}
        isCanvasOpen={isCanvasOpen}
        drawingColor={drawingColor}
        onPause={onPause}
        onResume={onResume}
        onStop={() => {
          onStop();
          closePiP();
        }}
        onToggleMic={onToggleMic}
        onScreenshot={onScreenshot}
        onClose={closePiP}
        onToggleDrawing={onToggleDrawing}
        onToggleZoom={onToggleZoom}
        onToggleCanvas={onToggleCanvas}
        onChangeDrawingColor={onChangeDrawingColor}
        onClearDrawings={onClearDrawings}
      />
    );
  }, [duration, isPaused, isMicOn, isDrawingMode, isZoomMode, isCanvasOpen, drawingColor, isPipOpen, onPause, onResume, onStop, onToggleMic, onScreenshot, onToggleDrawing, onToggleZoom, onToggleCanvas, onChangeDrawingColor, onClearDrawings]);

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
