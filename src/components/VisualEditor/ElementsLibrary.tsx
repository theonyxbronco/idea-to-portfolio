// Fixed src/components/VisualEditor/ElementsLibrary.tsx
import React, { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Type, Square, Image as ImageIcon, Layout, 
  Columns
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementLibraryItem {
  id: string;
  name: string;
  icon: React.ElementType;
  category: string;
  defaultProps: any;
}

const elementLibrary: ElementLibraryItem[] = [
  {
    id: 'text',
    name: 'Text',
    icon: Type,
    category: 'Basic',
    defaultProps: {
      content: 'Your text here',
      styles: { fontSize: '16px', color: '#000000' }
    }
  },
  {
    id: 'heading',
    name: 'Heading',
    icon: Type,
    category: 'Basic',
    defaultProps: {
      content: 'Your heading',
      styles: { fontSize: '32px', fontWeight: 'bold', color: '#000000' }
    }
  },
  {
    id: 'button',
    name: 'Button',
    icon: Square,
    category: 'Basic',
    defaultProps: {
      content: 'Button',
      styles: { 
        backgroundColor: '#3b82f6', 
        color: '#ffffff', 
        padding: '12px 24px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer'
      }
    }
  },
  {
    id: 'image',
    name: 'Image',
    icon: ImageIcon,
    category: 'Media',
    defaultProps: {
      attributes: { src: 'https://via.placeholder.com/300x200', alt: 'Placeholder' },
      styles: { maxWidth: '100%', height: 'auto' }
    }
  },
  {
    id: 'container',
    name: 'Container',
    icon: Layout,
    category: 'Layout',
    defaultProps: {
      styles: { 
        padding: '20px', 
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '8px'
      }
    }
  },
  {
    id: 'columns',
    name: 'Columns',
    icon: Columns,
    category: 'Layout',
    defaultProps: {
      styles: { 
        display: 'flex', 
        gap: '20px',
        width: '100%'
      }
    }
  }
];

const DraggableElement: React.FC<{ element: ElementLibraryItem }> = ({ element }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'element',
    item: { ...element },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <div
      ref={drag}
      className={cn(
        "flex items-center p-3 border border-gray-200 rounded-lg cursor-grab hover:bg-gray-50 transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <element.icon className="h-4 w-4 mr-3 text-gray-600" />
      <span className="text-sm font-medium">{element.name}</span>
    </div>
  );
};

export const ElementsLibrary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(elementLibrary.map(el => el.category)))];
  
  const filteredElements = elementLibrary.filter(element => {
    const matchesSearch = element.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || element.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Elements</h3>
        
        <Input
          placeholder="Search elements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs mb-3"
        />
        
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {filteredElements.map(element => (
            <DraggableElement key={element.id} element={element} />
          ))}
        </div>
      </div>
    </div>
  );
};