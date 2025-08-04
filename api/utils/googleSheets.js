const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

class GoogleSheetsTracker {
  constructor(config) {
    try {
      // Validate required config - return gracefully if missing
      if (!config || !config.clientEmail || !config.privateKey || !config.sheetId) {
        console.warn('Google Sheets Tracker: Missing required configuration (clientEmail, privateKey, or sheetId) - tracker disabled');
        this.initialized = false;
        this.sheets = null;
        this.sheetId = null;
        this.sheetName = null;
        return;
      }

      // Clean and validate the private key
      let cleanPrivateKey = config.privateKey;
      if (typeof cleanPrivateKey === 'string') {
        // Handle escaped newlines and ensure proper formatting
        cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, '\n');
        
        // Ensure the key has proper BEGIN/END markers
        if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          console.error('Google Sheets Tracker: Invalid private key format - missing BEGIN marker');
          this.initialized = false;
          return;
        }
      } else {
        console.error('Google Sheets Tracker: Private key must be a string');
        this.initialized = false;
        return;
      }

      const auth = new JWT({
        email: config.clientEmail,
        key: cleanPrivateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.sheetId = config.sheetId;
      this.sheetName = config.sheetName || 'Sheet1'; // Default to Sheet1 if not specified
      this.initialized = true;
      
      // Only log success in development to reduce Vercel logs
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Google Sheets Tracker initialized successfully for sheet: ${this.sheetId}`);
      }
    } catch (error) {
      console.error('❌ Google Sheets Tracker initialization failed:', error.message);
      this.initialized = false;
      this.sheets = null;
      this.sheetId = null;
      this.sheetName = null;
    }
  }

  async appendData(data, userAgent, screenSize) {
    if (!this.initialized || !this.sheets) {
      console.warn('⚠️ Google Sheets Tracker not initialized - skipping tracking');
      return false;
    }

    try {
      // Validate data object
      if (!data || typeof data !== 'object') {
        console.warn('⚠️ Invalid data provided to Google Sheets tracker');
        return false;
      }

      // Get the next available row with timeout
      const response = await Promise.race([
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: `${this.sheetName}!A:A`, // Check column A for timestamps
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
        )
      ]);

      const rows = response.data.values || [];
      const nextRow = rows.length + 1;

      // Safely extract data with fallbacks
      const personalInfo = data.personalInfo || {};
      const projects = data.projects || [];
      const stylePreferences = data.stylePreferences || {};
      const trackingInfo = data.trackingInfo || {};

      // Prepare the data in the correct order matching server.js data structure
      const values = [
        [
          new Date().toISOString(), // Timestamp
          personalInfo.name || '', // Full Name
          personalInfo.email || '', // Email
          personalInfo.title || '', // Title
          personalInfo.experience || '', // Experience
          personalInfo.education || '', // Education
          Array.isArray(personalInfo.skills) ? personalInfo.skills.join(', ') : (personalInfo.skills || ''), // Skills
          projects.length || 0, // Number of Projects
          projects.map(p => p.category || p.customCategory || '').filter(Boolean).join(', '), // Project Categories
          projects.flatMap(p => Array.isArray(p.tags) ? p.tags : []).filter(Boolean).join(', '), // Project Tags
          stylePreferences.colorScheme || '', // Style - Color Scheme
          stylePreferences.layoutStyle || '', // Style - Layout
          stylePreferences.typography || '', // Style - Typography
          stylePreferences.mood || '', // Style - Mood
          personalInfo.linkedin || '', // LinkedIn
          personalInfo.instagram || '', // Instagram
          personalInfo.behance || '', // Behance
          personalInfo.dribbble || '', // Dribbble
          personalInfo.website || '', // Website
          userAgent || 'unknown', // Browser (User Agent)
          screenSize || 'unknown', // Screen Size
          this.getDeviceType(userAgent), // Device Type
          trackingInfo.language || 'unknown', // Language
          trackingInfo.timezone || 'unknown', // Timezone
          data.tier || 'Free', // Tier
        ]
      ];

      // Append with timeout
      await Promise.race([
        this.sheets.spreadsheets.values.append({
          spreadsheetId: this.sheetId,
          range: `${this.sheetName}!A${nextRow}`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values,
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Append timeout')), 15000) // 15 second timeout
        )
      ]);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Successfully tracked data in Google Sheets (${this.sheetId})`);
      }
      return true;
    } catch (error) {
      console.error('❌ Error writing to Google Sheets:', error.message);
      
      // Log specific error details for debugging
      if (error.code) {
        console.error('Error code:', error.code);
        
        // Handle specific error codes
        if (error.code === 404) {
          console.error('Sheet not found - check GOOGLE_SHEETS_ID and sheet name');
        } else if (error.code === 403) {
          console.error('Access denied - check service account permissions');
        } else if (error.code === 429) {
          console.error('Rate limit exceeded - too many requests');
        }
      }
      
      if (error.errors && Array.isArray(error.errors)) {
        console.error('Error details:', error.errors.map(e => e.message).join(', '));
      }
      
      return false;
    }
  }

  getDeviceType(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return 'Unknown';
    
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
    if (!this.initialized || !this.sheets) {
      console.error('❌ Google Sheets Tracker not initialized');
      return false;
    }
    
    try {
      const response = await Promise.race([
        this.sheets.spreadsheets.get({
          spreadsheetId: this.sheetId,
          fields: 'properties.title,sheets.properties.title',
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
      
      console.log(`✅ Connected to Google Sheet: "${response.data.properties.title}"`);
      const sheetExists = response.data.sheets.some(sheet => 
        sheet.properties.title === this.sheetName
      );
      
      if (!sheetExists) {
        console.warn(`⚠️ Sheet "${this.sheetName}" not found in spreadsheet. Available sheets:`, 
          response.data.sheets.map(s => s.properties.title));
        return false;
      }
      
      console.log(`✅ Sheet "${this.sheetName}" found and accessible`);
      return true;
    } catch (error) {
      console.error('❌ Google Sheets connection verification failed:', error.message);
      if (error.message === 'Connection timeout') {
        console.error('Connection timed out - check network connectivity');
      } else if (error.code === 404) {
        console.error('Sheet not found - check GOOGLE_SHEETS_ID');
      } else if (error.code === 403) {
        console.error('Access denied - check service account permissions');
      }
      return false;
    }
  }

  // Method to get sheet headers (useful for debugging)
  async getHeaders() {
    if (!this.initialized || !this.sheets) return null;
    
    try {
      const response = await Promise.race([
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetId,
          range: `${this.sheetName}!1:1`,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Headers timeout')), 10000)
        )
      ]);
      
      return response.data.values?.[0] || [];
    } catch (error) {
      console.error('❌ Error getting sheet headers:', error.message);
      return null;
    }
  }

  // Method to ensure headers exist (call this during initialization)
  async ensureHeaders() {
    if (!this.initialized || !this.sheets) return false;
    
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
        
        await Promise.race([
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.sheetId,
            range: `${this.sheetName}!1:1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [defaultHeaders],
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Headers update timeout')), 15000)
          )
        ]);
        
        console.log('✅ Headers created in Google Sheet');
        return true;
      }
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Headers already exist in Google Sheet');
      }
      return true;
    } catch (error) {
      console.error('❌ Error ensuring headers:', error.message);
      return false;
    }
  }

  // Helper method to check if tracker is ready
  isReady() {
    return this.initialized && this.sheets !== null;
  }

  // Helper method to get configuration status
  getStatus() {
    return {
      initialized: this.initialized,
      hasSheets: this.sheets !== null,
      sheetId: this.sheetId,
      sheetName: this.sheetName
    };
  }
}

module.exports = { GoogleSheetsTracker };