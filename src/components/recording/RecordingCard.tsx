import React, { forwardRef } from 'react';
import { Play, Download, Trash2, Clock, HardDrive, Edit3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Recording } from '@/contexts/RecordingContext';

interface RecordingCardProps {
  recording: Recording;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

const formatDuration = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const RecordingCard = forwardRef<HTMLDivElement, RecordingCardProps>(
  ({ recording, onPlay, onDownload, onDelete }, ref) => {
    const navigate = useNavigate();
    
    const handleEdit = () => {
      navigate(`/editor?id=${recording.id}`);
    };
    
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4 }}
        className="card-elevated overflow-hidden group"
      >
        {/* Thumbnail/Preview */}
        <div className="relative aspect-video bg-secondary">
          <video
            src={recording.url}
            className="w-full h-full object-cover"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlay}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow"
            >
              <Play className="w-5 h-5 ml-0.5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEdit}
              className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-lg"
            >
              <Edit3 className="w-5 h-5" />
            </motion.button>
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm">
            <span className="text-xs font-mono font-medium text-foreground">
              {formatDuration(recording.duration)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">
              Recording
            </span>
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
              {recording.resolution}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(recording.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{formatSize(recording.size)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEdit}
              className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDownload}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDelete}
              className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }
);

RecordingCard.displayName = 'RecordingCard';
