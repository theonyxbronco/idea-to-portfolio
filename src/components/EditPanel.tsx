import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  X, Palette, Type, Move, Zap, ArrowUp, ArrowDown, 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,ArrowRight,
  Plus, Minus, Sparkles
} from 'lucide-react';
import { EditableElement } from '@/hooks/useHtmlParser';
import { QuickAction, SmartSuggestion } from '@/types/editor';

interface EditPanelProps {
  element: EditableElement;
  onClose: () => void;
  onModify: (changes: Partial<EditableElement>) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ element, onClose, onModify }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'smart' | 'advanced'>('quick');

  // Quick actions based on element type
  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'bigger',
        label: 'Make Bigger',
        icon: Plus,
        action: () => {
          const currentSize = parseFloat(element.styles.fontSize || '16');
          onModify({
            styles: {
              ...element.styles,
              fontSize: `${Math.min(currentSize * 1.2, 48)}px`
            }
          });
        }
      },
      {
        id: 'smaller',
        label: 'Make Smaller',
        icon: Minus,
        action: () => {
          const currentSize = parseFloat(element.styles.fontSize || '16');
          onModify({
            styles: {
              ...element.styles,
              fontSize: `${Math.max(currentSize * 0.8, 10)}px`
            }
          });
        }
      }
    ];

    // Element-specific actions
    if (element.type === 'header') {
      baseActions.push(
        {
          id: 'bold',
          label: 'Make Bold',
          icon: Bold,
          action: () => onModify({
            styles: {
              ...element.styles,
              fontWeight: element.styles.fontWeight === 'bold' ? 'normal' : 'bold'
            }
          })
        },
        {
          id: 'center',
          label: 'Center Text',
          icon: AlignCenter,
          action: () => onModify({
            styles: {
              ...element.styles,
              textAlign: element.styles.textAlign === 'center' ? 'left' : 'center'
            }
          })
        }
      );
    }

    if (element.type === 'button') {
      baseActions.push(
        {
          id: 'primary-color',
          label: 'Blue Button',
          icon: Palette,
          action: () => onModify({
            styles: {
              ...element.styles,
              backgroundColor: '#3b82f6',
              color: '#ffffff'
            }
          })
        },
        {
          id: 'success-color',
          label: 'Green Button',
          icon: Palette,
          action: () => onModify({
            styles: {
              ...element.styles,
              backgroundColor: '#10b981',
              color: '#ffffff'
            }
          })
        }
      );
    }

    if (element.type === 'text') {
      baseActions.push(
        {
          id: 'italic',
          label: 'Italic',
          icon: Italic,
          action: () => onModify({
            styles: {
              ...element.styles,
              fontStyle: element.styles.fontStyle === 'italic' ? 'normal' : 'italic'
            }
          })
        }
      );
    }

    return baseActions;
  };

  // Smart suggestions based on element type and current styles
  const getSmartSuggestions = (): SmartSuggestion[] => {
    const suggestions: SmartSuggestion[] = [];

    // Universal suggestions
    suggestions.push({
      id: 'improve-contrast',
      title: 'Improve Contrast',
      description: 'Make text more readable with better color contrast',
      confidence: 0.8,
      action: () => {
        const isDark = element.styles.backgroundColor?.includes('rgb(') && 
          element.styles.backgroundColor.includes('0, 0, 0') ||
          element.styles.backgroundColor?.includes('#000');
        
        onModify({
          styles: {
            ...element.styles,
            color: isDark ? '#ffffff' : '#000000'
          }
        });
      }
    });

    // Element-specific suggestions
    if (element.type === 'header') {
      suggestions.push({
        id: 'professional-header',
        title: 'Make More Professional',
        description: 'Apply professional styling with proper spacing and typography',
        confidence: 0.9,
        action: () => onModify({
          styles: {
            ...element.styles,
            fontWeight: '600',
            letterSpacing: '0.025em',
            lineHeight: '1.2',
            marginBottom: '1rem'
          }
        })
      });

      if (parseFloat(element.styles.fontSize || '16') < 24) {
        suggestions.push({
          id: 'increase-prominence',
          title: 'Increase Prominence',
          description: 'Make this header stand out more with larger size',
          confidence: 0.7,
          action: () => onModify({
            styles: {
              ...element.styles,
              fontSize: '2.5rem',
              fontWeight: 'bold'
            }
          })
        });
      }
    }

    if (element.type === 'button') {
      suggestions.push({
        id: 'modern-button',
        title: 'Modernize Button',
        description: 'Apply modern button styling with rounded corners and shadows',
        confidence: 0.85,
        action: () => onModify({
          styles: {
            ...element.styles,
            borderRadius: '8px',
            padding: '12px 24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }
        })
      });

      suggestions.push({
        id: 'call-to-action',
        title: 'Enhance Call-to-Action',
        description: 'Make button more attention-grabbing',
        confidence: 0.75,
        action: () => onModify({
          styles: {
            ...element.styles,
            backgroundColor: '#f59e0b',
            color: '#ffffff',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }
        })
      });
    }

    if (element.type === 'text') {
      const fontSize = parseFloat(element.styles.fontSize || '16');
      if (fontSize < 14) {
        suggestions.push({
          id: 'improve-readability',
          title: 'Improve Readability',
          description: 'Increase font size for better readability',
          confidence: 0.9,
          action: () => onModify({
            styles: {
              ...element.styles,
              fontSize: '16px',
              lineHeight: '1.6'
            }
          })
        });
      }
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  const quickActions = getQuickActions();
  const smartSuggestions = getSmartSuggestions();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
        <CardHeader className="bg-gradient-accent text-accent-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Edit Element</CardTitle>
              <p className="text-accent-foreground/80 mt-1">
                {element.type} • {element.tagName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-accent-foreground hover:bg-accent-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'quick'
                  ? 'bg-accent text-accent-foreground border-b-2 border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-4 w-4 inline mr-2" />
              Quick Actions
            </button>
            <button
              onClick={() => setActiveTab('smart')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'smart'
                  ? 'bg-accent text-accent-foreground border-b-2 border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Smart Suggestions
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'advanced'
                  ? 'bg-accent text-accent-foreground border-b-2 border-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Type className="h-4 w-4 inline mr-2" />
              Advanced
            </button>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {/* Quick Actions Tab */}
            {activeTab === 'quick' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Quick Changes</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action) => (
                      <Button
                        key={action.id}
                        variant="outline"
                        onClick={action.action}
                        className="h-auto p-4 flex flex-col items-center space-y-2"
                      >
                        <action.icon className="h-5 w-5" />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Smart Suggestions Tab */}
            {activeTab === 'smart' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">AI Suggestions</h3>
                  <div className="space-y-3">
                    {smartSuggestions.map((suggestion) => (
                      <Card key={suggestion.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={suggestion.action}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{suggestion.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(suggestion.confidence * 100)}% match
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Typography</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Input
                        id="fontSize"
                        value={element.styles.fontSize || ''}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, fontSize: e.target.value }
                        })}
                        placeholder="16px"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fontWeight">Font Weight</Label>
                      <select
                        id="fontWeight"
                        value={element.styles.fontWeight || 'normal'}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, fontWeight: e.target.value }
                        })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="600">Semi Bold</option>
                        <option value="300">Light</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Colors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="color">Text Color</Label>
                      <Input
                        id="color"
                        type="color"
                        value={element.styles.color || '#000000'}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, color: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="backgroundColor">Background</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={element.styles.backgroundColor || '#ffffff'}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, backgroundColor: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Spacing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="padding">Padding</Label>
                      <Input
                        id="padding"
                        value={element.styles.padding || ''}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, padding: e.target.value }
                        })}
                        placeholder="16px"
                      />
                    </div>
                    <div>
                      <Label htmlFor="margin">Margin</Label>
                      <Input
                        id="margin"
                        value={element.styles.margin || ''}
                        onChange={(e) => onModify({
                          styles: { ...element.styles, margin: e.target.value }
                        })}
                        placeholder="16px"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditPanel;