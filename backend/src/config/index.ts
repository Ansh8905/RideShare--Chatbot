import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // APIs
  bookingApiUrl: process.env.BOOKING_API_URL || 'http://localhost:3000/api/bookings',
  driverApiUrl: process.env.DRIVER_API_URL || 'http://localhost:3000/api/drivers',
  paymentApiUrl: process.env.PAYMENT_API_URL || 'http://localhost:3000/api/payments',
  notificationApiUrl: process.env.NOTIFICATION_API_URL || 'http://localhost:3000/api/notifications',
  
  // Database
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'rideshare_chatbot',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  
  // NLP
  enableNlp: process.env.ENABLE_NLP === 'true',
  nlpConfidenceThreshold: parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD || '0.7'),
  
  // Safety
  enableSafetyDetection: process.env.ENABLE_SAFETY_DETECTION === 'true',
  escalationTimeout: parseInt(process.env.ESCALATION_TIMEOUT || '30000', 10),
  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || 'logs/app.log',
};

export default config;
