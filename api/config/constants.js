/**
 * Centralized configuration constants for the Portfolio Generator API
 */

// Google Sheets Configuration
const GOOGLE_SHEETS_CONFIG = {
  USER_INFO: {
    sheetId: process.env.GOOGLE_SHEETS_ID3,
    sheetName: process.env.GOOGLE_SHEETS_NAME2 || 'User Info',
  },
  PROJECT_INFO: {
    sheetId: process.env.GOOGLE_SHEETS_ID3,
    sheetName: process.env.GOOGLE_SHEETS_NAME3 || 'Project Info',
  },
  DEPLOYMENT_TRACKING: {
    sheetId: process.env.GOOGLE_SHEETS_ID1,
    sheetName: process.env.GOOGLE_SHEETS_NAME1,
  },
  PORTFOLIO_DRAFTS: {
    sheetId: process.env.GOOGLE_SHEETS_ID3,
    sheetName: process.env.GOOGLE_SHEETS_NAME4 || 'Portfolio Drafts',
  },
  CREDENTIALS: {
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  }
};

// User Tier Configuration
const USER_TIERS = {
  FREE: 'Free',
  STUDENT: 'Student',
  PRO: 'Pro'
};

const TIER_LIMITS = {
  [USER_TIERS.FREE]: {
    maxProjects: 3,
    maxDeployments: 1,
    maxDrafts: 1,
    features: ['basic-templates', 'cloudinary-uploads']
  },
  [USER_TIERS.STUDENT]: {
    maxProjects: 10,
    maxDeployments: 5,
    maxDrafts: 5,
    features: ['basic-templates', 'premium-templates', 'cloudinary-uploads', 'custom-domain']
  },
  [USER_TIERS.PRO]: {
    maxProjects: -1, // unlimited
    maxDeployments: -1, // unlimited
    maxDrafts: -1, // unlimited
    features: ['all-templates', 'cloudinary-uploads', 'custom-domain', 'priority-support', 'analytics']
  }
};

// File Upload Configuration
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  MAX_FILES: 50,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  TEMP_DIR: process.env.NODE_ENV === 'production' || process.env.VERCEL ? '/tmp' : 'temp',
};

// Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20,
  DISABLED: process.env.DISABLE_RATE_LIMIT === 'true',
};

// CORS Configuration
const CORS_CONFIG = {
  ALLOWED_ORIGINS: [
    'https://moodi-bice.vercel.app',
    process.env.CORS_ORIGIN,
  ].filter(Boolean),
  DEVELOPMENT_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173'
  ],
  METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Portfolio Validation Limits
const VALIDATION_LIMITS = {
  MIN_PROJECTS: 1,
  MAX_PROJECTS: 6,
  MAX_TEXT_LENGTH: 1000,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
};

// Netlify Configuration
const NETLIFY_CONFIG = {
  API_BASE_URL: 'https://api.netlify.com/api/v1',
  DEPLOY_TIMEOUT: 300000, // 5 minutes
};

// Skeleton Templates
const SKELETON_TEMPLATES = {
  NEWSPAPER: 'newspaper',
  STORYTELLER: 'storyteller',
  CREATIVE_PROFESSIONAL: 'creative-professional',
  GALLERY_FIRST: 'gallery-first',
};

// API Response Messages
const MESSAGES = {
  ERRORS: {
    UNAUTHORIZED: 'Unauthorized access',
    NOT_FOUND: 'Resource not found',
    VALIDATION_FAILED: 'Validation failed',
    INTERNAL_ERROR: 'Internal server error',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds limit',
    GOOGLE_SHEETS_NOT_CONFIGURED: 'Google Sheets integration not configured',
    NETLIFY_DEPLOYMENT_FAILED: 'Netlify deployment failed',
    PAYMENT_REQUIRED: 'Payment required to access this feature',
  },
  SUCCESS: {
    PORTFOLIO_GENERATED: 'Portfolio generated successfully',
    DEPLOYMENT_SUCCESSFUL: 'Deployment successful',
    PROJECT_SAVED: 'Project saved successfully',
    PROJECT_UPDATED: 'Project updated successfully',
    PROJECT_DELETED: 'Project deleted successfully',
  }
};

module.exports = {
  GOOGLE_SHEETS_CONFIG,
  USER_TIERS,
  TIER_LIMITS,
  UPLOAD_CONFIG,
  RATE_LIMIT_CONFIG,
  CORS_CONFIG,
  VALIDATION_LIMITS,
  NETLIFY_CONFIG,
  SKELETON_TEMPLATES,
  MESSAGES,
};
