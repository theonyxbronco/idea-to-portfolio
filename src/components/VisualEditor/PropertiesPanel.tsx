// Fixed src/components/VisualEditor/PropertiesPanel.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Type, Palette, Layout, Space as Spacing,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableElement } from './VisualEditor';

interface PropertiesPanelProps {
  element: EditableElement;
  onModify: (changes: Partial<EditableElement>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  onModify
}) => {
  const [activeTab, setActiveTab] = useState('content');

  const handleStyleChange = (property: string, value: string) => {
    onModify({
      styles: {
        ...element.styles,
        [property]: value
      }
    });
  };

  const handleContentChange = (content: string) => {
    onModify({ content });
  };

  const ColorPicker = ({ value, onChange, label }: { 
    value: string; 
    onChange: (color: string) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs text-gray-600">{label}</Label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 text-xs"
        />
      </div>
    </div>
  );

  const tabs = [
    { id: 'content', label: 'Content', icon: Type },
    { id: 'style', label: 'Style', icon: Palette },
    { id: 'layout', label: 'Layout', icon: Layout },
    { id: 'spacing', label: 'Spacing', icon: Spacing }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Properties</h3>
        <p className="text-xs text-gray-500 mt-1 capitalize">{element.type} Element</p>
      </div>
      
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center p-2 text-xs border-b-2 transition-colors",
                activeTab === tab.id 
                  ? "border-blue-500 text-blue-600 bg-blue-50" 
                  : "border-transparent text-gray-600 hover:text-gray-900"
              )}
            >
              <tab.icon className="h-3 w-3 mr-1" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {element.type === 'text' || element.type === 'header' ? (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Text Content</Label>
                  <Textarea
                    value={element.content || ''}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter text..."
                    className="min-h-[80px] text-sm"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Content</Label>
                  <Input
                    value={element.content || ''}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Enter content..."
                    className="text-sm"
                  />
                </div>
              )}
              
              {/* Text Formatting for text elements */}
              {(element.type === 'text' || element.type === 'header') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600">Text Align</Label>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant={element.styles.textAlign === 'left' ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleStyleChange('textAlign', 'left')}
                      >
                        <AlignLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={element.styles.textAlign === 'center' ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleStyleChange('textAlign', 'center')}
                      >
                        <AlignCenter className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={element.styles.textAlign === 'right' ? 'default' : 'ghost'}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handleStyleChange('textAlign', 'right')}
                      >
                        <AlignRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={element.styles.fontWeight === 'bold' ? 'default' : 'ghost'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handleStyleChange('fontWeight', 
                        element.styles.fontWeight === 'bold' ? 'normal' : 'bold'
                      )}
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={element.styles.fontStyle === 'italic' ? 'default' : 'ghost'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handleStyleChange('fontStyle', 
                        element.styles.fontStyle === 'italic' ? 'normal' : 'italic'
                      )}
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Style Tab */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              <ColorPicker
                value={element.styles.color || '#000000'}
                onChange={(color) => handleStyleChange('color', color)}
                label="Text Color"
              />
              
              <ColorPicker
                value={element.styles.backgroundColor || '#ffffff'}
                onChange={(color) => handleStyleChange('backgroundColor', color)}
                label="Background Color"
              />
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Font Size</Label>
                <Input
                  value={element.styles.fontSize?.replace('px', '') || '16'}
                  onChange={(e) => handleStyleChange('fontSize', `${e.target.value}px`)}
                  className="text-xs"
                  placeholder="16"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Font Weight</Label>
                <select
                  value={element.styles.fontWeight || 'normal'}
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-gray-300 rounded"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="100">Thin</option>
                  <option value="300">Light</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi Bold</option>
                  <option value="700">Bold</option>
                  <option value="800">Extra Bold</option>
                  <option value="900">Black</option>
                </select>
              </div>
              
              {element.type === 'button' && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Border Radius</Label>
                  <Input
                    value={element.styles.borderRadius?.replace('px', '') || '0'}
                    onChange={(e) => handleStyleChange('borderRadius', `${e.target.value}px`)}
                    className="text-xs"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Layout Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Width</Label>
                <Input
                  value={element.styles.width || 'auto'}
                  onChange={(e) => handleStyleChange('width', e.target.value)}
                  placeholder="auto"
                  className="text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Height</Label>
                <Input
                  value={element.styles.height || 'auto'}
                  onChange={(e) => handleStyleChange('height', e.target.value)}
                  placeholder="auto"
                  className="text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Display</Label>
                <select
                  value={element.styles.display || 'block'}
                  onChange={(e) => handleStyleChange('display', e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-gray-300 rounded"
                >
                  <option value="block">Block</option>
                  <option value="inline">Inline</option>
                  <option value="inline-block">Inline Block</option>
                  <option value="flex">Flex</option>
                  <option value="grid">Grid</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Position</Label>
                <select
                  value={element.styles.position || 'static'}
                  onChange={(e) => handleStyleChange('position', e.target.value)}
                  className="w-full h-8 px-2 text-xs border border-gray-300 rounded"
                >
                  <option value="static">Static</option>
                  <option value="relative">Relative</option>
                  <option value="absolute">Absolute</option>
                  <option value="fixed">Fixed</option>
                  <option value="sticky">Sticky</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Spacing Tab */}
          {activeTab === 'spacing' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Padding</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={element.styles.paddingTop || '0px'}
                    onChange={(e) => handleStyleChange('paddingTop', e.target.value)}
                    placeholder="Top"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.paddingRight || '0px'}
                    onChange={(e) => handleStyleChange('paddingRight', e.target.value)}
                    placeholder="Right"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.paddingBottom || '0px'}
                    onChange={(e) => handleStyleChange('paddingBottom', e.target.value)}
                    placeholder="Bottom"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.paddingLeft || '0px'}
                    onChange={(e) => handleStyleChange('paddingLeft', e.target.value)}
                    placeholder="Left"
                    className="text-xs"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Margin</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={element.styles.marginTop || '0px'}
                    onChange={(e) => handleStyleChange('marginTop', e.target.value)}
                    placeholder="Top"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.marginRight || '0px'}
                    onChange={(e) => handleStyleChange('marginRight', e.target.value)}
                    placeholder="Right"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.marginBottom || '0px'}
                    onChange={(e) => handleStyleChange('marginBottom', e.target.value)}
                    placeholder="Bottom"
                    className="text-xs"
                  />
                  <Input
                    value={element.styles.marginLeft || '0px'}
                    onChange={(e) => handleStyleChange('marginLeft', e.target.value)}
                    placeholder="Left"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};