import { Monitor, AppWindow, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRecording, ScreenSource } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';

const sources: { id: ScreenSource; label: string; icon: typeof Monitor; description: string }[] = [
  { id: 'screen', label: 'Entire Screen', icon: Monitor, description: 'Record your full desktop' },
  { id: 'window', label: 'Application Window', icon: AppWindow, description: 'Record a specific app' },
  { id: 'tab', label: 'Browser Tab', icon: Globe, description: 'Record a browser tab' },
];

export const SourceSelector = () => {
  const { settings, updateSettings } = useRecording();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Screen Source
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {sources.map((source) => {
          const isSelected = settings.screenSource === source.id;
          
          return (
            <motion.button
              key={source.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateSettings({ screenSource: source.id })}
              className={cn(
                "relative p-4 rounded-2xl border-2 transition-all duration-200",
                "flex flex-col items-center gap-3 text-center",
                isSelected
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="sourceIndicator"
                  className="absolute inset-0 rounded-2xl border-2 border-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                )}
              >
                <source.icon className="w-6 h-6" />
              </div>
              <div>
                <p className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {source.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {source.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
