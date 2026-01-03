import { motion } from 'framer-motion';
import { useRecording, RecordingQuality, RecordingFPS } from '@/contexts/RecordingContext';
import { cn } from '@/lib/utils';

const qualities: { id: RecordingQuality; label: string; resolution: string }[] = [
  { id: '720p', label: '720p HD', resolution: '1280×720' },
  { id: '1080p', label: '1080p FHD', resolution: '1920×1080' },
  { id: '2k', label: '2K QHD', resolution: '2560×1440' },
];

const fpsOptions: RecordingFPS[] = [30, 60];

export const QualitySettings = () => {
  const { settings, updateSettings } = useRecording();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Quality
      </h3>
      
      <div className="grid grid-cols-3 gap-3">
        {qualities.map((quality) => {
          const isSelected = settings.quality === quality.id;
          
          return (
            <motion.button
              key={quality.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateSettings({ quality: quality.id })}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-center",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <p className={cn(
                "font-semibold text-sm",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {quality.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {quality.resolution}
              </p>
            </motion.button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <span className="text-sm text-muted-foreground">Frame Rate:</span>
        <div className="flex gap-2">
          {fpsOptions.map((fps) => {
            const isSelected = settings.fps === fps;
            
            return (
              <button
                key={fps}
                onClick={() => updateSettings({ fps })}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium text-sm transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                )}
              >
                {fps} FPS
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
