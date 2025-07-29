// Fixed src/components/VisualEditor/VisualEditor.tsx
import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Canvas } from './Canvas';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { Toolbar } from './Toolbar';
import { ElementsLibrary } from './ElementsLibrary';
import { ContextMenu } from './ContextMenu';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { Breadcrumb } from './Breadcrumb';
import { cn } from '@/lib/utils';

// Define EditableElement type since it's missing
export interface EditableElement {
  id: string;
  type: 'text' | 'header' | 'button' | 'image' | 'section' | 'container';
  content: string;
  tagName: string;
  styles: Record<string, string>;
  attributes: Record<string, string>;
  parentId?: string;
  children?: EditableElement[];
  isLocked?: boolean;
  isHidden?: boolean;
}

interface VisualEditorProps {
  htmlString: string;
  onSave?: (html: string) => void;
  onChange?: () => void;
  className?: string;
}

// Mock useHtmlParser hook - you'll need to implement this properly
const useHtmlParser = (htmlString: string) => {
  const [elements, setElements] = useState<EditableElement[]>([
    {
      id: '1',
      type: 'text',
      content: 'Sample text element',
      tagName: 'p',
      styles: { fontSize: '16px', color: '#000000' },
      attributes: {}
    },
    {
      id: '2',
      type: 'header',
      content: 'Sample Header',
      tagName: 'h1',
      styles: { fontSize: '32px', fontWeight: 'bold' },
      attributes: {}
    }
  ]);
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [history, setHistory] = useState<EditableElement[][]>([elements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const selectedElement = elements.find(el => el.id === selectedElementId) || null;
  const hasModifications = historyIndex > 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const selectElement = (elementId: string | null) => {
    setSelectedElementId(elementId);
  };

  const modifyElement = (elementId: string, changes: Partial<EditableElement>) => {
    const newElements = elements.map(el => 
      el.id === elementId ? { ...el, ...changes } : el
    );
    setElements(newElements);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const addElement = (element: Partial<EditableElement>) => {
    const newElement: EditableElement = {
      id: Date.now().toString(),
      type: 'text',
      content: '',
      tagName: 'div',
      styles: {},
      attributes: {},
      ...element
    };
    
    const newElements = [...elements, newElement];
    setElements(newElements);
    return newElement.id;
  };

  const deleteElement = (elementId: string) => {
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    if (selectedElementId === elementId) {
      setSelectedElementId(null);
    }
  };

  const undo = () => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const generateModifiedHtml = () => {
    return elements.map(el => 
      `<${el.tagName} style="${Object.entries(el.styles).map(([k, v]) => `${k}: ${v}`).join('; ')}">${el.content}</${el.tagName}>`
    ).join('\n');
  };

  return {
    parsedComponents: elements,
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
  };
};

// Mock useToast hook
const useToast = () => ({
  toast: ({ title, description }: { title: string; description: string }) => {
    console.log(`Toast: ${title} - ${description}`);
  }
});

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
  
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string | null;
  } | null>(null);
  
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
            id: undefined,
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
        <KeyboardShortcuts
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDelete={handleDelete}
          onSelectAll={handleSelectAll}
          onSave={handleSave}
        />

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

        <Breadcrumb
          selectedElement={selectedElement}
          elements={parsedComponents}
          onElementSelect={handleElementSelect}
        />

        <div className="flex-1 flex overflow-hidden">
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
};