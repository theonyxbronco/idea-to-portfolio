import React, { useState, useRef } from 'react';
import { Edit3 } from 'lucide-react';
import { EditableElement } from '@/hooks/useHtmlParser';
import { cn } from '@/lib/utils';

interface EditableComponentProps {
  element: EditableElement;
  isSelected: boolean;
  onSelect: (elementId: string) => void;
  onEdit: (elementId: string) => void;
  children?: React.ReactNode;
}

const EditableComponent: React.FC<EditableComponentProps> = ({
  element,
  isSelected,
  onSelect,
  onEdit,
  children
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const componentRef = useRef<HTMLElement>(null);

  // Convert our parsed styles to React style object
  const getReactStyles = (styles: EditableElement['styles']) => {
    return {
      color: styles.color,
      backgroundColor: styles.backgroundColor,
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      fontFamily: styles.fontFamily,
      padding: styles.padding,
      margin: styles.margin,
      borderRadius: styles.borderRadius,
      textAlign: styles.textAlign,
    };
  };

  // Get the appropriate React element type
  const getElementType = (tagName: string, type: EditableElement['type']) => {
    // Map common HTML tags to React equivalents
    const tagMap: Record<string, keyof JSX.IntrinsicElements> = {
      'h1': 'h1', 'h2': 'h2', 'h3': 'h3', 'h4': 'h4', 'h5': 'h5', 'h6': 'h6',
      'p': 'p', 'span': 'span', 'div': 'div', 'section': 'section',
      'button': 'button', 'a': 'a', 'img': 'img',
      'article': 'article', 'main': 'main', 'aside': 'aside',
      'header': 'header', 'footer': 'footer', 'nav': 'nav'
    };

    return tagMap[tagName] || 'div';
  };

  // Handle click - select element and potentially open edit
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(element.id);
  };

  // Handle edit button click
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(element.id);
  };

  // Determine if element should be editable
  const isEditable = ['header', 'text', 'button', 'link'].includes(element.type);

  // Prepare props for the rendered element
  const ElementType = getElementType(element.tagName, element.type);
  const baseStyles = getReactStyles(element.styles);
  
  // Add selection and hover styling
  const interactiveStyles = {
    ...baseStyles,
    position: 'relative' as const,
    cursor: isEditable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    // Add highlight when selected
    ...(isSelected && {
      backgroundColor: isSelected && element.styles.backgroundColor 
        ? `${element.styles.backgroundColor}40` // Add transparency
        : 'rgba(255, 235, 59, 0.2)', // Yellow highlight fallback
      outline: '2px solid #ffc107',
      outlineOffset: '2px',
    }),
    // Add subtle hover effect
    ...(isHovered && !isSelected && {
      backgroundColor: isHovered && element.styles.backgroundColor
        ? `${element.styles.backgroundColor}20`
        : 'rgba(255, 235, 59, 0.1)',
    }),
  };

  // Copy over important attributes
  const elementProps: any = {
    ref: componentRef,
    style: interactiveStyles,
    onClick: isEditable ? handleClick : undefined,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    className: cn(
      element.attributes.class,
      'editable-element',
      isSelected && 'selected',
      isHovered && 'hovered'
    ),
  };

  // Add specific props based on element type
  if (element.type === 'link' && element.attributes.href) {
    elementProps.href = element.attributes.href;
    elementProps.target = element.attributes.target || '_blank';
    elementProps.rel = element.attributes.rel || 'noopener noreferrer';
  }

  if (element.type === 'image') {
    elementProps.src = element.attributes.src;
    elementProps.alt = element.attributes.alt || '';
  }

  if (element.type === 'button') {
    elementProps.type = element.attributes.type || 'button';
    elementProps.disabled = element.attributes.disabled;
  }

  // Render child elements recursively if it's a section
  const renderChildren = () => {
    if (element.children && element.children.length > 0) {
      return element.children.map((child) => (
        <EditableComponent
          key={child.id}
          element={child}
          isSelected={false} // Children can't be selected when parent is selected
          onSelect={onSelect}
          onEdit={onEdit}
        />
      ));
    }

    // For leaf elements, render the text content
    if (element.content && !element.children) {
      return element.content;
    }

    return children;
  };

  return (
    <>
      <ElementType {...elementProps}>
        {renderChildren()}
        
        {/* Edit button overlay - only show on hover for editable elements */}
        {isEditable && (isHovered || isSelected) && (
          <div
            className={cn(
              "absolute top-1 right-1 z-10 transition-opacity",
              isHovered || isSelected ? "opacity-100" : "opacity-0"
            )}
          >
            <button
              onClick={handleEditClick}
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded shadow-lg transition-colors",
                element.type === 'header' ? "bg-blue-600 hover:bg-blue-700" :
                element.type === 'button' ? "bg-green-600 hover:bg-green-700" :
                element.type === 'text' ? "bg-purple-600 hover:bg-purple-700" :
                "bg-orange-600 hover:bg-orange-700"
              )}
            >
              <Edit3 className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
      </ElementType>
    </>
  );
};

export default EditableComponent;