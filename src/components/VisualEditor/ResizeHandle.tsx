// src/components/VisualEditor/ResizeHandle.tsx
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  position: 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';
  onResize: (deltaX: number, deltaY: number, position: string) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onResize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const getCursorClass = () => {
    const cursors = {
      'nw': 'cursor-nw-resize',
      'n': 'cursor-n-resize',
      'ne': 'cursor-ne-resize',
      'w': 'cursor-w-resize',
      'e': 'cursor-e-resize',
      'sw': 'cursor-sw-resize',
      's': 'cursor-s-resize',
      'se': 'cursor-se-resize',
    };
    return cursors[position];
  };

  const getPositionClasses = () => {
    const positions = {
      'nw': '-top-1 -left-1',
      'n': '-top-1 left-1/2 transform -translate-x-1/2',
      'ne': '-top-1 -right-1',
      'w': '-left-1 top-1/2 transform -translate-y-1/2',
      'e': '-right-1 top-1/2 transform -translate-y-1/2',
      'sw': '-bottom-1 -left-1',
      's': '-bottom-1 left-1/2 transform -translate-x-1/2',
      'se': '-bottom-1 -right-1',
    };
    return positions[position];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      onResize(deltaX, deltaY, position);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={cn(
        "absolute w-2 h-2 bg-blue-500 border border-white z-10 pointer-events-auto",
        getPositionClasses(),
        getCursorClass(),
        isDragging && "bg-blue-600"
      )}
      onMouseDown={handleMouseDown}
    />
  );
};