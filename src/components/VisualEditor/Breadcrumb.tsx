// src/components/VisualEditor/Breadcrumb.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { EditableElement } from '@/hooks/useHtmlParser';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  selectedElement: EditableElement | null;
  elements: EditableElement[];
  onElementSelect: (elementId: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  selectedElement,
  elements,
  onElementSelect
}) => {
  if (!selectedElement) return null;

  const buildPath = (element: EditableElement): EditableElement[] => {
    const path = [element];
    let current = element;
    
    while (current.parentId) {
      const parent = elements.find(el => el.id === current.parentId);
      if (parent) {
        path.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return path;
  };

  const path = buildPath(selectedElement);

  return (
    <div className="flex items-center space-x-1 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm">
      <span className="text-gray-500">Selected:</span>
      {path.map((element, index) => (
        <React.Fragment key={element.id}>
          {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs",
              element.id === selectedElement.id && "bg-blue-100 text-blue-700"
            )}
            onClick={() => onElementSelect(element.id)}
          >
            {element.type}
            {element.content && `: ${element.content.slice(0, 20)}${element.content.length > 20 ? '...' : ''}`}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
};

