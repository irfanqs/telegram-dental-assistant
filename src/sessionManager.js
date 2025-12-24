/**
 * Session Manager for Telegram Patient Bot
 * Manages user sessions with in-memory storage
 */

const { FIELDS } = require('./constants');

/**
 * SessionManager class handles user session lifecycle
 * Uses in-memory Map to store sessions keyed by userId
 */
class SessionManager {
  constructor() {
    // In-memory storage using Map
    // Key: userId (number), Value: session object
    this.sessions = new Map();
  }

  /**
   * Creates a new session for a user
   * @param {number} userId - Telegram user ID
   * @param {string} doctorName - Doctor name (optional, from /start)
   * @returns {object} The created session object
   */
  createSession(userId, doctorName = null) {
    const session = {
      userId,
      currentFieldIndex: 0,
      data: {},
      state: 'collecting',
      doctorName: doctorName // Store doctor name from /start
    };
    
    // If doctor name is provided, pre-fill it in data
    if (doctorName) {
      session.data.dokterPemeriksa = doctorName;
    }
    
    this.sessions.set(userId, session);
    return session;
  }

  /**
   * Retrieves a session for a user
   * @param {number} userId - Telegram user ID
   * @returns {object|null} The session object or null if not found
   */
  getSession(userId) {
    return this.sessions.get(userId) || null;
  }

  /**
   * Updates a specific field in the user's session
   * @param {number} userId - Telegram user ID
   * @param {string} field - Field key to update
   * @param {string} value - Value to store
   * @returns {boolean} True if update successful, false if session not found
   */
  updateField(userId, field, value) {
    const session = this.sessions.get(userId);
    if (!session) {
      return false;
    }
    
    session.data[field] = value;
    return true;
  }

  /**
   * Deletes a user's session
   * @param {number} userId - Telegram user ID
   * @returns {boolean} True if session was deleted, false if not found
   */
  deleteSession(userId) {
    return this.sessions.delete(userId);
  }

  /**
   * Checks if a user has an active session
   * @param {number} userId - Telegram user ID
   * @returns {boolean} True if user has active session
   */
  hasActiveSession(userId) {
    return this.sessions.has(userId);
  }

  /**
   * Gets the current field being collected for a user
   * @param {number} userId - Telegram user ID
   * @returns {object|null} Field object {key, label} or null if session not found or all fields collected
   */
  getCurrentField(userId) {
    const session = this.sessions.get(userId);
    if (!session) {
      return null;
    }
    
    if (session.currentFieldIndex >= FIELDS.length) {
      return null;
    }
    
    const field = FIELDS[session.currentFieldIndex];
    
    // Skip dokterPemeriksa field if doctor name already set from /start
    if (field.key === 'dokterPemeriksa' && session.doctorName) {
      // Move to next field
      session.currentFieldIndex++;
      return this.getCurrentField(userId); // Recursive call to get next field
    }
    
    return field;
  }

  /**
   * Gets all collected data for a user
   * @param {number} userId - Telegram user ID
   * @returns {object|null} Data object or null if session not found
   */
  getAllData(userId) {
    const session = this.sessions.get(userId);
    if (!session) {
      return null;
    }
    
    return session.data;
  }
}

module.exports = SessionManager;
