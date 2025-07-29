import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types for our parsed components
export interface EditableElement {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'section' | 'link';
  tagName: string;
  content: string;
  styles: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    textAlign?: string;
    fontStyle?: string;
    letterSpacing?: string;
    lineHeight?: string;
    marginBottom?: string;
    boxShadow?: string;
    transition?: string;
    textTransform?: string;
  };
  attributes: Record<string, string>;
  children?: EditableElement[];
  originalElement: HTMLElement;
}

export interface EditSession {
  selectedElementId: string | null;
  modifications: Record<string, Partial<EditableElement>>;
  originalHtml: string;
}

// Component type detection logic
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

  // Section detection (containers with multiple children)
  if (['div', 'section', 'article', 'main', 'aside', 'header', 'footer'].includes(tagName) &&
      element.children.length > 1) {
    return 'section';
  }

  // Default to text for everything else with content
  if (textContent.length > 0) {
    return 'text';
  }

  return 'section'; // fallback
};

// Extract computed styles from element
const extractStyles = (element: HTMLElement) => {
  const computed = window.getComputedStyle(element);
  return {
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontFamily: computed.fontFamily,
    padding: computed.padding,
    margin: computed.margin,
    borderRadius: computed.borderRadius,
    textAlign: computed.textAlign as any,
  };
};

// Convert HTML element to our editable structure
const parseElement = (element: HTMLElement): EditableElement => {
  const id = element.id || `editable-${uuidv4()}`;
  const type = detectComponentType(element);
  
  // Get all attributes
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }

  // Parse children recursively, but only for sections
  let children: EditableElement[] | undefined;
  if (type === 'section' && element.children.length > 0) {
    children = Array.from(element.children)
      .filter(child => child instanceof HTMLElement)
      .map(child => parseElement(child as HTMLElement));
  }

  return {
    id,
    type,
    tagName: element.tagName.toLowerCase(),
    content: element.textContent?.trim() || '',
    styles: extractStyles(element),
    attributes,
    children,
    originalElement: element,
  };
};

// Main hook
export const useHtmlParser = (htmlString: string) => {
  const [editSession, setEditSession] = useState<EditSession>({
    selectedElementId: null,
    modifications: {},
    originalHtml: htmlString,
  });

  // Parse HTML string into editable components
  const parsedComponents = useMemo(() => {
    if (!htmlString) return [];

    try {
      // Create a temporary DOM to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      
      // Find the main content area (usually body or a main container)
      const body = doc.body;
      const editableElements: EditableElement[] = [];

      // Parse top-level elements in body
      Array.from(body.children).forEach(element => {
        if (element instanceof HTMLElement) {
          // Skip script and style tags
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

  // Select an element for editing
  const selectElement = useCallback((elementId: string | null) => {
    setEditSession(prev => ({
      ...prev,
      selectedElementId: elementId,
    }));
  }, []);

  // Apply modifications to an element
  const modifyElement = useCallback((elementId: string, changes: Partial<EditableElement>) => {
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
  }, []);

  // Get the current state of an element (original + modifications)
  const getElementState = useCallback((elementId: string): EditableElement | null => {
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
    };
  }, [parsedComponents, editSession.modifications]);

  // Reset all modifications
  const resetModifications = useCallback(() => {
    setEditSession(prev => ({
      ...prev,
      modifications: {},
      selectedElementId: null,
    }));
  }, []);

  // Generate modified HTML (for export/save)
  const generateModifiedHtml = useCallback(() => {
    // This would rebuild the HTML with modifications applied
    // For now, return original - we'll implement this later
    return htmlString;
  }, [htmlString, editSession.modifications]);

  return {
    // Parsed data
    parsedComponents,
    
    // Edit session state
    selectedElementId: editSession.selectedElementId,
    modifications: editSession.modifications,
    
    // Actions
    selectElement,
    modifyElement,
    getElementState,
    resetModifications,
    generateModifiedHtml,
    
    // Computed values
    hasModifications: Object.keys(editSession.modifications).length > 0,
    selectedElement: editSession.selectedElementId 
      ? getElementState(editSession.selectedElementId) 
      : null,
  };
};