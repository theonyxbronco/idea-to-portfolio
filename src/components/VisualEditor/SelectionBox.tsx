// src/components/VisualEditor/SelectionBox.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface SelectionBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({ x, y, width, height }) => {
  return (
    <div
      className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-10 z-50 pointer-events-none"
      style={{
        left: x,
        top: y,
        width,
        height
      }}
    />
  );
};