import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, ArrowLeft, Keyboard } from 'lucide-react';
import { useRecording } from '@/contexts/RecordingContext';
import { SourceSelector } from '@/components/recording/SourceSelector';
import { AudioSelector } from '@/components/recording/AudioSelector';
import { CameraPreview } from '@/components/recording/CameraPreview';
import { QualitySettings } from '@/components/recording/QualitySettings';
import { CountdownOverlay } from '@/components/recording/CountdownOverlay';
import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

const Record = () => {
  const navigate = useNavigate();
  const { startRecording, isRecording, settings, updateSettings } = useRecording();

  const handleActualStart = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const { count, startCountdown } = useCountdown(handleActualStart, 3);

  const handleStartRecording = () => {
    startCountdown();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      <CountdownOverlay count={count} />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-8 max-w-4xl mx-auto"
      >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Recording</h1>
          <p className="text-sm text-muted-foreground">Configure your recording settings</p>
        </div>
      </motion.div>

      <div className="grid gap-6">
        {/* Source Selection */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <SourceSelector />
        </motion.div>

        {/* Audio Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <AudioSelector />
        </motion.div>

        {/* Camera Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <CameraPreview />
        </motion.div>

        {/* Quality Settings */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <QualitySettings />
        </motion.div>

        {/* Advanced Options */}
        <motion.div variants={itemVariants} className="card-elevated p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Recording Enhancements
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updateSettings({ showCursor: !settings.showCursor })}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                settings.showCursor
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              Show Cursor
            </button>
            <button
              onClick={() => updateSettings({ clickAnimation: !settings.clickAnimation })}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                settings.clickAnimation
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              Click Animation
            </button>
            <button
              onClick={() => updateSettings({ cursorSpotlight: !settings.cursorSpotlight })}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                settings.cursorSpotlight
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              Cursor Spotlight
            </button>
            <button
              onClick={() => updateSettings({ keystrokeDisplay: !settings.keystrokeDisplay })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                settings.keystrokeDisplay
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              )}
            >
              <Keyboard className="w-4 h-4" />
              Show Keystrokes
            </button>
          </div>
        </motion.div>

        {/* Start Recording Button */}
        <motion.div variants={itemVariants} className="flex justify-center pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartRecording}
            disabled={isRecording}
            className={cn(
              "flex items-center gap-3 px-10 py-4 rounded-2xl font-semibold text-lg transition-all",
              isRecording
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-gradient-to-r from-recording to-recording/80 text-recording-foreground shadow-recording hover:shadow-xl"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-current animate-pulse" />
            {isRecording ? 'Recording in Progress...' : 'Start Recording'}
          </motion.button>
        </motion.div>

        {/* Keyboard Shortcuts */}
        <motion.div variants={itemVariants} className="text-center text-sm text-muted-foreground">
          <p>
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground font-mono text-xs">Ctrl</kbd>
            {' + '}
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground font-mono text-xs">Shift</kbd>
            {' + '}
            <kbd className="px-2 py-1 rounded bg-secondary text-foreground font-mono text-xs">R</kbd>
            {' to start/stop recording'}
          </p>
        </motion.div>
      </div>
    </motion.div>
    </>
  );
};

export default Record;
