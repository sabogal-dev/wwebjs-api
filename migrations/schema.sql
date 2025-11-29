-- WWebJS API Multi-User Database Schema
-- This schema creates the necessary tables for multi-user authentication and session management

-- Create database (run manually if needed)
-- CREATE DATABASE IF NOT EXISTS wwebjs_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE wwebjs_api;

-- Table: users
-- Stores user accounts with authentication and API usage limits
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  api_calls_used INT DEFAULT 0,
  api_calls_limit INT DEFAULT 1000,
  limit_reset_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: whatsapp_sessions
-- Stores WhatsApp session metadata linked to users
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'inactive', 'terminated') DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_session_id (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: api_usage_log
-- Logs API usage for analytics and debugging (optional)
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint VARCHAR(255) DEFAULT NULL,
  method VARCHAR(10) DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_timestamp (user_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample admin user (password: admin123)
-- Password hash generated with bcryptjs rounds=10
-- IMPORTANT: Change this password in production!
INSERT IGNORE INTO users (username, email, password_hash, api_calls_limit) 
VALUES ('admin', 'admin@example.com', '$2a$10$rN7K8vZQZxH.kYJX0Y5YKOqZ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Zm', 10000);

-- Note: To hash a password with bcryptjs in Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your_password', 10);
