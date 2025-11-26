# Portfolio Generator API

Backend API for AI-powered portfolio generation using Claude AI, Netlify deployment, and Google Sheets tracking.

## Features

- AI-powered portfolio generation using Claude (Anthropic)
- Multiple portfolio templates (Newspaper, Storyteller, Creative Professional, Gallery First)
- Image analysis and visual DNA extraction
- Automatic Netlify deployment
- User tier management (Free, Student, Pro)
- Google Sheets integration for tracking
- Cloudinary image uploads
- HTML validation and quality analysis

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI**: Anthropic Claude API
- **Deployment**: Netlify API
- **Storage**: Cloudinary, Google Sheets
- **Image Processing**: Sharp
- **HTML Parsing**: JSDOM

## Project Structure

```
api/
├── config/
│   └── constants.js          # Centralized configuration
├── middleware/
│   └── portfolioMiddleware.js # Request validation, rate limiting, security
├── services/
│   ├── googleSheetsService.js # Google Sheets operations
│   └── netlifyService.js      # Netlify deployment operations
├── utils/
│   ├── validators/            # HTML/content validators
│   │   ├── BaseValidator.js
│   │   ├── designValidator.js
│   │   ├── contentValidator.js
│   │   ├── technicalValidator.js
│   │   ├── accessibilityValidator.js
│   │   └── qualityAnalyzer.js
│   ├── cloudinaryUploader.js  # Image upload handling
│   ├── fileProcessor.js       # Image processing
│   ├── googleSheets.js        # Google Sheets tracker
│   ├── htmlValidator.js       # HTML validation
│   ├── imageParser.js         # Visual DNA extraction
│   ├── logger.js              # Centralized logging
│   ├── promptGenerator.js     # AI prompt generation
│   └── validation.js          # Input validation
├── skeletons/                 # HTML portfolio templates
├── server.js                  # Main Express server
├── package.json
└── vercel.json               # Vercel deployment config
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Anthropic API key
- Netlify account (optional, for deployments)
- Google Cloud Service Account (optional, for sheets tracking)
- Cloudinary account (optional, for image uploads)

### Installation

1. Clone the repository:
```bash
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (see `.env.example` for required variables)

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Required Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

### Optional Variables

- `CORS_ORIGIN` - Additional CORS origin to allow
- `GOOGLE_SHEETS_CLIENT_EMAIL` - Service account email
- `GOOGLE_SHEETS_PRIVATE_KEY` - Service account private key
- `GOOGLE_SHEETS_ID1` - Deployment tracking sheet ID
- `GOOGLE_SHEETS_ID3` - User/project info sheet ID
- `GOOGLE_SHEETS_NAME1` - Deployment sheet name
- `GOOGLE_SHEETS_NAME2` - User info sheet name
- `GOOGLE_SHEETS_NAME3` - Project info sheet name
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `MAX_FILE_SIZE` - Maximum upload file size (bytes)
- `RATE_LIMIT_WINDOW` - Rate limit window (ms)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `DISABLE_RATE_LIMIT` - Set to 'true' to disable rate limiting

## API Endpoints

### Health & Utility

#### **GET /api/health**
Health check endpoint with service status monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-25T12:00:00.000Z",
  "uptime": 3600,
  "services": {
    "googleSheets": "operational",
    "cloudinary": "operational",
    "anthropic": "operational"
  },
  "environment": "production"
}
```

### User Management

#### **POST /api/create-user**
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "tier": "free"
}
```

#### **GET /api/get-user**
Get user information by email.

**Query:** `?email=user@example.com`

#### **GET /api/check-user-limits**
Check user tier limits and current usage.

**Query:** `?email=user@example.com`

**Response:**
```json
{
  "success": true,
  "data": {
    "tier": "free",
    "limits": { "maxProjects": 5, "maxPortfolios": 1 },
    "usage": { "projects": 3, "portfolios": 1 },
    "canCreate": { "projects": true, "portfolios": false }
  }
}
```

#### **POST /api/upgrade-user-tier**
Upgrade user's tier (Free → Student → Pro).

**Request:**
```json
{
  "email": "user@example.com",
  "newTier": "pro",
  "paymentInfo": { "stripeSessionId": "cs_..." }
}
```

### Project Management

#### **POST /api/save-project**
Save a new project with images (multipart/form-data).

