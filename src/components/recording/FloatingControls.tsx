import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pause, 
  Play, 
  Square, 
  Mic, 
  MicOff, 
  Camera,
  GripVertical,
  MousePointer2,
  Minimize2,
  Maximize2,
  PictureInPicture2,
  AlertCircle,
  Pencil,
  Sun,
  Trash2,
  Info,
  Keyboard
} from 'lucide-react';
import { useRecording } from '@/contexts/RecordingContext';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useBackgroundStability } from '@/hooks/useBackgroundStability';
import { useDocumentPiP } from './DocumentPiPController';
import { ScreenAnnotationOverlay } from './ScreenAnnotationOverlay';
import { cn } from '@/lib/utils';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * FloatingControls - Recording overlay with multi-layer control system
 * 
 * CONTROL METHODS (prioritized for web platform):
 * 1. Document PiP - Interactive floating window (Chrome 116+)
 * 2. Media Session API - Hardware media keys (all modern browsers)
 * 3. Video PiP - Visual feedback in floating window
 * 4. Keyboard shortcuts - Only when tab has focus
 * 
 * This provides the best possible recording control experience
 * within browser security constraints.
 */
export const FloatingControls = () => {
  const { 
    isPaused, 
    duration, 
    settings, 
    stopRecording, 
    pauseRecording, 
    resumeRecording,
    updateSettings,
    takeScreenshot,
    enablePip,
    disablePip,
    isPipActive,
    toggleMic,
    isRecording,
  } = useRecording();

  // Drawing and zoom state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
  const [clearTrigger, setClearTrigger] = useState(0);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPipHint, setShowPipHint] = useState(true);
  const [isTabFocused, setIsTabFocused] = useState(true);

  const isMicOn = settings.audioSource === 'mic' || settings.audioSource === 'both';

  // Initialize Media Session API for hardware media key control
  useMediaSession({
    isRecording,
    isPaused,
    duration,
    onPause: pauseRecording,
    onResume: resumeRecording,
    onStop: stopRecording,
  });

  // Initialize background stability (wake lock, throttling prevention)
  useBackgroundStability({
    isRecording,
    onVisibilityChange: (visible) => setIsTabFocused(visible),
  });

  // Toggle functions for drawing/zoom
  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev);
    if (isZoomMode) setIsZoomMode(false);
  }, [isZoomMode]);

  const toggleZoomMode = useCallback(() => {
    setIsZoomMode(prev => !prev);
    if (isDrawingMode) setIsDrawingMode(false);
  }, [isDrawingMode]);

  const clearDrawings = useCallback(() => {
    setClearTrigger(prev => prev + 1);
  }, []);

  // Track mouse position for spotlight
  useEffect(() => {
    if (!isZoomMode) {
      setZoomPosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setZoomPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isZoomMode]);

  // Initialize Document PiP for interactive floating controls (canvas is now embedded in PiP)
  const { isPipSupported: isDocPipSupported, isPipOpen: isDocPipOpen, openPiP: openDocPiP, closePiP: closeDocPiP } = useDocumentPiP({
    duration,
    isPaused,
    isMicOn,
    isDrawingMode,
    isZoomMode,
    drawingColor,
    onPause: pauseRecording,
    onResume: resumeRecording,
    onStop: stopRecording,
    onToggleMic: toggleMic,
    onScreenshot: takeScreenshot,
    onClose: () => {},
    onToggleDrawing: toggleDrawingMode,
    onToggleZoom: toggleZoomMode,
    onChangeDrawingColor: setDrawingColor,
    onClearDrawings: clearDrawings,
  });

  // Track tab focus
  useEffect(() => {
    const handleFocus = () => setIsTabFocused(true);
    const handleBlur = () => setIsTabFocused(false);
    const handleVisibility = () => setIsTabFocused(document.visibilityState === 'visible');

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Auto-enable video PiP as fallback when controls mount (if doc PiP not available)
  useEffect(() => {
    if (!isDocPipSupported) {
      const timer = setTimeout(() => {
        enablePip();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [enablePip, isDocPipSupported]);

  // Hide PiP hint after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPipHint(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  if (isMinimized) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ left: position.x, bottom: position.y }}
        className="fixed z-[9999]"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full glass shadow-xl border border-border"
        >
          <motion.div
            animate={{ opacity: isPaused ? 0.5 : [1, 0.5, 1] }}
            transition={{ repeat: isPaused ? 0 : Infinity, duration: 1.5 }}
            className={cn(
              "w-3 h-3 rounded-full",
              isPaused ? "bg-warning" : "bg-recording"
            )}
          />
          <span className="font-mono text-sm font-medium text-foreground">
            {formatDuration(duration)}
          </span>
          <Maximize2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    );
  }

  return (
    <>
      {/* Screen Annotation Overlay */}
      <ScreenAnnotationOverlay
        isDrawingMode={isDrawingMode}
        isZoomMode={isZoomMode}
        zoomLevel={1.5}
        zoomPosition={zoomPosition}
        drawingColor={drawingColor}
        brushSize={4}
        key={clearTrigger}
      />

      <motion.div
        drag
        dragMomentum={false}
        onDragEnd={(_, info) => {
          setPosition({ x: position.x + info.offset.x, y: position.y - info.offset.y });
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{ left: position.x, bottom: position.y }}
        className="fixed z-[9999] glass rounded-2xl shadow-xl p-2 border border-border"
      >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Recording Timer - Large and prominent */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-xl",
          isPaused ? "bg-warning/10" : "bg-recording/10"
        )}>
          <motion.div
            animate={{ 
              opacity: isPaused ? 0.5 : [1, 0.5, 1],
              scale: isPaused ? 1 : [1, 1.2, 1]
            }}
            transition={{ repeat: isPaused ? 0 : Infinity, duration: 1.5 }}
            className={cn(
              "w-3 h-3 rounded-full",
              isPaused ? "bg-warning" : "bg-recording"
            )}
          />
          <div className="flex flex-col">
            <span className="font-mono text-xl font-bold text-foreground tracking-wider">
              {formatDuration(duration)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Pause/Resume */}
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          title={isPaused ? "Resume (Shift+P)" : "Pause (Shift+P)"}
        >
          {isPaused ? (
            <Play className="w-4 h-4 text-success" />
          ) : (
            <Pause className="w-4 h-4 text-warning" />
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stopRecording}
          className="p-2.5 rounded-xl bg-recording/10 hover:bg-recording/20 transition-colors"
          title="Stop Recording (Shift+X)"
        >
          <Square className="w-4 h-4 text-recording fill-recording" />
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Screenshot */}
        <button
          onClick={takeScreenshot}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          title="Take Screenshot (Shift+S)"
        >
          <Camera className="w-4 h-4 text-foreground" />
        </button>

        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={cn(
            "p-2.5 rounded-xl transition-colors",
            isMicOn ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          )}
          title={isMicOn ? "Mute Microphone (Shift+M)" : "Unmute Microphone (Shift+M)"}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        {/* Click Animation Toggle */}
        <button
          onClick={() => updateSettings({ clickAnimation: !settings.clickAnimation })}
          className={cn(
            "p-2.5 rounded-xl transition-colors",
            settings.clickAnimation ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          )}
          title="Toggle Click Animation"
        >
          <MousePointer2 className="w-4 h-4" />
        </button>

        {/* Drawing Tool */}
        <button
          onClick={toggleDrawingMode}
          className={cn(
            "p-2.5 rounded-xl transition-colors",
            isDrawingMode ? "bg-purple-500/20 text-purple-400" : "bg-secondary text-muted-foreground"
          )}
          title="Draw/Annotate on Screen"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Spotlight/Zoom Tool */}
        <button
          onClick={toggleZoomMode}
          className={cn(
            "p-2.5 rounded-xl transition-colors",
            isZoomMode ? "bg-orange-500/20 text-orange-400" : "bg-secondary text-muted-foreground"
          )}
          title="Spotlight/Highlight Area"
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Clear Drawings (only when drawing mode is active) */}
        {isDrawingMode && (
          <button
            onClick={clearDrawings}
            className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            title="Clear All Drawings"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        <div className="w-px h-6 bg-border" />

        {/* PiP Toggle - Uses Document PiP if available, falls back to video PiP */}
        <button
          onClick={async () => {
            if (isDocPipSupported) {
              if (isDocPipOpen) {
                closeDocPiP();
              } else {
                try {
                  await openDocPiP();
                  // Show success toast (imported from hooks)
                  const { toast } = await import('@/hooks/use-toast');
                  toast({
                    title: "Interactive Controls Opened",
                    description: "Floating window with buttons is now active!",
                  });
                } catch (err) {
                  const { toast } = await import('@/hooks/use-toast');
                  toast({
                    title: "PiP Unavailable",
                    description: "Using keyboard shortcuts & media keys instead.",
                    variant: "destructive",
                  });
                }
              }
            } else {
              isPipActive ? disablePip() : enablePip();
            }
          }}
          className={cn(
            "p-2.5 rounded-xl transition-colors relative",
            (isDocPipOpen || isPipActive) ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
          )}
          title={
            isDocPipSupported
              ? (isDocPipOpen ? "Close Interactive PiP" : "Open Interactive PiP (Click to open floating window with buttons!)")
              : (isPipActive ? "Exit Picture-in-Picture" : "Enter Picture-in-Picture")
          }
        >
          <PictureInPicture2 className="w-4 h-4" />
          {/* Pulse indicator if Doc PiP available but not open */}
          {isDocPipSupported && !isDocPipOpen && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </button>

        {/* Minimize */}
        <button
          onClick={() => setIsMinimized(true)}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          title="Minimize Controls"
        >
          <Minimize2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Status Indicators */}
      <div className="mt-2 pt-2 border-t border-border space-y-2">
        {/* Tab Focus Warning */}
        <AnimatePresence>
          {!isTabFocused && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-2 rounded-lg bg-warning/10"
            >
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              <span className="text-xs text-warning">
                Tab unfocused - Use PiP or media keys
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document PiP Status */}
        <AnimatePresence>
          {isDocPipOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="text-xs text-success flex items-center justify-center gap-1.5">
                <PictureInPicture2 className="w-3 h-3" />
                Interactive PiP - Controls work across all apps!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video PiP Status (fallback) */}
        <AnimatePresence>
          {isPipActive && !isDocPipOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="text-xs text-success flex items-center justify-center gap-1.5">
                <PictureInPicture2 className="w-3 h-3" />
                Video PiP Active
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PiP Hint - Emphasize the interactive PiP button */}
        <AnimatePresence>
          {!isDocPipOpen && showPipHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className={cn(
                "flex items-start gap-2 p-2 rounded-lg",
                isDocPipSupported ? "bg-primary/10" : "bg-warning/10"
              )}>
                <Info className={cn(
                  "w-4 h-4 flex-shrink-0 mt-0.5",
                  isDocPipSupported ? "text-primary" : "text-warning"
                )} />
                <div className="text-xs">
                  <p className={cn(
                    "font-medium",
                    isDocPipSupported ? "text-primary" : "text-warning"
                  )}>
                    {isDocPipSupported 
                      ? "🎯 Click the PiP button above!" 
                      : "Enable PiP for cross-app control!"}
                  </p>
                  <p className={cn(
                    "mt-1",
                    isDocPipSupported ? "text-primary/80" : "text-warning/80"
                  )}>
                    {isDocPipSupported 
                      ? "Opens a floating window with CLICKABLE controls (pause, stop, screenshot, mic) that work everywhere - even when watching YouTube!"
                      : "Keyboard shortcuts only work when this tab is focused. Use media keys instead."
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcuts Hint with Focus Indicator */}
        <div className="flex items-center justify-center gap-2">
          <Keyboard className={cn(
            "w-3 h-3",
            isTabFocused ? "text-success" : "text-muted-foreground/40"
          )} />
          <span className={cn(
            "text-[10px]",
            isTabFocused ? "text-muted-foreground/60" : "text-muted-foreground/40"
          )}>
            Shift+X: Stop • Shift+P: Pause • Shift+S: Screenshot
          </span>
        </div>
      </div>
      </motion.div>
    </>
  );
};
