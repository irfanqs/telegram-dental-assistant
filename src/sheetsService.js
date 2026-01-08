/**
 * Google Sheets Service for Telegram Patient Bot
 * Handles interaction with Google Sheets API
 */

const { google } = require('googleapis');
const { PATIENT_FIELDS, TEETH_FIELDS, KONDISI_GIGI_TYPES, KARIES_TYPES } = require('./constants');

class SheetsService {
  constructor(spreadsheetId, credentialsPath) {
    this.spreadsheetId = spreadsheetId;
    this.credentialsPath = credentialsPath;
    this.sheets = null;
    this.noCounter = 0; // For auto-increment No
    this.initializationPromise = this._initialize();
  }

  async _initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: this.credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      
      await this._initializeNoCounter();
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error);
      throw error;
    }
  }

  async _initializeNoCounter() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A',
      });

      const rows = response.data.values;
      if (rows && rows.length > 1) {
        const lastRow = rows[rows.length - 1];
        const lastNo = parseInt(lastRow[0], 10);
        if (!isNaN(lastNo)) {
          this.noCounter = lastNo;
        }
      }
    } catch (error) {
      console.log('Starting No counter from 0');
      this.noCounter = 0;
    }
  }

  /**
   * Get current time formatted as HH:mm:ss
   */
  getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Generate unique Record ID
   */
  generateRecordId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `REC-${dateStr}-${timeStr}-${random}`;
  }

  /**
   * Get next auto-increment No
   */
  getNextNo() {
    this.noCounter += 1;
    return this.noCounter;
  }

  /**
   * Get image URL for kondisi gigi
   */
  getKondisiGigiImageUrl(kondisiLabel) {
    const kondisi = KONDISI_GIGI_TYPES.find(k => k.label === kondisiLabel);
    return kondisi ? kondisi.imageUrl : null;
  }

  /**
   * Get image URL for letak karies
   */
  getLetakKariesImageUrl(kariesLabel) {
    const karies = KARIES_TYPES.find(k => k.label === kariesLabel);
    return karies ? karies.imageUrl : null;
  }

  /**
   * Append patient data to Google Spreadsheet
   * Creates one row per tooth entry
   * @param {Object} patientData - Patient data object
   * @param {Array} teethData - Array of teeth data objects
   */
  async appendPatientData(patientData, teethData) {
    try {
      await this.initializationPromise;

      const recordId = this.generateRecordId();
      const timestamp = this.getCurrentTime();
      const rows = [];
      const imageUpdates = []; // Track cells that need IMAGE formula

      // Calculate starting row (current last row + 1)
      const currentRows = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A',
      });
      let startRow = (currentRows.data.values ? currentRows.data.values.length : 0) + 1;

      // Create one row per tooth
      for (let i = 0; i < teethData.length; i++) {
        const tooth = teethData[i];
        const no = this.getNextNo();
        const rowNumber = startRow + i;
        
        // Build row: No, Record ID, Timestamp, Patient Fields..., Teeth Fields...
        const rowData = [no, recordId, timestamp];
        
        // Add patient data
        PATIENT_FIELDS.forEach(field => {
          rowData.push(patientData[field.key] || '');
        });
        
        // Add teeth data (text values first, will update with images later)
        TEETH_FIELDS.forEach(field => {
          rowData.push(tooth[field.key] || '');
        });

        rows.push(rowData);

        // Track image updates for kondisiGigi
        const kondisiImageUrl = this.getKondisiGigiImageUrl(tooth.kondisiGigi);
        if (kondisiImageUrl) {
          // Column index: 3 (No, RecordID, Timestamp) + PATIENT_FIELDS.length + index of kondisiGigi in TEETH_FIELDS
          const kondisiColIndex = 3 + PATIENT_FIELDS.length + TEETH_FIELDS.findIndex(f => f.key === 'kondisiGigi');
          imageUpdates.push({
            row: rowNumber,
            col: kondisiColIndex,
            imageUrl: kondisiImageUrl
          });
        }

        // Track image updates for letakKaries
        const kariesImageUrl = this.getLetakKariesImageUrl(tooth.letakKaries);
        if (kariesImageUrl) {
          const kariesColIndex = 3 + PATIENT_FIELDS.length + TEETH_FIELDS.findIndex(f => f.key === 'letakKaries');
          imageUpdates.push({
            row: rowNumber,
            col: kariesColIndex,
            imageUrl: kariesImageUrl
          });
        }
      }

      // Append all rows (text values)
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'A:A',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: rows
        }
      });

      // Update cells with IMAGE formulas
      for (const update of imageUpdates) {
        const colLetter = this.columnIndexToLetter(update.col);
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${colLetter}${update.row}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[`=IMAGE("${update.imageUrl}")`]]
          }
        });
      }

      return { success: true, recordId, rowsInserted: rows.length };
    } catch (error) {
      console.error('Error appending patient data to Google Sheets:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert column index to letter (0=A, 1=B, ..., 26=AA, etc.)
   */
  columnIndexToLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }
}

module.exports = SheetsService;
