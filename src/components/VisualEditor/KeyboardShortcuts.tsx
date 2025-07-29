// src/components/VisualEditor/KeyboardShortcuts.tsx
import React, { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSelectAll: () => void;
  onSave: () => void;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  onUndo, onRedo, onCopy, onPaste, onDelete, onSelectAll, onSave
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            onRedo();
            break;
          case 'c':
            e.preventDefault();
            onCopy();
            break;
          case 'v':
            e.preventDefault();
            onPaste();
            break;
          case 'a':
            e.preventDefault();
            onSelectAll();
            break;
          case 's':
            e.preventDefault();
            onSave();
            break;
        }
      } else {
        // Non-modifier keys
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            onDelete();
            break;
          case 'Escape':
            // Clear selection or close modals
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onCopy, onPaste, onDelete, onSelectAll, onSave]);

  return null; // This component doesn't render anything
};

