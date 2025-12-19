/**
 * Main entry point for Telegram Patient Bot
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

const TelegramPatientBot = require('./bot');
const SessionManager = require('./sessionManager');
const SheetsService = require('./sheetsService');

/**
 * Initialize and start the bot
 */
async function main() {
  try {
    console.log('Starting Telegram Patient Bot...');

    // Load config and validate environment variables
    // Requirements: 10.1, 10.2, 10.3, 10.4
    const config = require('./config');
    console.log('✓ Configuration loaded and validated');

    // Initialize SessionManager
    const sessionManager = new SessionManager();
    console.log('✓ Session Manager initialized');

    // Initialize SheetsService
    const sheetsService = new SheetsService(
      config.spreadsheetId,
      config.googleCredentialsPath
    );
    console.log('✓ Sheets Service initialized');

    // Wait for Sheets Service to complete initialization
    await sheetsService.initializationPromise;
    console.log('✓ Google Sheets API connection established');

    // Initialize bot with all handlers
    const bot = new TelegramPatientBot(
      config.telegramToken,
      sessionManager,
      sheetsService
    );

    // Start bot polling
    bot.start();
    console.log('✓ Bot is running and listening for messages');
    console.log('Press Ctrl+C to stop the bot');

  } catch (error) {
    console.error('Failed to start bot:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Add global error handlers for uncaught exceptions
// Requirement: 10.1
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // Give time for logs to flush before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Give time for logs to flush before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the bot
main();
