// Fixed src/components/VisualEditor/EditableCanvasElement.tsx
import React, { useState, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { InlineEditor } from './InlineEditor';
import { cn } from '@/lib/utils';
import { EditableElement } from './VisualEditor';

interface EditableCanvasElementProps {
  element: EditableElement;
  isSelected: boolean;
  onSelect: () => void;
  onModify: (changes: Partial<EditableElement>) => void;
  onContextMenu?: (e: React.MouseEvent, elementId: string) => void;
}

export const EditableCanvasElement: React.FC<EditableCanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onModify,
  onContextMenu
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const [{ isDragging: dragIsDragging }, drag] = useDrag({
    type: 'canvas-element',
    item: () => {
      setIsDragging(true);
      return { id: element.id, type: element.type };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: () => setIsDragging(false)
  });

  const getElementStyles = (): React.CSSProperties => ({
    ...element.styles,
    position: 'absolute' as const,
    cursor: isDragging ? 'grabbing' : isSelected ? 'grab' : 'pointer'
  });

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (element.type === 'text' || element.type === 'header') {
      setIsInlineEditing(true);
    }
  };

  const handleInlineEditSave = (newContent: string) => {
    onModify({ content: newContent });
    setIsInlineEditing(false);
  };

  const handleInlineEditCancel = () => {
    setIsInlineEditing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, element.id);
    }
  };

  // Create dynamic component based on tagName
  const ElementTag = element.tagName as keyof JSX.IntrinsicElements;

  return (
    <div
      ref={drag}
      className={cn(
        "group transition-all duration-200",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
        isHovered && !isSelected && "ring-1 ring-blue-300",
        isDragging && "opacity-50",
        element.isLocked && "cursor-not-allowed",
        element.isHidden && "opacity-30"
      )}
      style={getElementStyles()}
      onClick={(e) => {
        e.stopPropagation();
        if (!element.isLocked) {
          onSelect();
        }
      }}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <ElementTag
        {...element.attributes}
        className={cn(element.attributes.class, "w-full h-full")}
      >
        {(element.type === 'text' || element.type === 'header') ? (
          <InlineEditor
            value={element.content}
            isActive={isInlineEditing}
            onSave={handleInlineEditSave}
            onCancel={handleInlineEditCancel}
            multiline={element.type === 'text'}
          />
        ) : (
          element.content
        )}
      </ElementTag>

      {isSelected && !element.isLocked && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize pointer-events-auto"></div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize pointer-events-auto"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize pointer-events-auto"></div>
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize pointer-events-auto"></div>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize pointer-events-auto"></div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize pointer-events-auto"></div>
          <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 border border-white cursor-w-resize pointer-events-auto"></div>
          <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 border border-white cursor-e-resize pointer-events-auto"></div>
        </div>
      )}

      {(isHovered || isSelected) && (
        <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
          {element.type}
          {element.isLocked && ' 🔒'}
          {element.isHidden && ' 👁️‍🗨️'}
        </div>
      )}

      {element.isLocked && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">🔒</span>
        </div>
      )}
    </div>
  );
};