// src/components/VisualEditor/InlineEditor.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditorProps {
  value: string;
  isActive: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  className?: string;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  value,
  isActive,
  onSave,
  onCancel,
  multiline = false,
  className
}) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!isActive) {
    return <span className={className}>{value}</span>;
  }

  return (
    <div className="relative inline-block">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            "resize-none border border-blue-500 rounded px-2 py-1 text-sm min-h-[60px]",
            className
          )}
          rows={3}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            "border border-blue-500 rounded px-2 py-1 text-sm",
            className
          )}
        />
      )}
      
      <div className="absolute -right-16 top-0 flex items-center space-x-1">
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 p-0"
          onClick={handleSave}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="w-6 h-6 p-0"
          onClick={onCancel}
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    </div>
  );
};