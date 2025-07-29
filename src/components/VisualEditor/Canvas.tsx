import React, { useRef, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { EditableCanvasElement } from './EditableCanvasElement';
import { SelectionBox } from './SelectionBox';
import { cn } from '@/lib/utils';

interface CanvasProps {
  elements: EditableElement[];
  selectedElementId: string | null;
  selectedTool: 'select' | 'text' | 'rectangle' | 'image';
  zoom: number;
  showGrid: boolean;
  showRulers: boolean;
  onElementSelect: (elementId: string | null) => void;
  onElementModify: (elementId: string, changes: Partial<EditableElement>) => void;
  onContextMenu?: (e: React.MouseEvent, elementId: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedElementId,
  selectedTool,
  zoom,
  showGrid,
  showRulers,
  onElementSelect,
  onElementModify,
  onContextMenu
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [{ isOver }, drop] = useDrop({
    accept: ['element', 'canvas-element'],
    drop: (item: any, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const x = (clientOffset.x - canvasRect.left) / (zoom / 100);
        const y = (clientOffset.y - canvasRect.top) / (zoom / 100);
        
        if (item.type === 'element') {
          // Handle dropping new elements from library
          console.log('Dropped new element at', x, y, item);
        } else if (item.type === 'canvas-element') {
          // Handle moving existing elements
          onElementModify(item.id, {
            styles: {
              left: `${x}px`,
              top: `${y}px`,
              position: 'absolute'
            }
          });
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onElementSelect(null);
    }
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Could show canvas context menu here
  };

  const zoomScale = zoom / 100;

  // Create rulers
  const createRulerMarks = (length: number, interval: number = 50) => {
    const marks = [];
    for (let i = 0; i <= length; i += interval) {
      marks.push(
        <div
          key={i}
          className="absolute text-xs text-gray-500"
          style={{
            left: `${i}px`,
            top: '2px'
          }}
        >
          {i}
        </div>
      );
    }
    return marks;
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-100 relative">
      {/* Rulers */}
      {showRulers && (
        <>
          {/* Horizontal ruler */}
          <div className="absolute top-0 left-6 right-0 h-6 bg-white border-b border-gray-300 z-20 overflow-hidden">
            <div className="relative h-full" style={{ width: `${canvasSize.width * zoomScale}px` }}>
              {createRulerMarks(canvasSize.width, 100).map((mark, i) => (
                <div key={i} style={{ transform: `scale(${zoomScale})`, transformOrigin: 'left top' }}>
                  {mark}
                </div>
              ))}
            </div>
          </div>
          
          {/* Vertical ruler */}
          <div className="absolute top-6 left-0 bottom-0 w-6 bg-white border-r border-gray-300 z-20 overflow-hidden">
            <div className="relative w-full" style={{ height: `${canvasSize.height * zoomScale}px` }}>
              {createRulerMarks(canvasSize.height, 100).map((mark, i) => (
                <div 
                  key={i} 
                  className="absolute text-xs text-gray-500"
                  style={{
                    top: `${i * 100 * zoomScale}px`,
                    left: '2px',
                    transform: 'rotate(-90deg)',
                    transformOrigin: 'left top'
                  }}
                >
                  {i * 100}
                </div>
              ))}
            </div>
          </div>
          
          {/* Corner */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-gray-200 border-r border-b border-gray-300 z-30" />
        </>
      )}

      {/* Canvas Container */}
      <div 
        className="flex items-center justify-center min-h-full p-8"
        style={{ 
          paddingTop: showRulers ? '56px' : '32px', 
          paddingLeft: showRulers ? '56px' : '32px' 
        }}
      >
        <div
          ref={(node) => {
            canvasRef.current = node;
            drop(node);
          }}
          className={cn(
            "bg-white shadow-lg relative overflow-hidden cursor-default",
            isOver && "ring-2 ring-blue-400 ring-opacity-50",
            selectedTool === 'text' && "cursor-text",
            selectedTool === 'select' && "cursor-default"
          )}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top left'
          }}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
        >
          {/* Grid */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
          )}

          {/* Render Elements */}
          {elements.map((element) => (
            <EditableCanvasElement
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => onElementSelect(element.id)}
              onModify={(changes) => onElementModify(element.id, changes)}
              onContextMenu={onContextMenu}
            />
          ))}

          {/* Selection Box for multi-select */}
          {selectionBox && (
            <SelectionBox {...selectionBox} />
          )}

          {/* Drop zone indicator */}
          {isOver && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
              <div className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                Drop element here
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};