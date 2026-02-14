import winston from 'winston';
import config from '../config';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...args }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${
        Object.keys(args).length ? JSON.stringify(args, null, 2) : ''
      }`;
    })
  ),
  defaultMeta: { service: 'rideshare-chatbot' },
  transports: [
    new winston.transports.File({ filename: config.logFile }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
  ],
});

// Add console transport in development
if (config.nodeEnv === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    })
  );
}

export default logger;
