/**
 * Bot module for Telegram Patient Bot
 * Handles bot initialization and command handlers
 * Requirements: 1.1, 1.2, 1.3
 */

const TelegramBot = require('node-telegram-bot-api');
const { MESSAGES, CALLBACK_DATA } = require('./constants');

/**
 * TelegramPatientBot class
 * Manages bot lifecycle and command handlers
 */
class TelegramPatientBot {
  /**
   * Constructor
   * @param {string} token - Telegram bot token
   * @param {SessionManager} sessionManager - Session manager instance
   * @param {SheetsService} sheetsService - Sheets service instance
   */
  constructor(token, sessionManager, sheetsService) {
    this.bot = new TelegramBot(token, { polling: true });
    this.sessionManager = sessionManager;
    this.sheetsService = sheetsService;
  }

  /**
   * Start the bot and register all handlers
   */
  start() {
    this.registerCommands();
    this.registerCallbacks();
    this.registerErrorHandlers();
    console.log('Bot started successfully');
  }

  /**
   * Register error handlers for Telegram API
   * Requirement: 7.6
   */
  registerErrorHandlers() {
    // Handle polling errors
    this.bot.on('polling_error', (error) => {
      console.error('Telegram polling error:', error);
      // Log but don't crash - polling will retry automatically
    });

    // Handle webhook errors (if used in future)
    this.bot.on('webhook_error', (error) => {
      console.error('Telegram webhook error:', error);
    });
  }

  /**
   * Register command handlers
   */
  registerCommands() {
    // /start command handler
    // Requirements: 1.1, 1.2, 1.3
    this.bot.onText(/\/start/, (msg) => {
      this.handleStartCommand(msg);
    });

    // /newpatient command handler
    // Requirements: 2.1, 2.2
    this.bot.onText(/\/newpatient/, (msg) => {
      this.handleNewPatientCommand(msg);
    });

    // /exit command handler
    // Requirements: 4.1, 4.2, 4.3, 4.4
    this.bot.onText(/\/exit/, (msg) => {
      this.handleExitCommand(msg);
    });

    // Message handler for field inputs
    // Requirements: 2.3, 3.2, 3.3, 3.4
    this.bot.on('message', (msg) => {
      this.handleMessage(msg);
    });
  }

  /**
   * Register callback query handlers for inline keyboards
   */
  registerCallbacks() {
    this.bot.on('callback_query', (query) => {
      this.handleCallbackQuery(query);
    });
  }

