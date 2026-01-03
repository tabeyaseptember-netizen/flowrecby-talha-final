import { Mic, Volume2, MicOff, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const showSystemAudioTip = settings.audioSource === 'system' || settings.audioSource === 'both';

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

      {/* System Audio Tip */}
      {showSystemAudioTip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20"
        >
          <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-medium text-warning">Important: System Audio Setup</p>
            <p className="text-warning/80 mt-1">
              When the screen picker appears, make sure to check the <strong>"Share audio"</strong> or <strong>"Share system audio"</strong> checkbox. 
              For best results, select a <strong>Browser Tab</strong> as they reliably share audio.
            </p>
          </div>
        </motion.div>
      )}

      {/* Audio Quality Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Audio is processed with:</strong> Noise reduction, echo cancellation, and auto gain control for clearer recordings.
          </p>
        </div>
      </div>
    </div>
  );
};
