import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Types
interface EditorSession {
  id: string;
  currentHtml: string;
  portfolioData: any;
  lastModified: string;
  historyLength: number;
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

interface ValidationResult {
  overall: { score: number; status: string };
  content: { score: number; issues: any[]; suggestions: any[] };
  design: { score: number; issues: any[]; suggestions: any[] };
  technical: { score: number; issues: any[]; suggestions: any[] };
  accessibility: { score: number; issues: any[]; suggestions: any[] };
}

interface AutoSaveResponse {
  success: boolean;
  message: string;
  timestamp: string;
  historyLength: number;
}

interface SaveResponse {
  success: boolean;
  message: string;
  timestamp: string;
  historyLength: number;
  canUndo: boolean;
  canRedo: boolean;
}

interface UndoRedoResponse {
  success: boolean;
  currentHtml: string;
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

interface ValidationResponse {
  success: boolean;
  validation: ValidationResult;
  autoFixesApplied: string[];
  fixedHtml: string | null;
  recommendations: any[];
}

interface ParsedElement {
  id: string;
  type: 'text' | 'header' | 'button' | 'image' | 'section' | 'container';
  tagName: string;
  content: string;
  styles: Record<string, string>;
  attributes: Record<string, string>;
}

class VisualEditorApi {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('🚨 API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('🚨 API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Create or get editor session
  async createSession(portfolioData: any, htmlContent: string, sessionId?: string): Promise<EditorSession> {
    try {
      const response = await this.axiosInstance.post('/api/visual-editor/session', {
        portfolioData,
        htmlContent,
        sessionId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create session');
      }

      // Immediately get the full session data
      return await this.getSession(response.data.sessionId);
    } catch (error) {
      console.error('Failed to create editor session:', error);
      throw error;
    }
  }

  // Get session data
  async getSession(sessionId: string): Promise<EditorSession> {
    try {
      const response = await this.axiosInstance.get(`/api/visual-editor/session/${sessionId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get session');
      }

      return response.data.session;
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  // Auto-save changes
  async autoSave(sessionId: string, htmlContent: string, changeDescription?: string): Promise<AutoSaveResponse> {
    try {
      const response = await this.axiosInstance.post('/api/visual-editor/auto-save', {
        sessionId,
        htmlContent,
        changeDescription: changeDescription || 'auto-save'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Auto-save failed');
      }

      return response.data;
    } catch (error) {
      console.error('Auto-save failed:', error);
      throw error;
    }
  }

  // Manual save with history
  async save(sessionId: string, htmlContent: string, changeDescription?: string): Promise<SaveResponse> {
    try {
      const response = await this.axiosInstance.post('/api/visual-editor/save', {
        sessionId,
        htmlContent,
        changeDescription
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Save failed');
      }

      return response.data;
    } catch (error) {
      console.error('Save failed:', error);
      throw error;
    }
  }

  // Undo changes
  async undo(sessionId: string): Promise<UndoRedoResponse> {
    try {
      const response = await this.axiosInstance.post(`/api/visual-editor/undo/${sessionId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Undo failed');
      }

      return response.data;
    } catch (error) {
      console.error('Undo failed:', error);
      throw error;
    }
  }

  // Redo changes
  async redo(sessionId: string): Promise<UndoRedoResponse> {
    try {
      const response = await this.axiosInstance.post(`/api/visual-editor/redo/${sessionId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Redo failed');
      }

      return response.data;
    } catch (error) {
      console.error('Redo failed:', error);
      throw error;
    }
  }

  // Real-time validation
  async validate(sessionId: string, htmlContent: string, validationType: 'full' | 'quick' = 'full'): Promise<ValidationResponse> {
    try {
      const response = await this.axiosInstance.post('/api/visual-editor/validate', {
        sessionId,
        htmlContent,
        validationType
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Validation failed');
      }

      return response.data;
    } catch (error) {
      console.error('Validation failed:', error);
      throw error;
    }
  }

  // Parse HTML to extract elements
  async parseHtml(htmlContent: string): Promise<ParsedElement[]> {
    try {
      const response = await this.axiosInstance.post('/api/visual-editor/parse-html', {
        htmlContent
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'HTML parsing failed');
      }

      return response.data.elements;
    } catch (error) {
      console.error('HTML parsing failed:', error);
      throw error;
    }
  }

  // Modify element
  async modifyElement(
    sessionId: string, 
    elementId: string, 
    changes: { content?: string; styles?: Record<string, string>; attributes?: Record<string, string> }
  ): Promise<{ success: boolean; modifiedHtml: string }> {
    try {
      const response = await this.axiosInstance.patch(
        `/api/visual-editor/element/${sessionId}/${elementId}`,
        changes
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Element modification failed');
      }

      return response.data;
    } catch (error) {
      console.error('Element modification failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/health');
      return response.data.status === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const visualEditorApi = new VisualEditorApi();
export default visualEditorApi;

// Export types for use in components
export type {
  EditorSession,
  ValidationResult,
  AutoSaveResponse,
  SaveResponse,
  UndoRedoResponse,
  ValidationResponse,
  ParsedElement
};