// Enhanced src/hooks/useHtmlParser.ts with visual editor support
import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Enhanced types for visual editor support
export interface EditableElement {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'section' | 'link' | 'container';
  tagName: string;
  content: string;
  styles: {
    // Layout
    position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
    display?: 'block' | 'inline' | 'inline-block' | 'flex' | 'grid' | 'none';
    width?: string;
    height?: string;
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
    zIndex?: string;
    
    // Typography
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    fontStyle?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textDecoration?: string;
    textTransform?: string;
    
    // Spacing
    padding?: string;
    paddingTop?: string;
    paddingRight?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    margin?: string;
    marginTop?: string;
    marginRight?: string;
    marginBottom?: string;
    marginLeft?: string;
    
    // Borders & Effects
    border?: string;
    borderRadius?: string;
    boxShadow?: string;
    opacity?: string;
    transform?: string;
    transition?: string;
    
    // Flexbox
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'baseline' | 'stretch';
    gap?: string;
    
    // Grid
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    gridGap?: string;
  };
  attributes: Record<string, string>;
  children?: EditableElement[];
  originalElement?: HTMLElement;
  parentId?: string;
  isLocked?: boolean;
  isHidden?: boolean;
}

export interface EditSession {
  selectedElementId: string | null;
  modifications: Record<string, Partial<EditableElement>>;
  originalHtml: string;
  undoStack: EditOperation[];
  redoStack: EditOperation[];
}

export interface EditOperation {
  id: string;
  type: 'modify' | 'add' | 'delete' | 'move';
  elementId: string;
  previousState?: Partial<EditableElement>;
  newState?: Partial<EditableElement>;
  timestamp: number;
}

// Enhanced component type detection
const detectComponentType = (element: HTMLElement): EditableElement['type'] => {
  const tagName = element.tagName.toLowerCase();
  const classList = Array.from(element.classList);
  const textContent = element.textContent?.trim() || '';

  // Header detection
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return 'header';
  }

  // Button detection
  if (tagName === 'button' || 
      classList.some(cls => cls.includes('button') || cls.includes('btn')) ||
      element.getAttribute('role') === 'button') {
    return 'button';
  }

  // Image detection
  if (tagName === 'img') {
    return 'image';
  }

  // Link detection
  if (tagName === 'a' && element.getAttribute('href')) {
    return 'link';
  }

  // Container detection (divs with specific classes or multiple children)
  if (['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav'].includes(tagName)) {
    if (element.children.length > 1 || 
        classList.some(cls => cls.includes('container') || cls.includes('wrapper'))) {
      return 'container';
    }
  }

  // Text detection for paragraph and span elements
  if (['p', 'span', 'label'].includes(tagName) || textContent.length > 0) {
    return 'text';
  }

  return 'section'; // fallback
};

// Enhanced style extraction with computed styles
const extractStyles = (element: HTMLElement) => {
  const computed = window.getComputedStyle(element);
  
  return {
    // Layout
    position: computed.position !== 'static' ? computed.position : undefined,
    display: computed.display !== 'block' ? computed.display : undefined,
    width: element.style.width || (computed.width !== 'auto' ? computed.width : undefined),
    height: element.style.height || (computed.height !== 'auto' ? computed.height : undefined),
    top: element.style.top || undefined,
    left: element.style.left || undefined,
    right: element.style.right || undefined,
    bottom: element.style.bottom || undefined,
    zIndex: computed.zIndex !== 'auto' ? computed.zIndex : undefined,
    
    // Typography
    color: computed.color,
    backgroundColor: computed.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computed.backgroundColor : undefined,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight !== 'normal' ? computed.fontWeight : undefined,
    fontFamily: computed.fontFamily,
    fontStyle: computed.fontStyle !== 'normal' ? computed.fontStyle : undefined,
    lineHeight: computed.lineHeight !== 'normal' ? computed.lineHeight : undefined,
    letterSpacing: computed.letterSpacing !== 'normal' ? computed.letterSpacing : undefined,
    textAlign: computed.textAlign !== 'left' ? computed.textAlign as any : undefined,
    textDecoration: computed.textDecoration !== 'none' ? computed.textDecoration : undefined,
    textTransform: computed.textTransform !== 'none' ? computed.textTransform : undefined,
    
    // Spacing
    padding: computed.padding !== '0px' ? computed.padding : undefined,
    margin: computed.margin !== '0px' ? computed.margin : undefined,
    
    // Borders & Effects
    border: computed.border !== 'none' ? computed.border : undefined,
    borderRadius: computed.borderRadius !== '0px' ? computed.borderRadius : undefined,
    boxShadow: computed.boxShadow !== 'none' ? computed.boxShadow : undefined,
    opacity: computed.opacity !== '1' ? computed.opacity : undefined,
    transform: computed.transform !== 'none' ? computed.transform : undefined,
    transition: computed.transition !== 'all 0s ease 0s' ? computed.transition : undefined,
  };
};

