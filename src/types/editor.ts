import { LucideIcon } from 'lucide-react';
import { EditableElement } from '@/hooks/useHtmlParser';

// Quick action interface for one-click changes
export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  category?: 'size' | 'color' | 'typography' | 'layout' | 'spacing';
  description?: string;
}

// Smart suggestion interface for AI-powered improvements
export interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-1 scale for how confident the AI is
  action: () => void;
  category?: 'accessibility' | 'design' | 'usability' | 'modern' | 'professional';
  beforePreview?: string; // Optional preview of current state
  afterPreview?: string; // Optional preview of suggested state
}

// Edit session state
export interface EditSession {
  selectedElementId: string | null;
  modifications: Record<string, Partial<EditableElement>>;
  originalHtml: string;
  undoStack: EditOperation[];
  redoStack: EditOperation[];
}

// Individual edit operation for undo/redo
export interface EditOperation {
  id: string;
  elementId: string;
  type: 'style' | 'content' | 'attribute';
  before: any;
  after: any;
  timestamp: number;
}

// Style modification types
export interface StyleModification {
  property: keyof EditableElement['styles'];
  value: string;
  previous?: string;
}

// Content modification types
export interface ContentModification {
  content: string;
  previous?: string;
}

// Attribute modification types
export interface AttributeModification {
  attribute: string;
  value: string;
  previous?: string;
}

// Edit panel tab types
export type EditPanelTab = 'quick' | 'smart' | 'advanced';

// Element selection state
export interface SelectionState {
  elementId: string | null;
  element: EditableElement | null;
  bounds?: DOMRect;
  isEditing?: boolean;
}

// Quick action categories for organization
export const QUICK_ACTION_CATEGORIES = {
  SIZE: 'size',
  COLOR: 'color',
  TYPOGRAPHY: 'typography',
  LAYOUT: 'layout',
  SPACING: 'spacing'
} as const;

// Smart suggestion categories
export const SUGGESTION_CATEGORIES = {
  ACCESSIBILITY: 'accessibility',
  DESIGN: 'design',
  USABILITY: 'usability',
  MODERN: 'modern',
  PROFESSIONAL: 'professional'
} as const;

// Element type specific actions
export interface ElementTypeActions {
  header: QuickAction[];
  text: QuickAction[];
  button: QuickAction[];
  image: QuickAction[];
  link: QuickAction[];
  section: QuickAction[];
}

// Smart suggestion confidence levels
export const CONFIDENCE_LEVELS = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.8,
  VERY_HIGH: 0.9
} as const;

// Edit history for undo/redo
export interface EditHistory {
  operations: EditOperation[];
  currentIndex: number;
  maxSize: number;
}

// Common color palettes for quick actions
export const COLOR_PALETTES = {
  PRIMARY: ['#3b82f6', '#2563eb', '#1d4ed8'],
  SUCCESS: ['#10b981', '#059669', '#047857'],
  WARNING: ['#f59e0b', '#d97706', '#b45309'],
  DANGER: ['#ef4444', '#dc2626', '#b91c1c'],
  NEUTRAL: ['#6b7280', '#4b5563', '#374151'],
  ACCENT: ['#8b5cf6', '#7c3aed', '#6d28d9']
} as const;

// Typography scale for quick sizing
export const TYPOGRAPHY_SCALE = {
  SMALL: ['12px', '14px', '16px'],
  MEDIUM: ['18px', '20px', '24px'],
  LARGE: ['28px', '32px', '36px'],
  XLARGE: ['42px', '48px', '56px']
} as const;

// Spacing scale for consistent spacing
export const SPACING_SCALE = {
  TIGHT: ['4px', '8px', '12px'],
  NORMAL: ['16px', '20px', '24px'],
  LOOSE: ['32px', '40px', '48px'],
  EXTRA_LOOSE: ['64px', '80px', '96px']
} as const;