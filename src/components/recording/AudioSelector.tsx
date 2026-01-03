import { useState, useEffect } from 'react';
import { Mic, Volume2, MicOff, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecording, AudioSource } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';

const audioOptions: { id: AudioSource; label: string; icon: typeof Mic; description: string }[] = [
  { id: 'mic', label: 'Microphone', icon: Mic, description: 'Voice only' },
  { id: 'system', label: 'System Audio', icon: Volume2, description: 'Desktop sound' },
  { id: 'both', label: 'Mic + System', icon: Mic, description: 'Both sources' },
  { id: 'none', label: 'No Audio', icon: MicOff, description: 'Silent recording' },
];

export const AudioSelector = () => {
  const { settings, updateSettings } = useRecording();
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Check microphone permission status
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
        
        result.addEventListener('change', () => {
          setMicPermission(result.state as 'granted' | 'denied' | 'prompt');
        });
      } catch {
        // Permissions API not supported
        setMicPermission('unknown');
      }
    };
    
    checkMicPermission();
  }, []);

  const showSystemAudioTip = settings.audioSource === 'system' || settings.audioSource === 'both';
  const showMicTip = (settings.audioSource === 'mic' || settings.audioSource === 'both') && micPermission === 'denied';

  // Test microphone to request permission
  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Audio Source
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {audioOptions.map((option) => {
          const isSelected = settings.audioSource === option.id;
          
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateSettings({ audioSource: option.id })}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all duration-200",
                "flex items-center gap-3",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                )}
              >
                <option.icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {option.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* System Audio Warning - Critical for user understanding */}
      <AnimatePresence>
        {showSystemAudioTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-warning">⚠️ Important: System Audio Setup</p>
                <ol className="text-warning/80 mt-1 space-y-1 list-decimal list-inside">
                  <li>When screen picker appears, click <strong>"Share audio"</strong> checkbox</li>
                  <li>For best results, select a <strong>Browser Tab</strong> (Chrome/Edge tabs work best)</li>
                  <li>Full screen/window capture may not include audio on some browsers</li>
                </ol>
                <p className="text-warning/80 mt-2 italic">
                  If you don't see the checkbox, your browser may not support system audio capture.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone Permission Denied Warning */}
      <AnimatePresence>
        {showMicTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-destructive">Microphone Access Blocked</p>
                <p className="text-destructive/80 mt-1">
                  Please allow microphone access in your browser settings, then refresh the page.
                </p>
                <button
                  onClick={testMicrophone}
                  className="mt-2 text-xs underline text-destructive hover:text-destructive/80"
                >
                  Try requesting permission again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microphone Status */}
      {(settings.audioSource === 'mic' || settings.audioSource === 'both') && micPermission !== 'denied' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20"
        >
          <CheckCircle className="w-4 h-4 text-success" />
          <span className="text-xs text-success">
            {micPermission === 'granted' ? 'Microphone ready' : 'Microphone will be requested when recording starts'}
          </span>
        </motion.div>
      )}

      {/* Audio Quality Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Audio processing:</strong> Noise reduction, echo cancellation, and auto gain control for clearer recordings.
          </p>
        </div>
      </div>
    </div>
  );
};
