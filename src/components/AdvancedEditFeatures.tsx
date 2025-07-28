// src/components/AdvancedEditFeatures.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Wand2, Undo2, Redo2, Copy, Eye, EyeOff, 
  Layers, Palette, Type, Move, RotateCcw,
  Zap, Sparkles, Target, MagicWand
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Advanced Color Picker Component
export const AdvancedColorPicker = ({ currentColor, onColorChange, label = "Color" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor || '#3b82f6');
  
  const presetColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Slate', value: '#64748b' },
    { name: 'Black', value: '#000000' },
    { name: 'White', value: '#ffffff' },
  ];

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div 
          className="w-8 h-8 rounded-lg border-2 border-white shadow-lg cursor-pointer"
          style={{ backgroundColor: currentColor }}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>
      
      {isOpen && (
        <Card className="absolute z-50 w-64 shadow-xl">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Preset Colors */}
              <div>
                <h4 className="text-xs font-medium mb-2">Preset Colors</h4>
                <div className="grid grid-cols-6 gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-md hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      onClick={() => {
                        onColorChange(color.value);
                        setIsOpen(false);
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Gradients */}
              <div>
                <h4 className="text-xs font-medium mb-2">Gradients</h4>
                <div className="grid grid-cols-3 gap-2">
                  {gradients.map((gradient, index) => (
                    <button
                      key={index}
                      className="w-full h-8 rounded-lg border-2 border-white shadow-md hover:scale-105 transition-transform"
                      style={{ background: gradient }}
                      onClick={() => {
                        onColorChange(gradient);
                        setIsOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color */}
              <div>
                <h4 className="text-xs font-medium mb-2">Custom Color</h4>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-12 h-8 rounded border-none"
                  />
                  <Input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1 h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      onColorChange(customColor);
                      setIsOpen(false);
                    }}
                    className="h-8 px-3"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Smart Typography Controls
export const SmartTypographyControls = ({ element, onModify }: any) => {
  const fontSizes = [
    { label: 'XS', value: '12px', description: 'Extra Small' },
    { label: 'SM', value: '14px', description: 'Small' },
    { label: 'MD', value: '16px', description: 'Medium' },
    { label: 'LG', value: '18px', description: 'Large' },
    { label: 'XL', value: '24px', description: 'Extra Large' },
    { label: '2XL', value: '32px', description: 'Heading' },
    { label: '3XL', value: '48px', description: 'Display' },
  ];

  const fontWeights = [
    { label: 'Light', value: '300' },
    { label: 'Normal', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semibold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Black', value: '900' },
  ];

  const fontFamilies = [
    { label: 'Sans', value: 'system-ui, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: 'SFMono-Regular, monospace' },
    { label: 'Display', value: '"Inter", sans-serif' },
  ];

  const currentFontSize = element.styles.fontSize || '16px';
  const currentWeight = element.styles.fontWeight || '400';

  return (
    <div className="space-y-6">
      {/* Font Size with Visual Preview */}
      <div>
        <label className="text-sm font-medium mb-3 block">Font Size</label>
        <div className="grid grid-cols-4 gap-2">
          {fontSizes.map((size) => (
            <Button
              key={size.value}
              variant={currentFontSize === size.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, fontSize: size.value } })}
              className="h-12 flex flex-col items-center justify-center"
              title={size.description}
            >
              <span className="text-xs font-medium">{size.label}</span>
              <span className="text-xs text-muted-foreground">{size.value}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="text-sm font-medium mb-3 block">Font Weight</label>
        <div className="grid grid-cols-3 gap-2">
          {fontWeights.map((weight) => (
            <Button
              key={weight.value}
              variant={currentWeight === weight.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, fontWeight: weight.value } })}
              className="h-10"
              style={{ fontWeight: weight.value }}
            >
              {weight.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="text-sm font-medium mb-3 block">Font Family</label>
        <div className="grid grid-cols-2 gap-2">
          {fontFamilies.map((font) => (
            <Button
              key={font.value}
              variant="outline"
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, fontFamily: font.value } })}
              className="h-10"
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="text-sm font-medium mb-3 block">Text Alignment</label>
        <div className="grid grid-cols-4 gap-2">
          {['left', 'center', 'right', 'justify'].map((align) => (
            <Button
              key={align}
              variant={element.styles.textAlign === align ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, textAlign: align } })}
              className="h-10 capitalize"
            >
              {align}
            </Button>
          ))}
        </div>
      </div>

      {/* Line Height Slider */}
      <div>
        <label className="text-sm font-medium mb-3 block">Line Height</label>
        <Slider
          value={[parseFloat(element.styles.lineHeight || '1.5')]}
          onValueChange={([value]) => 
            onModify({ styles: { ...element.styles, lineHeight: value.toString() } })
          }
          max={3}
          min={1}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Tight</span>
          <span>Normal</span>
          <span>Loose</span>
        </div>
      </div>
    </div>
  );
};

// AI-Powered Style Suggestions
export const AIStyleSuggestions = ({ element, onApplySuggestion }: any) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSuggestions = useCallback(() => {
    setIsGenerating(true);
    
    // Simulate AI suggestions based on element type
    setTimeout(() => {
      const newSuggestions = getSuggestionsForElement(element);
      setSuggestions(newSuggestions);
      setIsGenerating(false);
    }, 1500);
  }, [element]);

  const getSuggestionsForElement = (element: any) => {
    const suggestions = [];

    if (element.type === 'header') {
      suggestions.push(
        {
          id: 'modern-header',
          title: 'Modern Gradient Header',
          description: 'Apply a modern gradient background with bold typography',
          confidence: 0.9,
          preview: 'background: linear-gradient(135deg, #667eea, #764ba2)',
          styles: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            fontWeight: '700',
            textAlign: 'center'
          }
        },
        {
          id: 'minimalist-header',
          title: 'Minimalist Clean',
          description: 'Clean, minimal styling with perfect typography',
          confidence: 0.8,
          styles: {
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#1f2937',
            letterSpacing: '-0.025em',
            lineHeight: '1.2'
          }
        }
      );
    }

    if (element.type === 'button') {
      suggestions.push(
        {
          id: 'cta-button',
          title: 'Call-to-Action Button',
          description: 'High-converting button with subtle animation',
          confidence: 0.95,
          styles: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '8px',
            fontWeight: '600',
            border: 'none',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }
        },
        {
          id: 'outline-button',
          title: 'Elegant Outline',
          description: 'Sophisticated outline button with hover effects',
          confidence: 0.8,
          styles: {
            background: 'transparent',
            color: '#667eea',
            padding: '12px 24px',
            borderRadius: '6px',
            border: '2px solid #667eea',
            fontWeight: '500'
          }
        }
      );
    }

    if (element.type === 'text') {