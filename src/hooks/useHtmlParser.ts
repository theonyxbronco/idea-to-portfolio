import { useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';

export interface EditableElement {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'section' | 'link';
  tagName: string;
  content: string;
  styles: Record<string, string>;
  attributes: Record<string, string>;
  selector: string; // CSS selector to find element in DOM
  children?: EditableElement[];
}

export interface EditSession {
  selectedElementId: string | null;
  modifications: Record<string, Partial<EditableElement>>;
  originalHtml: string;
  currentHtml: string;
}

// Enhanced HTML Editor Hook
export const useHtmlEditor = (initialHtml: string) => {
  const [editSession, setEditSession] = useState<EditSession>({
    selectedElementId: null,
    modifications: {},
    originalHtml: initialHtml,
    currentHtml: initialHtml,
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [parsedElements, setParsedElements] = useState<EditableElement[]>([]);

  // Parse HTML and create element map
  const parseHtmlToElements = useCallback((html: string): EditableElement[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const elements: EditableElement[] = [];

    const parseElement = (element: HTMLElement, index: number = 0): EditableElement => {
      const id = element.id || `element-${uuidv4()}`;
      const type = detectElementType(element);
      
      // Create a unique CSS selector
      const selector = createSelector(element, index);
      
      return {
        id,
        type,
        tagName: element.tagName.toLowerCase(),
        content: element.textContent?.trim() || '',
        styles: getComputedStyles(element),
        attributes: getElementAttributes(element),
        selector,
        children: Array.from(element.children)
          .filter(child => child instanceof HTMLElement)
          .map((child, idx) => parseElement(child as HTMLElement, idx))
      };
    };

    // Parse all meaningful elements
    const meaningfulElements = doc.body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a, img, div[class], section, article');
    meaningfulElements.forEach((el, index) => {
      if (el instanceof HTMLElement && shouldIncludeElement(el)) {
        elements.push(parseElement(el, index));
      }
    });

    return elements;
  }, []);

  // Apply modifications to actual DOM
  const applyModificationToDOM = useCallback((elementId: string, modifications: Partial<EditableElement>) => {
    if (!iframeRef.current?.contentDocument) return;

    const element = parsedElements.find(el => el.id === elementId);
    if (!element) return;

    const domElement = iframeRef.current.contentDocument.querySelector(element.selector);
    if (!domElement) return;

    // Apply style changes
    if (modifications.styles) {
      Object.entries(modifications.styles).forEach(([property, value]) => {
        if (value) {
          (domElement as HTMLElement).style.setProperty(
            convertCamelToKebab(property), 
            value
          );
        }
      });
    }

    // Apply content changes
    if (modifications.content !== undefined) {
      domElement.textContent = modifications.content;
    }

    // Apply attribute changes
    if (modifications.attributes) {
      Object.entries(modifications.attributes).forEach(([attr, value]) => {
        if (value) {
          domElement.setAttribute(attr, value);
        }
      });
    }
  }, [parsedElements]);

  // Generate modified HTML
  const generateModifiedHtml = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return editSession.currentHtml;
    
    const html = iframeRef.current.contentDocument.documentElement.outerHTML;
    return `<!DOCTYPE html>\n${html}`;
  }, [editSession.currentHtml]);

  // Initialize iframe with overlay system
  const initializeEditableIframe = useCallback(() => {
    if (!iframeRef.current?.contentDocument) return;

    const doc = iframeRef.current.contentDocument;
    
    // Add edit overlay styles
    const style = doc.createElement('style');
    style.textContent = `
      .editable-overlay {
        position: absolute;
        pointer-events: none;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        z-index: 10000;
      }
      
      .editable-overlay.hover {
        border-color: #fbbf24;
        background: rgba(251, 191, 36, 0.1);
      }
      
      .editable-overlay.selected {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
      }
      
      .edit-button {
        position: absolute;
        top: -12px;
        right: -12px;
        width: 24px;
        height: 24px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 10001;
        pointer-events: auto;
      }
      
      .editable-overlay:hover .edit-button,
      .editable-overlay.selected .edit-button {
        opacity: 1;
      }
      
      .editable-element {
        position: relative;
        cursor: pointer;
      }
      
      .editable-element:hover {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
      }
    `;
    doc.head.appendChild(style);

    // Add click handlers to elements
    parsedElements.forEach(element => {
      const domElement = doc.querySelector(element.selector);
      if (domElement) {
        domElement.classList.add('editable-element');
        domElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectElement(element.id);
        });
      }
    });
  }, [parsedElements]);

  // Select element
  const selectElement = useCallback((elementId: string | null) => {
    setEditSession(prev => ({
      ...prev,
      selectedElementId: elementId,
    }));

    // Update visual selection in iframe
    if (iframeRef.current?.contentDocument) {
      const doc = iframeRef.current.contentDocument;
      
      // Remove previous selection
      doc.querySelectorAll('.editable-element').forEach(el => {
        el.classList.remove('selected');
      });

      // Add selection to new element
      if (elementId) {
        const element = parsedElements.find(el => el.id === elementId);
        if (element) {
          const domElement = doc.querySelector(element.selector);
          if (domElement) {
            domElement.classList.add('selected');
            domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [parsedElements]);

  // Modify element
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

    // Apply changes to DOM immediately
    applyModificationToDOM(elementId, changes);
  }, [applyModificationToDOM]);

  // Initialize when HTML changes
  React.useEffect(() => {
    const elements = parseHtmlToElements(initialHtml);
    setParsedElements(elements);
    setEditSession(prev => ({ ...prev, currentHtml: initialHtml }));
  }, [initialHtml, parseHtmlToElements]);

  return {
    // State
    parsedElements,
    selectedElementId: editSession.selectedElementId,
    modifications: editSession.modifications,
    currentHtml: editSession.currentHtml,
    
    // Actions
    selectElement,
    modifyElement,
    generateModifiedHtml,
    initializeEditableIframe,
    
    // Refs
    iframeRef,
    
    // Computed
    selectedElement: editSession.selectedElementId 
      ? parsedElements.find(el => el.id === editSession.selectedElementId) 
      : null,
    hasModifications: Object.keys(editSession.modifications).length > 0,
  };
};

// Helper functions
const detectElementType = (element: HTMLElement): EditableElement['type'] => {
  const tag = element.tagName.toLowerCase();
  
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return 'header';
  if (tag === 'button' || element.getAttribute('role') === 'button') return 'button';
  if (tag === 'img') return 'image';
  if (tag === 'a') return 'link';
  if (['div', 'section', 'article'].includes(tag) && element.children.length > 0) return 'section';
  return 'text';
};

const createSelector = (element: HTMLElement, index: number): string => {
  // Create a unique, stable selector
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}:nth-of-type(${index + 1})`;
    }
  }
  
  return `${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
};

const getComputedStyles = (element: HTMLElement): Record<string, string> => {
  const computed = window.getComputedStyle(element);
  return {
    color: computed.color,
    backgroundColor: computed.backgroundColor,
    fontSize: computed.fontSize,
    fontWeight: computed.fontWeight,
    fontFamily: computed.fontFamily,
    padding: computed.padding,
    margin: computed.margin,
    textAlign: computed.textAlign,
    borderRadius: computed.borderRadius,
  };
};

const getElementAttributes = (element: HTMLElement): Record<string, string> => {
  const attrs: Record<string, string> = {};
  for (const attr of element.attributes) {
    attrs[attr.name] = attr.value;
  }
  return attrs;
};

const shouldIncludeElement = (element: HTMLElement): boolean => {
  // Skip script, style, meta tags
  const excludeTags = ['script', 'style', 'meta', 'link', 'title'];
  if (excludeTags.includes(element.tagName.toLowerCase())) return false;
  
  // Skip empty elements without meaningful content
  const hasText = element.textContent?.trim().length > 0;
  const hasChildren = element.children.length > 0;
  const isInteractive = ['button', 'a', 'input'].includes(element.tagName.toLowerCase());
  
  return hasText || hasChildren || isInteractive;
};

const convertCamelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};