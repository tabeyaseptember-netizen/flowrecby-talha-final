import { Keyboard, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const shortcuts = [
  { keys: ['Shift', 'R'], description: 'Start / Resume Recording' },
  { keys: ['Shift', 'P'], description: 'Pause Recording' },
  { keys: ['Shift', 'X'], description: 'Stop & Save Recording' },
  { keys: ['Shift', 'S'], description: 'Take Screenshot' },
  { keys: ['Shift', 'M'], description: 'Toggle Microphone' },
  { keys: ['Shift', 'C'], description: 'Toggle Camera' },
];

const KeyBadge = ({ children }: { children: React.ReactNode }) => (
  <kbd className="px-2 py-1 text-xs font-semibold bg-secondary text-secondary-foreground rounded border border-border shadow-sm">
    {children}
  </kbd>
);

export const KeyboardShortcutsModal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    <KeyBadge>{key}</KeyBadge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-muted-foreground text-xs">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Important Note */}
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-xs text-warning">
              <p className="font-medium">Browser Limitation</p>
              <p className="mt-1 text-warning/80">
                Keyboard shortcuts only work when this browser tab is focused. 
                When recording other screens/apps, use the <strong>Picture-in-Picture (PiP)</strong> floating 
                window which has clickable controls that work everywhere.
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Enable PiP mode for best control experience when recording other apps.
        </p>
      </DialogContent>
    </Dialog>
  );
};
