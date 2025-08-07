/**
 * Logging utility with different levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  _log(level, message, ...args) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level}]`;
      console.log(prefix, message, ...args);
    }
  }

  error(message, ...args) {
    this._log('ERROR', message, ...args);
  }

  warn(message, ...args) {
    this._log('WARN', message, ...args);
  }

  info(message, ...args) {
    this._log('INFO', message, ...args);
  }

  debug(message, ...args) {
    this._log('DEBUG', message, ...args);
  }

  // Helper for progress tracking
  progress(current, total, operation) {
    const percentage = Math.round((current / total) * 100);
    this.info(`Progress: ${current}/${total} (${percentage}%) - ${operation}`);
  }
}

// Export singleton instance
export const logger = new Logger(process.env.LOG_LEVEL || 'INFO'); 