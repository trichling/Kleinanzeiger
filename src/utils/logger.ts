/**
 * Logging utility using Winston.
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

let rootLogger: winston.Logger | null = null;

/**
 * Setup logging configuration.
 */
export function setupLogging(logLevel: string, logDir: string): void {
  // Create log directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  rootLogger = winston.createLogger({
    level: logLevel.toLowerCase(),
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    transports: [
      // File transport
      new winston.transports.File({
        filename: path.join(logDir, 'kleinanzeiger.log'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} - ${level.toUpperCase()}: ${message} ${metaStr}`;
          })
        ),
      }),
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message }) => `${level}: ${message}`)
        ),
      }),
    ],
  });
}

/**
 * Create a logger instance for a specific module.
 */
export function createLogger(moduleName: string): winston.Logger {
  if (!rootLogger) {
    // Create default logger if setupLogging hasn't been called
    rootLogger = winston.createLogger({
      level: 'info',
      format: winston.format.simple(),
      transports: [new winston.transports.Console()],
    });
  }

  return rootLogger.child({ module: moduleName });
}