  /**
   * Handle /start command
   * Requirements: 1.1, 1.2, 1.3
   * @param {object} msg - Telegram message object
   */
  async handleStartCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has an active session
      // Requirement: 1.2
      if (this.sessionManager.hasActiveSession(userId)) {
        // User has active session - ask to continue or start fresh
        const options = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Lanjutkan', callback_data: CALLBACK_DATA.RESUME_CONTINUE },
                { text: 'Mulai Baru', callback_data: CALLBACK_DATA.RESUME_START_NEW }
              ]
            ]
          }
        };

        await this.bot.sendMessage(chatId, MESSAGES.CONTINUE_SESSION, options);
      } else {
        // No active session - send welcome message
        // Requirement: 1.1
        await this.bot.sendMessage(chatId, MESSAGES.WELCOME);
      }
    } catch (error) {
      console.error('Error in handleStartCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle callback queries from inline keyboards
   * @param {object} query - Telegram callback query object
   */
  async handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    try {
      // Handle session resume callbacks
      if (data === CALLBACK_DATA.RESUME_CONTINUE) {
        await this.handleResumeContinue(chatId, userId);
      } else if (data === CALLBACK_DATA.RESUME_START_NEW) {
        await this.handleResumeStartNew(chatId, userId);
      }
      // Handle confirmation callbacks
      else if (data === CALLBACK_DATA.CONFIRM_YES) {
        await this.handleConfirmYes(chatId, userId);
      } else if (data === CALLBACK_DATA.CONFIRM_NO) {
        await this.handleConfirmNo(chatId, userId);
      } else if (data === CALLBACK_DATA.CONFIRM_CHANGE) {
        await this.handleConfirmChange(chatId, userId);
      }
      // Handle edit field selection callbacks
      else if (data.startsWith(CALLBACK_DATA.EDIT_FIELD_PREFIX)) {
        await this.handleEditFieldSelection(chatId, userId, data);
      }
    } catch (error) {
      console.error('Error in handleCallbackQuery:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      // Always answer callback query to remove loading state
      try {
        await this.bot.answerCallbackQuery(query.id);
      } catch (e) {
        console.error('Failed to answer callback query:', e);
      }
    }
  }

  /**
   * Handle "Lanjutkan" (Continue) callback
   * Requirement: 1.3
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleResumeContinue(chatId, userId) {
    try {
      const currentField = this.sessionManager.getCurrentField(userId);
      
      if (currentField) {
        // Resume from current field
        const prompt = `${MESSAGES.FIELD_PROMPT_PREFIX}${currentField.label.toLowerCase()}`;
        await this.bot.sendMessage(chatId, prompt);
      } else {
        // All fields collected, show confirmation summary
        await this.showConfirmationSummary(chatId, userId);
      }
    } catch (error) {
      console.error('Error in handleResumeContinue:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle "Mulai Baru" (Start New) callback
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleResumeStartNew(chatId, userId) {
    try {
      // Delete old session and create new one
      this.sessionManager.deleteSession(userId);
      this.sessionManager.createSession(userId);
      
      // Send first field prompt
      await this.bot.sendMessage(chatId, MESSAGES.FIRST_FIELD_PROMPT);
    } catch (error) {
      console.error('Error in handleResumeStartNew:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle /newpatient command
   * Requirements: 2.1, 2.2
   * @param {object} msg - Telegram message object
   */
  async handleNewPatientCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user already has active session
      // Requirement: 2.1
      if (this.sessionManager.hasActiveSession(userId)) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_ALREADY_HAS_SESSION);
        return;
      }

      // Create new session
      // Requirement: 2.1
      this.sessionManager.createSession(userId);

      // Send first field prompt
      // Requirement: 2.2
      await this.bot.sendMessage(chatId, MESSAGES.FIRST_FIELD_PROMPT);
    } catch (error) {
      console.error('Error in handleNewPatientCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle /exit command
   * Requirements: 4.1, 4.2, 4.3, 4.4
   * @param {object} msg - Telegram message object
   */
  async handleExitCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has active session
      // Requirement: 4.1
      if (!this.sessionManager.hasActiveSession(userId)) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
        return;
      }

      // Delete session
      // Requirements: 4.2, 4.3
      this.sessionManager.deleteSession(userId);

      // Send cancellation confirmation message
      // Requirement: 4.4
      await this.bot.sendMessage(chatId, MESSAGES.CANCELLED);
    } catch (error) {
      console.error('Error in handleExitCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle regular messages for field input collection
   * Requirements: 2.3, 3.2, 3.3, 3.4, 6.3, 6.4, 6.5
   * @param {object} msg - Telegram message object
   */
  async handleMessage(msg) {
    // Ignore commands (they're handled by specific handlers)
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has active session
      // Requirement: 2.3
      if (!this.sessionManager.hasActiveSession(userId)) {
        return; // Ignore messages without active session
      }

      const session = this.sessionManager.getSession(userId);

      // Check if user is in editing state
      // Requirements: 6.3, 6.4, 6.5
      if (session.state === 'editing' && session.editingField) {
        // Update field value with new input
        // Requirement: 6.3
        this.sessionManager.updateField(userId, session.editingField, msg.text);
        
        // Clear editing state
        session.editingField = null;
        session.state = 'confirming';
        
        // Return to confirmation summary with updated data
        // Requirements: 6.4, 6.5
        await this.showConfirmationSummary(chatId, userId);
        return;
      }

      // Get current field from session
      const currentField = this.sessionManager.getCurrentField(userId);
      
      if (!currentField) {
        // All fields collected, proceed to confirmation
        return;
      }

      // Store user input in session without validation
      // Requirement: 3.3
      this.sessionManager.updateField(userId, currentField.key, msg.text);

      // Increment field index
      // Requirement: 2.3, 3.4
      this.incrementFieldIndex(userId);

      // Check if more fields remain
      const nextField = this.sessionManager.getCurrentField(userId);
      
      if (nextField) {
        // More fields remain: send next field prompt
        // Requirement: 3.2
        const prompt = `${MESSAGES.FIELD_PROMPT_PREFIX}${nextField.label.toLowerCase()}`;
        await this.bot.sendMessage(chatId, prompt);
      } else {
        // All fields collected: show confirmation summary
        // Requirements: 2.4, 5.1, 5.2
        await this.showConfirmationSummary(chatId, userId);
      }
    } catch (error) {
      console.error('Error in handleMessage:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Format and display confirmation summary with inline keyboard
   * Requirements: 2.4, 5.1, 5.2
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async showConfirmationSummary(chatId, userId) {
    try {
      const data = this.sessionManager.getAllData(userId);
      
      if (!data) {
        return;
      }

      // Format summary with all collected data
      // Requirement: 5.1
      const summary = this.formatSummary(data);

      // Create inline keyboard with Yes, No, Change options
      // Requirement: 5.2
      const options = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Yes', callback_data: CALLBACK_DATA.CONFIRM_YES },
              { text: 'No', callback_data: CALLBACK_DATA.CONFIRM_NO },
              { text: 'Change', callback_data: CALLBACK_DATA.CONFIRM_CHANGE }
            ]
          ]
        },
        parse_mode: 'Markdown'
      };

      await this.bot.sendMessage(chatId, summary, options);
    } catch (error) {
      console.error('Error in showConfirmationSummary:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Format patient data into readable summary
   * Requirement: 5.1
   * @param {object} data - Patient data object
   * @returns {string} Formatted summary string
   */
  formatSummary(data) {
    const { FIELDS } = require('./constants');
    
    let summary = MESSAGES.SUMMARY_HEADER;

    // Add each field with its label and value
    FIELDS.forEach(field => {
      const value = data[field.key] || '-';
      summary += `*${field.label}:* ${value}\n`;
    });

    summary += MESSAGES.SUMMARY_QUESTION;

    return summary;
  }

  /**
   * Increment the field index for a user's session
   * @param {number} userId - Telegram user ID
   */
  incrementFieldIndex(userId) {
    const session = this.sessionManager.getSession(userId);
    if (session) {
      session.currentFieldIndex++;
    }
  }

  /**
   * Handle "Yes" confirmation callback
   * Requirements: 5.3, 7.5, 7.6, 7.7
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleConfirmYes(chatId, userId) {
    // Get session data
    const data = this.sessionManager.getAllData(userId);
    
    if (!data) {
      this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
      return;
    }

    try {
      // Call SheetsService.appendPatientData()
      // Requirement: 5.3
      const result = await this.sheetsService.appendPatientData(data);

      if (result.success) {
        // If success: send success message and delete session
        // Requirements: 7.5
        this.bot.sendMessage(chatId, MESSAGES.SUCCESS);
        this.sessionManager.deleteSession(userId);
      } else {
        // If failure: send error message and keep session
        // Requirements: 7.6, 7.7
        this.bot.sendMessage(chatId, MESSAGES.ERROR_SAVE_FAILED);
        // Session is kept intact for retry
      }
    } catch (error) {
      // Handle unexpected errors
      // Requirements: 7.6, 7.7
      console.error('Error in handleConfirmYes:', error);
      this.bot.sendMessage(chatId, MESSAGES.ERROR_SAVE_FAILED);
      // Session is kept intact for retry
    }
  }

  /**
   * Handle "No" confirmation callback
   * Requirements: 5.4
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleConfirmNo(chatId, userId) {
    try {
      // Delete session via SessionManager
      // Requirement: 5.4
      this.sessionManager.deleteSession(userId);
      
      // Send cancellation message
      // Requirement: 5.4
      await this.bot.sendMessage(chatId, MESSAGES.CANCELLED);
    } catch (error) {
      console.error('Error in handleConfirmNo:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle "Change" confirmation callback
   * Requirements: 5.5, 6.1
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleConfirmChange(chatId, userId) {
    try {
      const session = this.sessionManager.getSession(userId);
      
      if (!session) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
        return;
      }

      // Set session state to 'editing'
      // Requirement: 5.5
      session.state = 'editing';

      // Display inline keyboard with all field names as buttons
      // Requirements: 5.5, 6.1
      const { FIELDS } = require('./constants');
      const keyboard = FIELDS.map(field => [
        { 
          text: field.label, 
          callback_data: `${CALLBACK_DATA.EDIT_FIELD_PREFIX}${field.key}` 
        }
      ]);

      const options = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      };

      await this.bot.sendMessage(chatId, MESSAGES.SELECT_FIELD_TO_EDIT, options);
    } catch (error) {
      console.error('Error in handleConfirmChange:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle field selection for editing
   * Requirements: 6.2
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   * @param {string} callbackData - Callback data containing field key
   */
  async handleEditFieldSelection(chatId, userId, callbackData) {
    try {
      const session = this.sessionManager.getSession(userId);
      
      if (!session) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
        return;
      }

      // Extract field key from callback data
      const fieldKey = callbackData.replace(CALLBACK_DATA.EDIT_FIELD_PREFIX, '');
      
      // Find the field label
      const { FIELDS } = require('./constants');
      const field = FIELDS.find(f => f.key === fieldKey);
      
      if (!field) {
        return;
      }

      // Store selected field in session for editing
      // Requirement: 6.2
      session.editingField = fieldKey;

      // Send prompt for new input
      // Requirement: 6.2
      const prompt = `${MESSAGES.EDIT_FIELD_PROMPT_PREFIX}${field.label.toLowerCase()}${MESSAGES.EDIT_FIELD_PROMPT_SUFFIX}`;
      await this.bot.sendMessage(chatId, prompt);
    } catch (error) {
      console.error('Error in handleEditFieldSelection:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Send user-friendly error message
   * Requirement: 7.6
   * @param {number} chatId - Telegram chat ID
   * @param {string} message - Error message to send
   */
  async sendErrorMessage(chatId, message) {
    try {
      await this.bot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Failed to send error message:', error);
    }
  }
}

module.exports = TelegramPatientBot;
