/**
 * Google Sheets Service for Telegram Patient Bot
 * Handles interaction with Google Sheets API
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

const { google } = require('googleapis');
const { FIELDS } = require('./constants');

class SheetsService {
  /**
   * Initialize SheetsService with spreadsheet ID and authentication
   * @param {string} spreadsheetId - Google Spreadsheet ID
   * @param {string} credentialsPath - Path to Google Service Account JSON file
   */
  constructor(spreadsheetId, credentialsPath) {
    this.spreadsheetId = spreadsheetId;
    this.credentialsPath = credentialsPath;
    this.sheets = null;
    this.idCounter = 0; // For generating auto-increment IDs
    this.initializationPromise = this._initialize();
  }

  /**
   * Initialize Google Sheets API client with service account authentication
   * @private
   */
  async _initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      
      // Initialize ID counter by reading the last row
      await this._initializeIdCounter();
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error);
      throw error;
    }
  }

  /**
   * Initialize the ID counter by reading the last ID from the spreadsheet
   * @private
   */
  async _initializeIdCounter() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A', // Get all values in column A (ID column)
      });

      const rows = response.data.values;
      if (rows && rows.length > 1) {
        // Skip header row, get last ID
        const lastRow = rows[rows.length - 1];
        const lastId = parseInt(lastRow[0], 10);
        if (!isNaN(lastId)) {
          this.idCounter = lastId;
        }
      }
    } catch (error) {
      // If sheet is empty or error occurs, start from 0
      console.log('Starting ID counter from 0');
      this.idCounter = 0;
    }
  }

  /**
   * Get current date formatted as DD/MM/YYYY
   * Requirements: 7.2
   * @returns {string} Current date in DD/MM/YYYY format
   */
  getCurrentDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Generate next auto-increment ID
   * Requirements: 7.1
   * @returns {number} Next ID
   */
  getNextId() {
    this.idCounter += 1;
    return this.idCounter;
  }

  /**
   * Append patient data to Google Spreadsheet
   * Requirements: 7.3, 7.4, 7.5, 7.6
   * @param {Object} patientData - Patient data object with field keys
   * @returns {Promise<{success: boolean, error?: string}>} Result of the operation
   */
  async appendPatientData(patientData) {
    try {
      // Ensure initialization is complete
      await this.initializationPromise;

      // Generate ID and date
      const id = this.getNextId();
      const date = this.getCurrentDate();

      // Build row data: [ID, Date, ...patient fields in order]
      // Requirements: 7.3, 7.4
      const rowData = [id, date];
      
      // Add patient data fields in the exact order defined in FIELDS
      FIELDS.forEach(field => {
        rowData.push(patientData[field.key] || '');
      });

      // Append to spreadsheet
      // Requirements: 7.5
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A', // Start from column A
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      });

      // Get the row number that was just inserted
      const updatedRange = response.data.updates.updatedRange;
      const rowNumber = parseInt(updatedRange.match(/\d+$/)[0]);

      // If there's an image URL for Letak Karies, insert IMAGE formula
      if (patientData.letakKariesImageUrl) {
        await this.insertImageFormula(rowNumber, patientData.letakKariesImageUrl);
      }

      return { success: true, id, range: response.data.updates.updatedRange };
    } catch (error) {
      // Requirements: 7.6
      console.error('Error appending patient data to Google Sheets:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Insert IMAGE formula to a specific cell
   * @param {number} rowNumber - Row number in the spreadsheet
   * @param {string} imageUrl - URL of the image
   */
  async insertImageFormula(rowNumber, imageUrl) {
    try {
      // Find the column index for 'letakKaries' field
      const letakKariesIndex = FIELDS.findIndex(f => f.key === 'letakKaries');
      
      if (letakKariesIndex === -1) {
        console.error('letakKaries field not found in FIELDS');
        return;
      }

      // Column index: +2 because we have ID and Date columns before FIELDS
      const columnIndex = letakKariesIndex + 2;
      
      // Convert column index to letter (0=A, 1=B, etc.)
      const columnLetter = String.fromCharCode(65 + columnIndex);
      
      // Insert IMAGE formula
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${columnLetter}${rowNumber}`,
        valueInputOption: 'USER_ENTERED', // Important: USER_ENTERED to process formula
        resource: {
          values: [[`=IMAGE("${imageUrl}")`]]
        }
      });

      console.log(`Image formula inserted at ${columnLetter}${rowNumber}`);
    } catch (error) {
      console.error('Error inserting image formula:', error);
      // Don't throw error, just log it - data is already saved
    }
  }
}

module.exports = SheetsService;
