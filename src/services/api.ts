// src/services/api.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative path for Vercel
  : 'http://localhost:3001/api';

  
export interface PortfolioData {
  personalInfo: {
    name: string;
    title: string;
    bio: string;
    email: string;
    phone: string;
    website: string;
    linkedin: string;
    instagram: string;
    behance: string;
    dribbble: string;
    skills: string[];
    experience: string;
    education: string;
  };
  projects: Array<{
    title: string;
    subtitle: string;
    overview: string;
    category: string;
    customCategory: string;
    tags: string[];
    problem: string;
    solution: string;
    reflection: string;
    processImages: File[];
    finalProductImage: File | null;
  }>;
  moodboardImages: File[];
  stylePreferences: {
    colorScheme: string;
    layoutStyle: string;
    typography: string;
    mood: string;
  };
}

export interface GeneratedPortfolio {
  html: string;
  css?: string;
  metadata: {
    title: string;
    description: string;
  };
}

export interface ApiResponse {
  success: boolean;
  portfolio: GeneratedPortfolio;
  metadata: {
    generatedAt: string;
    userInfo: {
      name: string;
      title: string;
    };
  };
  error?: string;
  details?: string;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get full API URL
  private getApiUrl(endpoint: string): string {
    // Remove duplicate /api if it exists in endpoint
    const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;
    return `${this.baseURL}${cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`}`;
  }

  async generatePortfolio(portfolioData: PortfolioData): Promise<ApiResponse> {
    try {
      // Prepare form data
      const formData = new FormData();
      
      // Add portfolio data as JSON
      formData.append('portfolioData', JSON.stringify(portfolioData));

      // Add process images
      portfolioData.projects.forEach((project, projectIndex) => {
        project.processImages.forEach((image, imageIndex) => {
          formData.append('processImages', image, `project_${projectIndex}_process_${imageIndex}`);
        });
        
        if (project.finalProductImage) {
          formData.append('finalProductImages', project.finalProductImage, `project_${projectIndex}_final`);
        }
      });

      // Add moodboard images
      portfolioData.moodboardImages.forEach((image, index) => {
        formData.append('moodboardImages', image, `moodboard_${index}`);
      });

      // Fixed: Remove duplicate /api in the URL
      const response = await fetch(this.getApiUrl('/generate-portfolio'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      // Fixed: Remove duplicate /api in the URL
      const response = await fetch(this.getApiUrl('/health'));
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Additional API methods you might need
  async saveUserInfo(personalInfo: any, userEmail: string): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl('/save-user-info'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalInfo, userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save user info error:', error);
      throw error;
    }
  }

  async getUserInfo(email: string): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl(`/get-user-info?email=${encodeURIComponent(email)}`));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  }

  async saveProject(projectData: any, files: File[]): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('projectData', JSON.stringify(projectData));
      
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      const response = await fetch(this.getApiUrl('/save-project'), {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Save project error:', error);
      throw error;
    }
  }

  async getUserProjects(email: string): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl(`/get-user-projects?email=${encodeURIComponent(email)}`));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user projects error:', error);
      throw error;
    }
  }

  async deployToNetlify(htmlContent: string, netlifyToken: string, personName: string): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl('/deploy-folder-to-netlify'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlContent, netlifyToken, personName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Deploy to Netlify error:', error);
      throw error;
    }
  }

  async aiEditPortfolio(htmlContent: string, editRequest: string, isContinuation?: boolean, partialHtml?: string): Promise<any> {
    try {
      const response = await fetch(this.getApiUrl('/ai-edit-portfolio'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          htmlContent, 
          editRequest, 
          isContinuation, 
          partialHtml 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI edit portfolio error:', error);
      throw error;
    }
  }

  // Utility method to validate file types and sizes
  validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const valid: File[] = [];
    const errors: string[] = [];
    const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }

      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
        errors.push(`${file.name}: File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      valid.push(file);
    });

    return { valid, errors };
  }

  // Utility method to convert file to base64 (for debugging/preview)
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}

export const apiService = new ApiService();
export default apiService;