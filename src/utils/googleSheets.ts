import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  sheetId: string;
}

export class GoogleSheetsTracker {
  private sheets: any;
  private sheetId: string;

  constructor(config: GoogleSheetsConfig) {
    const auth = new JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.sheetId = config.sheetId;
  }

  async appendData(data: Record<string, any>, userAgent: string, screenSize: string) {
    try {
      // Get the next available row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: 'A:A', // Check column A for timestamps
      });

      const rows = response.data.values || [];
      const nextRow = rows.length + 1;

      // Prepare the data in the correct order
      const values = [
        [
          new Date().toISOString(), // Timestamp
          data.personalInfo.name, // Full Name
          data.personalInfo.email, // Email
          data.personalInfo.title, // Title
          data.personalInfo.experience, // Experience
          data.personalInfo.education, // Education
          data.personalInfo.skills.join(', '), // Skills
          data.projects.length, // Number of Projects
          data.projects.map(p => p.category || p.customCategory).join(', '), // Project Categories
          data.projects.flatMap(p => p.tags).join(', '), // Project Tags
          data.stylePreferences.colorScheme, // Style - Color Scheme
          data.stylePreferences.layoutStyle, // Style - Layout
          data.stylePreferences.typography, // Style - Typography
          data.stylePreferences.mood, // Style - Mood
          data.personalInfo.linkedin, // LinkedIn
          data.personalInfo.instagram, // Instagram
          data.personalInfo.behance, // Behance
          data.personalInfo.dribbble, // Dribbble
          data.personalInfo.website, // Website
          userAgent, // Browser (User Agent)
          screenSize, // Screen Size
          this.getDeviceType(userAgent), // Device Type
          navigator.language, // Language
          Intl.DateTimeFormat().resolvedOptions().timeZone, // Timezone
          'Free', // Tier (default to Free)
        ]
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: `A${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });

      return true;
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      return false;
    }
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) {
      return 'Mobile';
    } else if (ua.includes('tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }
}