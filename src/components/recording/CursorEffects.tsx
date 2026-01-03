import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecording } from '@/contexts/RecordingContext';

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

/**
 * CursorEffects - Overlay component for click animations and cursor spotlight
 * 
 * This renders click animations and cursor spotlight effects that are visible
 * in the app UI. Note: These effects are visible in the recording only if the
 * user records the browser tab/window containing the app.
 * 
 * For recording other screens/windows, the effects would need to be implemented
 * at the system level (which requires Electron or native app).
 */
export const CursorEffects = () => {
  const { isRecording, settings } = useRecording();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [clickRipples, setClickRipples] = useState<ClickRipple[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    setIsVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!settings.clickAnimation) return;
    
    const newRipple: ClickRipple = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };
    
    setClickRipples(prev => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setClickRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  }, [settings.clickAnimation]);

  useEffect(() => {
    if (!isRecording) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isRecording, handleMouseMove, handleClick, handleMouseLeave]);

  if (!isRecording) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    >
      {/* Cursor Spotlight */}
      <AnimatePresence>
        {settings.cursorSpotlight && isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute w-32 h-32 rounded-full pointer-events-none"
            style={{
              left: mousePos.x - 64,
              top: mousePos.y - 64,
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
              boxShadow: '0 0 40px 20px rgba(255,255,255,0.1)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Click Ripples */}
      <AnimatePresence>
        {clickRipples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.8, scale: 0 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute w-12 h-12 rounded-full border-2 border-primary pointer-events-none"
            style={{
              left: ripple.x - 24,
              top: ripple.y - 24,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Click Dot */}
      <AnimatePresence>
        {clickRipples.map((ripple) => (
          <motion.div
            key={`dot-${ripple.id}`}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute w-3 h-3 rounded-full bg-primary pointer-events-none"
            style={{
              left: ripple.x - 6,
              top: ripple.y - 6,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