// Enhanced element parsing with better hierarchy support
const parseElement = (element: HTMLElement, parentId?: string): EditableElement => {
  const id = element.id || `editable-${uuidv4()}`;
  const type = detectComponentType(element);
  
  // Get all attributes
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  // Parse children recursively for container elements
  let children: EditableElement[] | undefined;
  if (type === 'container' || type === 'section') {
    children = Array.from(element.children)
      .filter(child => child instanceof HTMLElement)
      .filter(child => !['script', 'style', 'meta', 'link'].includes(child.tagName.toLowerCase()))
      .map(child => parseElement(child as HTMLElement, id));
  }

  return {
    id,
    type,
    tagName: element.tagName.toLowerCase(),
    content: children ? '' : element.textContent?.trim() || '',
    styles: extractStyles(element),
    attributes,
    children,
    originalElement: element,
    parentId,
    isLocked: false,
    isHidden: false,
  };
};

// Enhanced hook with undo/redo and better state management
export const useHtmlParser = (htmlString: string) => {
  const [editSession, setEditSession] = useState<EditSession>({
    selectedElementId: null,
    modifications: {},
    originalHtml: htmlString,
    undoStack: [],
    redoStack: [],
  });

  // Parse HTML string into editable components with memoization
  const parsedComponents = useMemo(() => {
    if (!htmlString) return [];

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      const body = doc.body;
      const editableElements: EditableElement[] = [];

      Array.from(body.children).forEach(element => {
        if (element instanceof HTMLElement) {
          if (!['script', 'style', 'meta', 'link'].includes(element.tagName.toLowerCase())) {
            editableElements.push(parseElement(element));
          }
        }
      });

      return editableElements;
    } catch (error) {
      console.error('Failed to parse HTML:', error);
      return [];
    }
  }, [htmlString]);

  // Helper to add operation to undo stack
  const addToUndoStack = useCallback((operation: EditOperation) => {
    setEditSession(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-19), operation], // Keep last 20 operations
      redoStack: [], // Clear redo stack when new operation is added
    }));
  }, []);

  // Select an element for editing
  const selectElement = useCallback((elementId: string | null) => {
    setEditSession(prev => ({
      ...prev,
      selectedElementId: elementId,
    }));
  }, []);

  // Apply modifications to an element with undo support
  const modifyElement = useCallback((elementId: string, changes: Partial<EditableElement>) => {
    const currentElement = parsedComponents.find(el => el.id === elementId);
    if (!currentElement) return;

    const operation: EditOperation = {
      id: uuidv4(),
      type: 'modify',
      elementId,
      previousState: editSession.modifications[elementId] || {},
      newState: changes,
      timestamp: Date.now(),
    };

    setEditSession(prev => ({
      ...prev,
      modifications: {
        ...prev.modifications,
        [elementId]: {
          ...prev.modifications[elementId],
          ...changes,
        },
      },
    }));

    addToUndoStack(operation);
  }, [parsedComponents, editSession.modifications, addToUndoStack]);

  // Add new element
  const addElement = useCallback((elementData: Partial<EditableElement>, parentId?: string) => {
    const newElement: EditableElement = {
      id: uuidv4(),
      type: 'text',
      tagName: 'div',
      content: '',
      styles: {},
      attributes: {},
      parentId,
      isLocked: false,
      isHidden: false,
      ...elementData,
    };

    const operation: EditOperation = {
      id: uuidv4(),
      type: 'add',
      elementId: newElement.id,
      newState: newElement,
      timestamp: Date.now(),
    };

    setEditSession(prev => ({
      ...prev,
      modifications: {
        ...prev.modifications,
        [newElement.id]: newElement,
      },
    }));

    addToUndoStack(operation);
    return newElement.id;
  }, [addToUndoStack]);

  // Delete element
  const deleteElement = useCallback((elementId: string) => {
    const element = getElementState(elementId);
    if (!element) return;

    const operation: EditOperation = {
      id: uuidv4(),
      type: 'delete',
      elementId,
      previousState: element,
      timestamp: Date.now(),
    };

    setEditSession(prev => ({
      ...prev,
      modifications: {
        ...prev.modifications,
        [elementId]: { ...prev.modifications[elementId], isHidden: true },
      },
      selectedElementId: prev.selectedElementId === elementId ? null : prev.selectedElementId,
    }));

    addToUndoStack(operation);
  }, [addToUndoStack]);

  // Undo operation
  const undo = useCallback(() => {
    const lastOperation = editSession.undoStack[editSession.undoStack.length - 1];
    if (!lastOperation) return;

    setEditSession(prev => {
      const newUndoStack = prev.undoStack.slice(0, -1);
      const newRedoStack = [...prev.redoStack, lastOperation];

      let newModifications = { ...prev.modifications };

      switch (lastOperation.type) {
        case 'modify':
          if (lastOperation.previousState) {
            newModifications[lastOperation.elementId] = lastOperation.previousState;
          } else {
            delete newModifications[lastOperation.elementId];
          }
          break;
        case 'add':
          delete newModifications[lastOperation.elementId];
          break;
        case 'delete':
          if (lastOperation.previousState) {
            newModifications[lastOperation.elementId] = lastOperation.previousState;
          }
          break;
      }

      return {
        ...prev,
        modifications: newModifications,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    });
  }, [editSession.undoStack]);

  // Redo operation
  const redo = useCallback(() => {
    const nextOperation = editSession.redoStack[editSession.redoStack.length - 1];
    if (!nextOperation) return;

    setEditSession(prev => {
      const newRedoStack = prev.redoStack.slice(0, -1);
      const newUndoStack = [...prev.undoStack, nextOperation];

      let newModifications = { ...prev.modifications };

      switch (nextOperation.type) {
        case 'modify':
          if (nextOperation.newState) {
            newModifications[nextOperation.elementId] = {
              ...newModifications[nextOperation.elementId],
              ...nextOperation.newState,
            };
          }
          break;
        case 'add':
          if (nextOperation.newState) {
            newModifications[nextOperation.elementId] = nextOperation.newState;
          }
          break;
        case 'delete':
          newModifications[nextOperation.elementId] = {
            ...newModifications[nextOperation.elementId],
            isHidden: true,
          };
          break;
      }

      return {
        ...prev,
        modifications: newModifications,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      };
    });
  }, [editSession.redoStack]);

  // Get the current state of an element (original + modifications)
  const getElementState = useCallback((elementId: string): EditableElement | null => {
    // First check if it's a new element in modifications
    if (editSession.modifications[elementId] && !parsedComponents.find(comp => comp.id === elementId)) {
      return editSession.modifications[elementId] as EditableElement;
    }

    const original = parsedComponents.find(comp => comp.id === elementId);
    if (!original) return null;

    const modifications = editSession.modifications[elementId];
    if (!modifications) return original;

    return {
      ...original,
      ...modifications,
      styles: {
        ...original.styles,
        ...modifications.styles,
      },
      attributes: {
        ...original.attributes,
        ...modifications.attributes,
      },
    };
  }, [parsedComponents, editSession.modifications]);

  // Get all elements including new ones
  const getAllElements = useCallback((): EditableElement[] => {
    const allElements = [...parsedComponents];
    
    // Add new elements from modifications
    Object.keys(editSession.modifications).forEach(elementId => {
      if (!parsedComponents.find(el => el.id === elementId)) {
        const modifiedElement = editSession.modifications[elementId] as EditableElement;
        if (modifiedElement && !modifiedElement.isHidden) {
          allElements.push(modifiedElement);
        }
      }
    });

    // Apply modifications and filter hidden elements
    return allElements
      .map(element => getElementState(element.id))
      .filter((element): element is EditableElement => element !== null && !element.isHidden);
  }, [parsedComponents, editSession.modifications, getElementState]);

  // Reset all modifications
  const resetModifications = useCallback(() => {
    setEditSession(prev => ({
      ...prev,
      modifications: {},
      selectedElementId: null,
      undoStack: [],
      redoStack: [],
    }));
  }, []);

  // Generate modified HTML
  const generateModifiedHtml = useCallback(() => {
    // This is a simplified version - in a real implementation, you'd rebuild the DOM
    // For now, return the original HTML with modifications applied via CSS
    let modifiedHtml = htmlString;
    
    Object.entries(editSession.modifications).forEach(([elementId, changes]) => {
      if (changes.content) {
        // Replace content in HTML - this is a simplified approach
        const regex = new RegExp(`(<[^>]*id="${elementId}"[^>]*>)[^<]*(</[^>]*>)`, 'gi');
        modifiedHtml = modifiedHtml.replace(regex, `$1${changes.content}$2`);
      }
    });

    return modifiedHtml;
  }, [htmlString, editSession.modifications]);

  return {
    // Data
    parsedComponents: getAllElements(),
    originalComponents: parsedComponents,
    
    // Selection state
    selectedElementId: editSession.selectedElementId,
    selectedElement: editSession.selectedElementId 
      ? getElementState(editSession.selectedElementId) 
      : null,
    
    // Actions
    selectElement,
    modifyElement,
    addElement,
    deleteElement,
    getElementState,
    
    // Undo/Redo
    undo,
    redo,
    canUndo: editSession.undoStack.length > 0,
    canRedo: editSession.redoStack.length > 0,
    
    // Utilities
    resetModifications,
    generateModifiedHtml,
    hasModifications: Object.keys(editSession.modifications).length > 0,
    modificationsCount: Object.keys(editSession.modifications).length,
  };
};