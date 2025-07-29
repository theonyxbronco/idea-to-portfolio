// Enhanced src/components/VisualEditor/VisualEditor.tsx with onChange support
import React, { useState, useRef, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useHtmlParser, EditableElement } from '@/hooks/useHtmlParser';
import { Canvas } from './Canvas';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { ElementsLibrary } from './ElementsLibrary';
import { ContextMenu } from './ContextMenu';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { Breadcrumb } from './Breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface VisualEditorProps {
  htmlString: string;
  onSave?: (html: string) => void;
  onChange?: () => void; // Called when any change is made
  className?: string;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({ 
  htmlString, 
  onSave,
  onChange,
  className 
}) => {
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'rectangle' | 'image'>('select');
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
  } | null>(null);
  
  // Clipboard state
  const [clipboard, setClipboard] = useState<EditableElement | null>(null);

  const {
    parsedComponents,
    selectedElementId,
    selectedElement,
    selectElement,
    modifyElement,
    addElement,
    deleteElement,
    undo,
    redo,
    canUndo,
    canRedo,
    hasModifications,
    generateModifiedHtml
  } = useHtmlParser(htmlString);

  const handleSave = useCallback(() => {
    if (onSave && hasModifications) {
      const modifiedHtml = generateModifiedHtml();
      onSave(modifiedHtml);
      toast({
        title: "Changes Saved",
        description: "Your modifications have been saved successfully.",
      });
    }
  }, [onSave, hasModifications, generateModifiedHtml, toast]);

  const handleElementSelect = useCallback((elementId: string | null) => {
    selectElement(elementId);
    setContextMenu(null);
  }, [selectElement]);

  const handleElementModify = useCallback((elementId: string, changes: Partial<EditableElement>) => {
    modifyElement(elementId, changes);
    // Notify parent component of changes
    if (onChange) {
      onChange();
    }
  }, [modifyElement, onChange]);

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      elementId
    });
  }, []);

  const handleContextAction = useCallback((action: string, elementId?: string) => {
    if (!elementId) return;

    switch (action) {
      case 'copy':
        const elementToCopy = parsedComponents.find(el => el.id === elementId);
        if (elementToCopy) {
          setClipboard(elementToCopy);
          toast({ title: "Copied", description: "Element copied to clipboard" });
        }
        break;
      case 'paste':
        if (clipboard) {
          const newId = addElement({
            ...clipboard,
            id: undefined, // Will be generated
            content: clipboard.content + ' (Copy)',
          });
          selectElement(newId);
          toast({ title: "Pasted", description: "Element pasted" });
          if (onChange) onChange();
        }
        break;
      case 'delete':
        deleteElement(elementId);
        toast({ title: "Deleted", description: "Element deleted" });
        if (onChange) onChange();
        break;
      case 'lock':
        handleElementModify(elementId, { isLocked: true });
        break;
      case 'hide':
        handleElementModify(elementId, { isHidden: true });
        break;
    }
    setContextMenu(null);
  }, [parsedComponents, clipboard, addElement, deleteElement, handleElementModify, selectElement, toast, onChange]);

  const handleCopy = useCallback(() => {
    if (selectedElement) {
      setClipboard(selectedElement);
      toast({ title: "Copied", description: "Element copied to clipboard" });
    }
  }, [selectedElement, toast]);

  const handlePaste = useCallback(() => {
    if (clipboard) {
      const newId = addElement({
        ...clipboard,
        id: undefined,
        content: clipboard.content + ' (Copy)',
      });
      selectElement(newId);
      toast({ title: "Pasted", description: "Element pasted" });
      if (onChange) onChange();
    }
  }, [clipboard, addElement, selectElement, toast, onChange]);

  const handleDelete = useCallback(() => {
    if (selectedElementId) {
      deleteElement(selectedElementId);
      toast({ title: "Deleted", description: "Element deleted" });
      if (onChange) onChange();
    }
  }, [selectedElementId, deleteElement, toast, onChange]);

  const handleSelectAll = useCallback(() => {
    // Implementation for select all
    toast({ title: "Select All", description: "Feature coming soon" });
  }, [toast]);

  const handleUndo = useCallback(() => {
    undo();
    if (onChange) onChange();
  }, [undo, onChange]);

  const handleRedo = useCallback(() => {
    redo();
    if (onChange) onChange();
  }, [redo, onChange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn(
        "h-full bg-gray-50 flex flex-col overflow-hidden",
        className
      )}>
        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
          onSave={handleSave}
        />

        {/* Top Toolbar */}
        <Toolbar
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          zoom={zoom}
          onZoomChange={setZoom}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          showRulers={showRulers}
          onToggleRulers={() => setShowRulers(!showRulers)}
          hasModifications={hasModifications}
          onSave={handleSave}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          leftPanelCollapsed={leftPanelCollapsed}
          rightPanelCollapsed={rightPanelCollapsed}
          onToggleLeftPanel={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          onToggleRightPanel={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        />

        {/* Breadcrumb */}
        <Breadcrumb
          selectedElement={selectedElement}
          elements={parsedComponents}
          onElementSelect={handleElementSelect}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Elements Library & Layers */}
          <div className={cn(
            "bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0",
            leftPanelCollapsed ? "w-12" : "w-80"
          )}>
            {!leftPanelCollapsed && (
              <div className="h-full flex flex-col">
                <div className="flex-1 border-b border-gray-200">
                  <ElementsLibrary />
                </div>
                <div className="flex-1">
                  <LayersPanel
                    elements={parsedComponents}
                    selectedElementId={selectedElementId}
                    onElementSelect={handleElementSelect}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas
              elements={parsedComponents}
              selectedElementId={selectedElementId}
              selectedTool={selectedTool}
              zoom={zoom}
              showGrid={showGrid}
              showRulers={showRulers}
              onElementSelect={handleElementSelect}
              onElementModify={handleElementModify}
              onContextMenu={handleContextMenu}
            />
          </div>

          {/* Right Panel - Properties */}
          <div className={cn(
            "bg-white border-l border-gray-200 transition-all duration-300 flex-shrink-0",
            rightPanelCollapsed ? "w-12" : "w-80"
          )}>
            {!rightPanelCollapsed && selectedElement && (
              <PropertiesPanel
                element={selectedElement}
                onModify={(changes) => handleElementModify(selectedElement.id, changes)}
              />
            )}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              elementId={contextMenu.elementId}
              onAction={handleContextAction}
              onClose={() => setContextMenu(null)}
            />
          </>
        )}
      </div>
    </DndProvider>
  );
};<ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              elementId={contextMenu.elementId}
              onAction={handleContextAction}
              onClose={() => setContextMenu(null)}
            />
          </>
        )}
      </div>
    </DndProvider>
  );
};