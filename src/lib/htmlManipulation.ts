import { EditableElement } from '@/hooks/useHtmlParser';

export class HTMLManipulator {
  private doc: Document;
  private parser: DOMParser;
  private serializer: XMLSerializer;

  constructor(htmlString: string) {
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
    this.doc = this.parser.parseFromString(htmlString, 'text/html');
  }

  // Inject unique IDs into elements that don't have them
  injectElementIds(): string {
    const elementsToTrack = this.doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a, div, section, article, main, aside, header, footer');
    
    elementsToTrack.forEach((element, index) => {
      if (!element.id) {
        // Create ID based on tag and content
        const tagName = element.tagName.toLowerCase();
        const textContent = element.textContent?.trim().substring(0, 20).replace(/\s+/g, '-').toLowerCase() || '';
        const uniqueId = `editable-${tagName}-${textContent}-${index}`;
        element.id = uniqueId;
      }
    });

    return this.getHTMLString();
  }

  // Apply style modifications to specific element
  applyStyleModifications(elementId: string, styles: EditableElement['styles']): boolean {
    const element = this.doc.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID ${elementId} not found`);
      return false;
    }

    // Apply each style property
    Object.entries(styles).forEach(([property, value]) => {
      if (value !== undefined && value !== null) {
        // Convert camelCase to kebab-case for CSS
        const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        (element as HTMLElement).style.setProperty(cssProperty, value);
      }
    });

    return true;
  }

  // Apply content modifications
  applyContentModification(elementId: string, content: string): boolean {
    const element = this.doc.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID ${elementId} not found`);
      return false;
    }

    // Preserve child elements but update text content
    if (element.children.length === 0) {
      element.textContent = content;
    } else {
      // More complex: update only text nodes
      const walker = this.doc.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }
      
      if (textNodes.length > 0) {
        textNodes[0].textContent = content;
        // Remove other text nodes
        textNodes.slice(1).forEach(n => n.remove());
      }
    }

    return true;
  }

  // Apply attribute modifications
  applyAttributeModification(elementId: string, attributes: Record<string, string>): boolean {
    const element = this.doc.getElementById(elementId);
    if (!element) {
      console.warn(`Element with ID ${elementId} not found`);
      return false;
    }

    Object.entries(attributes).forEach(([attr, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(attr, value);
      }
    });

    return true;
  }

  // Get the modified HTML string
  getHTMLString(): string {
    return this.serializer.serializeToString(this.doc);
  }

  // Clean up the HTML (remove XML declarations, etc.)
  getCleanHTMLString(): string {
    const htmlString = this.getHTMLString();
    
    // Remove XML declaration and DOCTYPE if present
    return htmlString
      .replace(/^<\?xml[^>]*\?>/, '')
      .replace(/^<!DOCTYPE[^>]*>/, '')
      .replace(/^<html[^>]*xmlns[^>]*>/, '<html>')
      .trim();
  }

  // Apply all modifications from the modifications object
  applyAllModifications(modifications: Record<string, Partial<EditableElement>>): string {
    Object.entries(modifications).forEach(([elementId, changes]) => {
      if (changes.styles) {
        this.applyStyleModifications(elementId, changes.styles);
      }
      
      if (changes.content !== undefined) {
        this.applyContentModification(elementId, changes.content);
      }
      
      if (changes.attributes) {
        this.applyAttributeModification(elementId, changes.attributes);
      }
    });

    return this.getCleanHTMLString();
  }
}

// Utility function to create a new manipulator and apply modifications
export const applyModificationsToHTML = (
  htmlString: string, 
  modifications: Record<string, Partial<EditableElement>>
): string => {
  const manipulator = new HTMLManipulator(htmlString);
  return manipulator.applyAllModifications(modifications);
};

// Utility to inject IDs into HTML
export const injectElementIds = (htmlString: string): string => {
  const manipulator = new HTMLManipulator(htmlString);
  return manipulator.injectElementIds();
};