import { Mic, MicOff, Camera, CameraOff, Circle, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRecording } from '@/contexts/RecordingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';

const formatDuration = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const TopBar = () => {
  const { isRecording, isPaused, duration, settings } = useRecording();
  const { resolvedTheme, setTheme } = useTheme();

  const isMicOn = settings.audioSource === 'mic' || settings.audioSource === 'both';
  const isCameraOn = settings.cameraEnabled;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden">
          <img src={logo} alt="FlowRec" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">FlowRec</h1>
      </div>

      {/* Center: Recording Status */}
      <div className="flex items-center gap-6">
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 px-4 py-2 rounded-full bg-secondary"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
                transition={{ repeat: isPaused ? 0 : Infinity, duration: 1.5 }}
                className={cn(
                  "w-3 h-3 rounded-full",
                  isPaused ? "bg-warning" : "bg-recording"
                )}
              />
              <span className="text-sm font-mono font-medium text-foreground">
                {formatDuration(duration)}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right: Status Indicators & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* Mic Status */}
        <div
          className={cn(
            "p-2 rounded-lg transition-colors",
            isMicOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </div>

        {/* Camera Status */}
        <div
          className={cn(
            "p-2 rounded-lg transition-colors",
            isCameraOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {isCameraOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        </div>

        {/* Recording Indicator */}
        <div
          className={cn(
            "p-2 rounded-lg transition-colors",
            isRecording ? "bg-recording/10" : "bg-muted"
          )}
        >
          <Circle
            className={cn(
              "w-4 h-4",
              isRecording ? "text-recording fill-recording" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Keyboard Shortcuts */}
        <KeyboardShortcutsModal />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>
      </div>
    </header>
  );
};
