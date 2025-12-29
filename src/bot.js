/**
 * Bot module for Telegram Patient Bot
 * Handles bot initialization and command handlers
 */

const TelegramBot = require('node-telegram-bot-api');
const { MESSAGES, CALLBACK_DATA, KARIES_TYPES } = require('./constants');
const path = require('path');

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
    this.bot.onText(/\/start/, (msg) => {
      this.handleStartCommand(msg);
    });

    // /newpatient command handler
    this.bot.onText(/\/newpatient/, (msg) => {
      this.handleNewPatientCommand(msg);
    });

    // /exit command handler
    this.bot.onText(/\/exit/, (msg) => {
      this.handleExitCommand(msg);
    });

    // /letak_karies command handler
    this.bot.onText(/\/letak_karies/, (msg) => {
      this.handleLetakKariesCommand(msg);
    });

    // Message handler for field inputs
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
   * Handle /letak_karies command
   * @param {object} msg - Telegram message object
   */
  async handleLetakKariesCommand(msg) {
    const chatId = msg.chat.id;

    try {
      // Create inline keyboard with karies options
      const keyboard = KARIES_TYPES.map(karies => [
        { 
          text: karies.label, 
          callback_data: `${CALLBACK_DATA.KARIES_PREFIX}${karies.key}` 
        }
      ]);

      const options = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      };

      await this.bot.sendMessage(chatId, 'Pilih karies yang ingin Anda lihat:', options);
    } catch (error) {
      console.error('Error in handleLetakKariesCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle /start command
   * @param {object} msg - Telegram message object
   */
  async handleStartCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has an active session
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
        // No active session - ask for doctor name first
        // Create temporary session to track that we're waiting for doctor name
        const session = this.sessionManager.createSession(userId);
        session.state = 'waiting_doctor_name';
        
        await this.bot.sendMessage(chatId, MESSAGES.ASK_DOCTOR_NAME);
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
      // Handle karies selection callbacks
      else if (data.startsWith(CALLBACK_DATA.KARIES_PREFIX)) {
        await this.handleKariesSelection(chatId, userId, data);
      }
      // Handle field input karies selection callbacks
      else if (data.startsWith(CALLBACK_DATA.FIELD_KARIES_PREFIX)) {
        await this.handleFieldKariesSelection(chatId, userId, data);
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
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleResumeContinue(chatId, userId) {
    try {
      const currentField = this.sessionManager.getCurrentField(userId);
      
      if (currentField) {
        // Check if current field is dropdown type (letak karies)
        if (currentField.type === 'dropdown' && currentField.key === 'letakKaries') {
          await this.showLetakKariesDropdown(chatId, userId);
        } else {
          // Resume from current field
          const prompt = `${MESSAGES.FIELD_PROMPT_PREFIX}${currentField.label}`;
          await this.bot.sendMessage(chatId, prompt);
        }
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
      const existingSession = this.sessionManager.getSession(userId);
      const doctorName = existingSession ? existingSession.doctorName : null;
      
      // Delete old session and create new one with doctor name
      this.sessionManager.deleteSession(userId);
      this.sessionManager.createSession(userId, doctorName);
      
      // Send first field prompt
      await this.bot.sendMessage(chatId, MESSAGES.FIRST_FIELD_PROMPT);
    } catch (error) {
      console.error('Error in handleResumeStartNew:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle /newpatient command
   * @param {object} msg - Telegram message object
   */
  async handleNewPatientCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const existingSession = this.sessionManager.getSession(userId);
      
      // Check if user already has active data collection session
      if (existingSession && existingSession.state === 'collecting') {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_ALREADY_HAS_SESSION);
        return;
      }

      // Get doctor name from existing session (from /start)
      const doctorName = existingSession ? existingSession.doctorName : null;

      // Create new session with doctor name if available
      this.sessionManager.deleteSession(userId); // Clear any old session
      this.sessionManager.createSession(userId, doctorName);

      // Send first field prompt
      await this.bot.sendMessage(chatId, MESSAGES.FIRST_FIELD_PROMPT);
    } catch (error) {
      console.error('Error in handleNewPatientCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle /exit command
   * @param {object} msg - Telegram message object
   */
  async handleExitCommand(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      // Check if user has active session
      if (!this.sessionManager.hasActiveSession(userId)) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
        return;
      }

      // Delete session
      this.sessionManager.deleteSession(userId);

      // Send cancellation confirmation message
      await this.bot.sendMessage(chatId, MESSAGES.CANCELLED);
    } catch (error) {
      console.error('Error in handleExitCommand:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle regular messages for field input collection
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
      if (!this.sessionManager.hasActiveSession(userId)) {
        return; // Ignore messages without active session
      }

      const session = this.sessionManager.getSession(userId);

      // Check if waiting for doctor name from /start
      if (session.state === 'waiting_doctor_name') {
        // Store doctor name
        session.doctorName = msg.text;
        session.data.dokterPemeriksa = msg.text;
        session.state = 'idle'; // Change state to idle, waiting for /newpatient
        
        // Send welcome message with doctor name
        const welcomeMsg = `Hai dokter ${msg.text}, semangat kerjanya hari ini🤗!\nKetik /newpatient untuk memulai pendataan.`;
        await this.bot.sendMessage(chatId, welcomeMsg);
        return;
      }

      // Check if user is in editing state
      if (session.state === 'editing' && session.editingField) {
        // Check if editing field is dropdown type
        const { FIELDS } = require('./constants');
        const field = FIELDS.find(f => f.key === session.editingField);
        
        if (field && field.type === 'dropdown' && field.key === 'letakKaries') {
          // For dropdown fields, user should use the dropdown, not text input
          await this.bot.sendMessage(chatId, 'Silakan pilih dari dropdown yang tersedia.');
          return;
        }
        
        // Update field value with new input
        this.sessionManager.updateField(userId, session.editingField, msg.text);
        
        // Clear editing state
        session.editingField = null;
        session.state = 'confirming';
        
        // Return to confirmation summary with updated data
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
      this.sessionManager.updateField(userId, currentField.key, msg.text);

      // Increment field index
      this.incrementFieldIndex(userId);

      // Check if more fields remain
      const nextField = this.sessionManager.getCurrentField(userId);
      
      if (nextField) {
        // Check if next field is dropdown type (letak karies)
        if (nextField.type === 'dropdown' && nextField.key === 'letakKaries') {
          await this.showLetakKariesDropdown(chatId, userId);
        } else {
          // More fields remain: send next field prompt
          const prompt = `${MESSAGES.FIELD_PROMPT_PREFIX}${nextField.label}`;
          await this.bot.sendMessage(chatId, prompt);
        }
      } else {
        // All fields collected: show confirmation summary
        await this.showConfirmationSummary(chatId, userId);
      }
    } catch (error) {
      console.error('Error in handleMessage:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Format and display confirmation summary with inline keyboard
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
      const summary = this.formatSummary(data);

      // Create inline keyboard with Yes, No, Change options
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
      const result = await this.sheetsService.appendPatientData(data);

      if (result.success) {
        // If success: send success message and delete session
        this.bot.sendMessage(chatId, MESSAGES.SUCCESS);
        this.sessionManager.deleteSession(userId);
      } else {
        // If failure: send error message and keep session
        this.bot.sendMessage(chatId, MESSAGES.ERROR_SAVE_FAILED);
        // Session is kept intact for retry
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('Error in handleConfirmYes:', error);
      this.bot.sendMessage(chatId, MESSAGES.ERROR_SAVE_FAILED);
      // Session is kept intact for retry
    }
  }

  /**
   * Handle "No" confirmation callback
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async handleConfirmNo(chatId, userId) {
    try {
      // Delete session via SessionManager
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
      session.state = 'editing';

      // Display inline keyboard with all field names as buttons
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
      session.editingField = fieldKey;

      // Check if field is dropdown type (letak karies)
      if (field.type === 'dropdown' && field.key === 'letakKaries') {
        await this.showLetakKariesDropdown(chatId, userId);
      } else {
        // Send prompt for new input
        const prompt = `${MESSAGES.EDIT_FIELD_PROMPT_PREFIX}${field.label}${MESSAGES.EDIT_FIELD_PROMPT_SUFFIX}`;
        await this.bot.sendMessage(chatId, prompt);
      }
    } catch (error) {
      console.error('Error in handleEditFieldSelection:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Show letak karies dropdown during field input
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   */
  async showLetakKariesDropdown(chatId, userId) {
    try {
      // Create inline keyboard with karies options
      const keyboard = KARIES_TYPES.map(karies => [
        { 
          text: karies.label, 
          callback_data: `${CALLBACK_DATA.FIELD_KARIES_PREFIX}${karies.key}` 
        }
      ]);

      const options = {
        reply_markup: {
          inline_keyboard: keyboard
        }
      };

      await this.bot.sendMessage(chatId, MESSAGES.SELECT_LETAK_KARIES, options);
    } catch (error) {
      console.error('Error in showLetakKariesDropdown:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle field karies selection callback during data input
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   * @param {string} callbackData - Callback data containing karies key
   */
  async handleFieldKariesSelection(chatId, userId, callbackData) {
    try {
      const session = this.sessionManager.getSession(userId);
      
      if (!session) {
        await this.bot.sendMessage(chatId, MESSAGES.ERROR_NO_ACTIVE_SESSION);
        return;
      }

      // Extract karies key from callback data
      const kariesKey = callbackData.replace(CALLBACK_DATA.FIELD_KARIES_PREFIX, '');
      
      // Find the karies type
      const karies = KARIES_TYPES.find(k => k.key === kariesKey);
      
      if (!karies) {
        await this.sendErrorMessage(chatId, 'Jenis karies tidak ditemukan.');
        return;
      }

      // Store the selected karies label and imageUrl in session
      this.sessionManager.updateField(userId, 'letakKaries', karies.label);
      this.sessionManager.updateField(userId, 'letakKariesImageUrl', karies.imageUrl);

      // Increment field index
      this.incrementFieldIndex(userId);

      // Check if more fields remain
      const nextField = this.sessionManager.getCurrentField(userId);
      
      if (nextField) {
        // More fields remain: send next field prompt
        const prompt = `${MESSAGES.FIELD_PROMPT_PREFIX}${nextField.label}`;
        await this.bot.sendMessage(chatId, prompt);
      } else {
        // All fields collected: show confirmation summary
        await this.showConfirmationSummary(chatId, userId);
      }
    } catch (error) {
      console.error('Error in handleFieldKariesSelection:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  /**
   * Handle karies selection callback
   * @param {number} chatId - Telegram chat ID
   * @param {number} userId - Telegram user ID
   * @param {string} callbackData - Callback data containing karies key
   */
  async handleKariesSelection(chatId, userId, callbackData) {
    try {
      // Extract karies key from callback data
      const kariesKey = callbackData.replace(CALLBACK_DATA.KARIES_PREFIX, '');
      
      // Find the karies type
      const karies = KARIES_TYPES.find(k => k.key === kariesKey);
      
      if (!karies) {
        await this.sendErrorMessage(chatId, 'Jenis karies tidak ditemukan.');
        return;
      }

      // Get the image file path (relative to project root)
      const imagePath = path.join(__dirname, '..', karies.file);

      // Send the image with caption
      await this.bot.sendPhoto(chatId, imagePath, {
        caption: `Gambar ${karies.label}`
      });
    } catch (error) {
      console.error('Error in handleKariesSelection:', error);
      await this.sendErrorMessage(chatId, 'Terjadi kesalahan saat mengirim gambar. Pastikan file gambar tersedia.');
    }
  }

  /**
   * Send user-friendly error message
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
