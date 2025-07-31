const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

class GoogleSheetsTracker {
  constructor(config) {
    try {
      // Validate required config
      if (!config.clientEmail || !config.privateKey || !config.sheetId) {
        console.error('Google Sheets Tracker: Missing required configuration (clientEmail, privateKey, or sheetId)');
        this.initialized = false;
        return;
      }

      const auth = new JWT({
        email: config.clientEmail,
        key: config.privateKey.replace(/\\n/g, '\n'), // Handle newlines in private key
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.sheetId = config.sheetId;
      this.sheetName = config.sheetName || 'Sheet1'; // Default to Sheet1 if not specified
      this.initialized = true;
      console.log(`Google Sheets Tracker initialized successfully for sheet: ${this.sheetId}`);
    } catch (error) {
      console.error('Google Sheets Tracker initialization failed:', error.message);
      this.initialized = false;
    }
  }

  async appendData(data, userAgent, screenSize) {
    if (!this.initialized) {
      console.warn('Google Sheets Tracker not initialized - skipping tracking');
      return false;
    }

    try {
      // Get the next available row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A:A`, // Check column A for timestamps
      });

      const rows = response.data.values || [];
      const nextRow = rows.length + 1;

      // Prepare the data in the correct order matching server.js data structure
      const values = [
        [
          new Date().toISOString(), // Timestamp
          data.personalInfo?.name || '', // Full Name
          data.personalInfo?.email || '', // Email
          data.personalInfo?.title || '', // Title
          data.personalInfo?.experience || '', // Experience
          data.personalInfo?.education || '', // Education
          data.personalInfo?.skills?.join(', ') || '', // Skills
          data.projects?.length || 0, // Number of Projects
          data.projects?.map(p => p.category || p.customCategory || '').join(', ') || '', // Project Categories
          data.projects?.flatMap(p => p.tags || []).join(', ') || '', // Project Tags
          data.stylePreferences?.colorScheme || '', // Style - Color Scheme
          data.stylePreferences?.layoutStyle || '', // Style - Layout
          data.stylePreferences?.typography || '', // Style - Typography
          data.stylePreferences?.mood || '', // Style - Mood
          data.personalInfo?.linkedin || '', // LinkedIn
          data.personalInfo?.instagram || '', // Instagram
          data.personalInfo?.behance || '', // Behance
          data.personalInfo?.dribbble || '', // Dribbble
          data.personalInfo?.website || '', // Website
          userAgent || 'unknown', // Browser (User Agent)
          screenSize || 'unknown', // Screen Size
          this.getDeviceType(userAgent), // Device Type
          data.trackingInfo?.language || 'unknown', // Language
          data.trackingInfo?.timezone || 'unknown', // Timezone
          data.tier || 'Free', // Tier
        ]
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!A${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });

      console.log(`Successfully tracked data in Google Sheets (${this.sheetId})`);
      return true;
    } catch (error) {
      console.error('Error writing to Google Sheets:', error.message);
      // Log more details for debugging
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.errors) {
        console.error('Error details:', error.errors);
      }
      return false;
    }
  }

  getDeviceType(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) {
      return 'Mobile';
    } else if (ua.includes('tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  // Method to verify connection and sheet access
  async verifyConnection() {
    if (!this.initialized) {
      console.error('Google Sheets Tracker not initialized');
      return false;
    }
    
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId,
        fields: 'properties.title,sheets.properties.title',
      });
      
      console.log(`Connected to Google Sheet: "${response.data.properties.title}"`);
      const sheetExists = response.data.sheets.some(sheet => 
        sheet.properties.title === this.sheetName
      );
      
      if (!sheetExists) {
        console.warn(`Sheet "${this.sheetName}" not found in spreadsheet. Available sheets:`, 
          response.data.sheets.map(s => s.properties.title));
        return false;
      }
      
      console.log(`Sheet "${this.sheetName}" found and accessible`);
      return true;
    } catch (error) {
      console.error('Google Sheets connection verification failed:', error.message);
      if (error.code === 404) {
        console.error('Sheet not found - check GOOGLE_SHEETS_ID1');
      } else if (error.code === 403) {
        console.error('Access denied - check service account permissions');
      }
      return false;
    }
  }

  // Method to get sheet headers (useful for debugging)
  async getHeaders() {
    if (!this.initialized) return null;
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: `${this.sheetName}!1:1`,
      });
      
      return response.data.values?.[0] || [];
    } catch (error) {
      console.error('Error getting sheet headers:', error.message);
      return null;
    }
  }

  // Method to ensure headers exist (call this during initialization)
  async ensureHeaders() {
    if (!this.initialized) return false;
    
    try {
      const headers = await this.getHeaders();
      
      if (!headers || headers.length === 0) {
        // Create default headers
        const defaultHeaders = [
          'Timestamp', 'Full Name', 'Email', 'Title', 'Experience', 'Education', 
          'Skills', 'Number of Projects', 'Project Categories', 'Project Tags',
          'Style - Color Scheme', 'Style - Layout', 'Style - Typography', 'Style - Mood',
          'LinkedIn', 'Instagram', 'Behance', 'Dribbble', 'Website',
          'Browser', 'Screen Size', 'Device Type', 'Language', 'Timezone', 'Tier'
        ];
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.sheetId,
          range: `${this.sheetName}!1:1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [defaultHeaders],
          },
        });
        
        console.log('Headers created in Google Sheet');
        return true;
      }
      
      console.log('Headers already exist in Google Sheet');
      return true;
    } catch (error) {
      console.error('Error ensuring headers:', error.message);
      return false;
    }
  }
}

module.exports = { GoogleSheetsTracker };