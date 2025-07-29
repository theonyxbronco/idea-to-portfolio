// src/components/VisualEditor/Toolbar.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  MousePointer2, Type, Square, Image, Undo2, Redo2, 
  ZoomIn, ZoomOut, Grid3x3, Ruler, Save, Eye, PanelLeft, PanelRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  selectedTool: 'select' | 'text' | 'rectangle' | 'image';
  onToolChange: (tool: 'select' | 'text' | 'rectangle' | 'image') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  hasModifications: boolean;
  onSave: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  leftPanelCollapsed?: boolean;
  rightPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  onToolChange,
  zoom,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  hasModifications,
  onSave,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  leftPanelCollapsed = false,
  rightPanelCollapsed = false,
  onToggleLeftPanel,
  onToggleRightPanel
}) => {
  const tools = [
    { id: 'select' as const, icon: MousePointer2, label: 'Select' },
    { id: 'text' as const, icon: Type, label: 'Text' },
    { id: 'rectangle' as const, icon: Square, label: 'Rectangle' },
    { id: 'image' as const, icon: Image, label: 'Image' }
  ];

  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left Section - Tools */}
      <div className="flex items-center space-x-1">
        {/* Panel toggles */}
        {onToggleLeftPanel && (
          <Button
            variant={leftPanelCollapsed ? "ghost" : "default"}
            size="sm"
            onClick={onToggleLeftPanel}
            className="w-8 h-8 p-0 mr-2"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        
        {/* Tools */}
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={selectedTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "w-8 h-8 p-0",
              selectedTool === tool.id && "bg-blue-600 text-white"
            )}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        {/* Undo/Redo */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Center Section - View Controls */}
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0" 
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-mono w-12 text-center">{zoom}%</span>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-8 h-8 p-0" 
          onClick={() => onZoomChange(Math.min(200, zoom + 25))}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <Button
          variant={showGrid ? "default" : "ghost"}
          size="sm"
          className="w-8 h-8 p-0"
          onClick={onToggleGrid}
          title="Toggle Grid"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        
        <Button
          variant={showRulers ? "default" : "ghost"}
          size="sm"
          className="w-8 h-8 p-0"
          onClick={onToggleRulers}
          title="Toggle Rulers"
        >
          <Ruler className="h-4 w-4" />
        </Button>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" title="Preview">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        
        <Button 
          variant={hasModifications ? "default" : "ghost"} 
          size="sm"
          onClick={onSave}
          disabled={!hasModifications}
          title="Save (Ctrl+S)"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>

        {/* Right panel toggle */}
        {onToggleRightPanel && (
          <Button
            variant={rightPanelCollapsed ? "ghost" : "default"}
            size="sm"
            onClick={onToggleRightPanel}
            className="w-8 h-8 p-0 ml-2"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}; ? "default" : "ghost"}
          size="sm"
          className="w-8 h-8 p-0"
          onClick={onToggleRulers}
        >
          <Ruler className="h-4 w-4" />
        </Button>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        
        <Button 
          variant={hasModifications ? "default" : "ghost"} 
          size="sm"
          onClick={onSave}
          disabled={!hasModifications}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
};