**Form Fields:**
- `projectData` (JSON): Project metadata
- `final_image` (file): Final product image
- `process_*` (files): Process images

**Project Data:**
```json
{
  "userEmail": "user@example.com",
  "title": "E-commerce Website",
  "subtitle": "Modern shopping platform",
  "problem": "Challenge description",
  "solution": "How it was solved",
  "reflection": "What was learned",
  "category": "Web Development",
  "tags": ["React", "Node.js"]
}
```

#### **POST /api/update-project**
Update an existing project (includes `id` in projectData).

#### **GET /api/get-user-projects**
Retrieve all active projects for a user.

**Query:** `?email=user@example.com`

#### **DELETE /api/delete-project**
Soft delete a project.

**Request:**
```json
{
  "projectId": "project_123",
  "userEmail": "user@example.com"
}
```

#### **POST /api/save-multiple-projects**
Bulk save multiple projects with images.

### Portfolio Management

#### **POST /api/generate**
Generate a portfolio using AI based on projects and preferences.

**Request:**
```json
{
  "userEmail": "user@example.com",
  "projects": [...],
  "skeleton": "modern",
  "preferences": {
    "style": "modern",
    "colorScheme": "dark"
  }
}
```

**Response:**
```json
{
  "success": true,
  "portfolioId": "portfolio_abc123",
  "html": "<html>...</html>",
  "generatedAt": "2024-11-25T12:00:00.000Z"
}
```

#### **POST /api/save-portfolio**
Save a generated portfolio to Google Sheets.

#### **GET /api/get-user-portfolios**
Retrieve all portfolios for a user.

**Query:** `?email=user@example.com`

#### **POST /api/update-portfolio**
Update an existing portfolio.

#### **DELETE /api/delete-portfolio**
Delete a portfolio.

### Draft Management

#### **POST /api/save-draft**
Save a portfolio draft for later editing.

#### **GET /api/get-user-drafts**
Retrieve all drafts for a user.

**Query:** `?email=user@example.com`

#### **DELETE /api/delete-draft**
Delete a draft.

### Deployment

#### **POST /api/deploy**
Deploy a portfolio to Netlify.

**Request:**
```json
{
  "portfolioId": "portfolio_123",
  "userEmail": "user@example.com",
  "siteName": "my-portfolio",
  "htmlContent": "<html>...</html>"
}
```

**Response:**
```json
{
  "success": true,
  "deploymentId": "deploy_abc123",
  "url": "https://my-portfolio.netlify.app",
  "status": "deployed"
}
```

#### **GET /api/get-user-deployments**
Retrieve all deployments for a user.

**Query:** `?email=user@example.com`

#### **DELETE /api/delete-deployment**
Delete a deployment from Netlify.

## User Tiers

- **Free**: 3 projects, 1 deployment, basic templates
- **Student**: 10 projects, 5 deployments, premium templates
- **Pro**: Unlimited projects/deployments, all features

## Validation

The API performs comprehensive validation:

- **Design Validation**: Color schemes, typography, layout consistency
- **Content Validation**: Completeness, quality, metadata
- **Technical Validation**: HTML structure, performance, SEO
- **Accessibility Validation**: WCAG compliance, semantic HTML
- **Quality Analysis**: Orchestrates all validators

## Error Handling

All endpoints return errors in a consistent format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details (development only)"
}
```

## Rate Limiting

- Default: 20 requests per 15 minutes
- Configurable via environment variables
- Can be disabled in development

## Security Features

- CORS protection with whitelist
- Security headers (Helmet.js style)
- Request size limits (50MB)
- File type validation
- Rate limiting
- Input sanitization

## Logging

Centralized logging with consistent formatting:
- `logger.info()` - General information
- `logger.success()` - Success messages
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- `logger.debug()` - Debug info (development only)

## Deployment

### Vercel

The API is configured for Vercel deployment:

```bash
vercel deploy
```

Configuration is in `vercel.json`:
- Max duration: 300s (5 minutes)
- Max lambda size: 50MB
- Automatic HTTPS

### Local Development

```bash
npm run dev  # Uses nodemon for hot reload
```

## Testing

```bash
npm test
```

## Contributing

1. Follow existing code style
2. Add JSDoc comments to functions
3. Update tests for new features
4. Use the centralized logger
5. Follow the service/controller pattern

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
