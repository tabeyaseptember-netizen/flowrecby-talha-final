import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * KeyboardShortcutsProvider - Initializes global keyboard shortcuts
 * 
 * This component must be rendered inside RecordingProvider.
 * It enables keyboard shortcuts that work even when UI is hidden.
 */
export const KeyboardShortcutsProvider = () => {
  useKeyboardShortcuts();
  return null;
};
