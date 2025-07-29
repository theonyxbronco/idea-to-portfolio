// src/components/VisualEditor/LayersPanel.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ChevronDown, ChevronRight, Eye, EyeOff, Lock, Unlock,
  Type, Square, Image as ImageIcon, MousePointer
} from 'lucide-react';
import { EditableElement } from '@/hooks/useHtmlParser';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  elements: EditableElement[];
  selectedElementId: string | null;
  onElementSelect: (elementId: string | null) => void;
}

const getElementIcon = (type: EditableElement['type']) => {
  switch (type) {
    case 'text': return Type;
    case 'header': return Type;
    case 'button': return Square;
    case 'image': return ImageIcon;
    case 'section': return Square;
    default: return MousePointer;
  }
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedElementId,
  onElementSelect
}) => {
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [hiddenElements, setHiddenElements] = useState<Set<string>>(new Set());
  const [lockedElements, setLockedElements] = useState<Set<string>>(new Set());

  const toggleExpanded = (elementId: string) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(elementId)) {
      newExpanded.delete(elementId);
    } else {
      newExpanded.add(elementId);
    }
    setExpandedElements(newExpanded);
  };

  const toggleVisibility = (elementId: string) => {
    const newHidden = new Set(hiddenElements);
    if (newHidden.has(elementId)) {
      newHidden.delete(elementId);
    } else {
      newHidden.add(elementId);
    }
    setHiddenElements(newHidden);
  };

  const toggleLock = (elementId: string) => {
    const newLocked = new Set(lockedElements);
    if (newLocked.has(elementId)) {
      newLocked.delete(elementId);
    } else {
      newLocked.add(elementId);
    }
    setLockedElements(newLocked);
  };

  const LayerItem: React.FC<{ 
    element: EditableElement; 
    depth?: number 
  }> = ({ element, depth = 0 }) => {
    const hasChildren = element.children && element.children.length > 0;
    const isExpanded = expandedElements.has(element.id);
    const isHidden = hiddenElements.has(element.id);
    const isLocked = lockedElements.has(element.id);
    const isSelected = selectedElementId === element.id;
    const Icon = getElementIcon(element.type);

    return (
      <div className="select-none">
        <div
          className={cn(
            "flex items-center h-8 px-2 hover:bg-gray-50 cursor-pointer group",
            isSelected && "bg-blue-50 border-r-2 border-blue-500"
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onElementSelect(element.id)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-4 h-4 p-0 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(element.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-5" />
          )}
          
          <Icon className="h-3 w-3 mr-2 text-gray-500" />
          
          <span className={cn(
            "flex-1 text-sm truncate",
            isHidden && "opacity-50",
            isSelected && "font-medium text-blue-700"
          )}>
            {element.content?.slice(0, 20) || element.type}
          </span>
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(element.id);
              }}
            >
              {isHidden ? (
                <EyeOff className="h-3 w-3 text-gray-400" />
              ) : (
                <Eye className="h-3 w-3 text-gray-600" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(element.id);
              }}
            >
              {isLocked ? (
                <Lock className="h-3 w-3 text-gray-600" />
              ) : (
                <Unlock className="h-3 w-3 text-gray-400" />
              )}
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {element.children!.map((child) => (
              <LayerItem key={child.id} element={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Layers</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {elements.map((element) => (
          <LayerItem key={element.id} element={element} />
        ))}
      </div>
    </div>
  );
};