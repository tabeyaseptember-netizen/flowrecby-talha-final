import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { FloatingControls } from '@/components/recording/FloatingControls';
import { CursorEffects } from '@/components/recording/CursorEffects';
import { useRecording } from '@/contexts/RecordingContext';

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * AppLayout - Main layout wrapper that manages UI visibility during recording
 * 
 * RECORDING BEHAVIOR:
 * When recording starts, the main app UI automatically hides to:
 * 1. Prevent the app UI from being captured in the recording
 * 2. Give the user a clean recording experience
 * 3. The FloatingControls and PiP window remain visible for control
 * 
 * On recording stop, the UI is automatically restored.
 */
export const AppLayout = ({ children }: AppLayoutProps) => {
  const { isRecording, isUIHidden } = useRecording();

  // When UI is hidden during recording, show minimal backdrop
  if (isUIHidden) {
    return (
      <motion.div 
        className="min-h-screen w-full bg-background/50 backdrop-blur-sm flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Recording overlay with minimal UI */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5] 
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-16 h-16 mx-auto rounded-full bg-recording/20 flex items-center justify-center"
          >
            <div className="w-6 h-6 rounded-full bg-recording animate-pulse" />
          </motion.div>
          <p className="text-muted-foreground text-sm">Recording in progress...</p>
          <p className="text-muted-foreground/60 text-xs">Use PiP window or keyboard shortcuts to control</p>
        </motion.div>

        {/* Floating controls always visible during recording */}
        <FloatingControls />
        
        {/* Cursor effects if enabled */}
        {isRecording && <CursorEffects />}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AnimatePresence mode="wait">
        <>
          <AppSidebar />
          <motion.div 
            className="flex-1 flex flex-col"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TopBar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </motion.div>
        </>
      </AnimatePresence>

      {/* Recording overlays when recording but UI not hidden (edge case) */}
      {isRecording && !isUIHidden && (
        <>
          <FloatingControls />
          <CursorEffects />
        </>
      )}
    </div>
  );
};
