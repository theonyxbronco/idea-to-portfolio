const { google } = require('googleapis');
const { JWT } = require('google-auth-library');

class GoogleSheetsTracker {
  constructor(config) {
    try {
      const auth = new JWT({
        email: config.clientEmail,
        key: config.privateKey.replace(/\\n/g, '\n'), // Handle newlines in private key
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      this.sheetId = config.sheetId;
      this.sheetName = config.sheetName || 'Sheet1'; // Default to Sheet1 if not specified
      this.initialized = true;
      console.log('Google Sheets Tracker initialized successfully');
    } catch (error) {
      console.error('Google Sheets Tracker initialization failed:', error);
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

      console.log('Successfully tracked data in Google Sheets');
      return true;
    } catch (error) {
      console.error('Error writing to Google Sheets:', error.message);
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

  // Optional: Method to verify connection
  async verifyConnection() {
    if (!this.initialized) return false;
    
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId,
        fields: 'properties.title',
      });
      return true;
    } catch (error) {
      console.error('Google Sheets connection verification failed:', error);
      return false;
    }
  }
}

module.exports = { GoogleSheetsTracker };