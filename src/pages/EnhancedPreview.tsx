// src/pages/EnhancedPreview.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Eye, Code, Smartphone, Monitor, Tablet, 
  Rocket, AlertCircle, Download, Edit, RotateCcw, 
  Wand2, Palette, Type, Move, Zap, Save
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useHtmlEditor } from '@/hooks/useHtmlEditor';

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

const EnhancedPreview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [viewportSize, setViewportSize] = useState<ViewportSize>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  
  // Get data from previous page
  const { portfolioData, generatedPortfolio, metadata, isIncomplete } = location.state || {};
  
  const htmlString = typeof generatedPortfolio === 'string' 
    ? generatedPortfolio 
    : generatedPortfolio?.html || '';
    
  // Use the enhanced HTML editor
  const {
    parsedElements,
    selectedElementId,
    selectedElement,
    currentHtml,
    modifications,
    selectElement,
    modifyElement,
    generateModifiedHtml,
    initializeEditableIframe,
    iframeRef,
    hasModifications
  } = useHtmlEditor(htmlString);

  // Initialize iframe editing when it loads
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => {
      initializeEditableIframe();
    }, 100);
  }, [initializeEditableIframe]);

  const getViewportClasses = () => {
    switch (viewportSize) {
      case 'mobile': return 'w-[375px] h-[800px]';
      case 'tablet': return 'w-[768px] h-[1024px]';
      case 'desktop': return 'w-full h-[900px] max-w-[1200px]';
      default: return 'w-full h-[900px] max-w-[1200px]';
    }
  };

  const quickActions = selectedElement ? getQuickActionsForElement(selectedElement) : [];

  if (!portfolioData || !generatedPortfolio) {
    React.useEffect(() => {
      navigate('/');
    }, [navigate]);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="shadow-lg hover:shadow-xl transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Live Portfolio Editor
                </h1>
                <p className="text-slate-600">
                  Click any element to edit • Real-time changes • Professional results
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="px-4 py-2 bg-green-100 text-green-700 border-green-200">
                <Wand2 className="h-4 w-4 mr-2" />
                AI Generated
              </Badge>
              {hasModifications && (
                <Badge className="px-3 py-1 bg-blue-100 text-blue-700 border-blue-200">
                  <Edit className="h-3 w-3 mr-1" />
                  {Object.keys(modifications).length} Changes
                </Badge>
              )}
              {isIncomplete && (
                <Badge variant="destructive" className="px-3 py-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex flex-wrap items-center justify-between mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
            <div className="flex flex-wrap items-center gap-6">
              {/* Viewport Controls */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-slate-700">Preview Size:</span>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {[
                    { key: 'desktop', icon: Monitor, label: 'Desktop' },
                    { key: 'tablet', icon: Tablet, label: 'Tablet' },
                    { key: 'mobile', icon: Smartphone, label: 'Mobile' }
                  ].map(({ key, icon: Icon, label }) => (
                    <Button
                      key={key}
                      variant={viewportSize === key ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewportSize(key as ViewportSize)}
                      className={viewportSize === key ? 'shadow-md' : ''}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Edit Mode Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-semibold text-slate-700">Edit Mode:</span>
                <Button
                  variant={showEditPanel ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowEditPanel(!showEditPanel)}
                  className="shadow-md"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {showEditPanel ? 'Exit Edit' : 'Start Editing'}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {hasModifications && (
                <Button variant="outline" size="sm" className="shadow-md">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              )}
              <Button variant="outline" size="sm" className="shadow-md">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="shadow-md">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-12 gap-8">
            {/* Preview Area */}
            <div className={`${showEditPanel && selectedElement ? 'col-span-8' : 'col-span-12'} transition-all duration-300`}>
              <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span>Portfolio Preview</span>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 flex justify-center">
                  <div className={`${getViewportClasses()} transition-all duration-500 bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-slate-200`}>
                    <iframe
                      ref={iframeRef}
                      srcDoc={currentHtml}
                      className="w-full h-full border-0"
                      title="Portfolio Preview"
                      onLoad={handleIframeLoad}
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Edit Panel */}
            {showEditPanel && selectedElement && (
              <div className="col-span-4">
                <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm sticky top-8">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Editing: {selectedElement.type}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectElement(null)}
                        className="text-xs"
            >
              {spacing}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Margin</label>
        <div className="grid grid-cols-3 gap-2">
          {spacings.map(spacing => (
            <Button
              key={spacing}
              variant="outline"
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, margin: spacing } })}
              className="text-xs"
            >
              {spacing}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Quick actions generator
const getQuickActionsForElement = (element: any) => {
  const baseActions = [
    {
      id: 'bigger',
      label: 'Bigger',
      icon: Plus,
      action: () => {
        const current = parseFloat(element.styles.fontSize || '16');
        return { styles: { ...element.styles, fontSize: `${Math.min(current * 1.2, 72)}px` } };
      }
    },
    {
      id: 'smaller',
      label: 'Smaller', 
      icon: Minus,
      action: () => {
        const current = parseFloat(element.styles.fontSize || '16');
        return { styles: { ...element.styles, fontSize: `${Math.max(current * 0.8, 10)}px` } };
      }
    },
    {
      id: 'bold',
      label: 'Bold',
      icon: Type,
      action: () => ({
        styles: { 
          ...element.styles, 
          fontWeight: element.styles.fontWeight === 'bold' ? 'normal' : 'bold' 
        }
      })
    },
    {
      id: 'center',
      label: 'Center',
      icon: Move,
      action: () => ({
        styles: { 
          ...element.styles, 
          textAlign: element.styles.textAlign === 'center' ? 'left' : 'center' 
        }
      })
    },
    {
      id: 'blue',
      label: 'Blue',
      icon: Palette,
      action: () => ({
        styles: { ...element.styles, color: '#3b82f6' }
      })
    },
    {
      id: 'highlight',
      label: 'Highlight',
      icon: Palette,
      action: () => ({
        styles: { ...element.styles, backgroundColor: '#fbbf24', padding: '8px 12px', borderRadius: '6px' }
      })
    }
  ];

  return baseActions;
};

export default EnhancedPreview;-white hover:bg-white/20"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Quick Actions */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-blue-500" />
                        Quick Actions
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {quickActions.slice(0, 6).map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={action.action}
                            className="h-auto p-3 flex flex-col items-center space-y-1 hover:shadow-lg transition-all"
                          >
                            <action.icon className="h-4 w-4" />
                            <span className="text-xs text-center">{action.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Style Controls */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Palette className="h-4 w-4 mr-2 text-purple-500" />
                        Colors & Style
                      </h3>
                      <ColorStyleControls 
                        element={selectedElement}
                        onModify={(changes) => modifyElement(selectedElement.id, changes)}
                      />
                    </div>

                    {/* Typography Controls */}
                    {['header', 'text', 'button'].includes(selectedElement.type) && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                          <Type className="h-4 w-4 mr-2 text-green-500" />
                          Typography
                        </h3>
                        <TypographyControls 
                          element={selectedElement}
                          onModify={(changes) => modifyElement(selectedElement.id, changes)}
                        />
                      </div>
                    )}

                    {/* Spacing Controls */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Move className="h-4 w-4 mr-2 text-orange-500" />
                        Spacing
                      </h3>
                      <SpacingControls 
                        element={selectedElement}
                        onModify={(changes) => modifyElement(selectedElement.id, changes)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Deploy Section */}
          <div className="flex justify-center mt-12 pt-8">
            <Card className="shadow-2xl border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-4">Ready to Go Live?</h3>
                <p className="mb-6 text-blue-100">
                  Your portfolio looks amazing! Deploy it to the web in one click.
                </p>
                <Button
                  onClick={() => {/* Deploy logic */}}
                  variant="secondary"
                  size="lg"
                  className="px-12 py-4 text-lg shadow-xl hover:shadow-2xl transition-all"
                  disabled={isLoading || isIncomplete}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5 mr-2" />
                      Deploy to Web
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const ColorStyleControls = ({ element, onModify }: any) => {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Text Color</label>
        <div className="flex space-x-2">
          {colors.map(color => (
            <button
              key={color}
              className="w-8 h-8 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => onModify({ styles: { ...element.styles, color } })}
            />
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Background</label>
        <div className="flex space-x-2">
          {colors.map(color => (
            <button
              key={color}
              className="w-8 h-8 rounded-full border-2 border-white shadow-lg hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => onModify({ styles: { ...element.styles, backgroundColor: color } })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TypographyControls = ({ element, onModify }: any) => {
  const sizes = ['14px', '16px', '18px', '24px', '32px', '48px'];
  const weights = ['300', '400', '500', '600', '700', '800'];
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Font Size</label>
        <div className="grid grid-cols-3 gap-2">
          {sizes.map(size => (
            <Button
              key={size}
              variant="outline"
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, fontSize: size } })}
              className="text-xs"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Font Weight</label>
        <div className="grid grid-cols-3 gap-2">
          {weights.map(weight => (
            <Button
              key={weight}
              variant="outline"
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, fontWeight: weight } })}
              className="text-xs"
            >
              {weight}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

const SpacingControls = ({ element, onModify }: any) => {
  const spacings = ['0px', '8px', '16px', '24px', '32px', '48px'];
  
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Padding</label>
        <div className="grid grid-cols-3 gap-2">
          {spacings.map(spacing => (
            <Button
              key={spacing}
              variant="outline"
              size="sm"
              onClick={() => onModify({ styles: { ...element.styles, padding: spacing } })}
              className="text