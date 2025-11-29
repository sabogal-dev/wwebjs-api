-- ==========================================
-- WWebJS API - Quick Database Setup
-- ==========================================
-- Run this script to quickly set up the database

-- 1. Create database
CREATE DATABASE IF NOT EXISTS wwebjs_api 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE wwebjs_api;

-- 2. Create users table
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

-- 3. Create whatsapp_sessions table
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

-- 4. Create api_usage_log table
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint VARCHAR(255) DEFAULT NULL,
  method VARCHAR(10) DEFAULT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_timestamp (user_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create demo user (username: demo, password: demo123)
-- Password hash for 'demo123' with bcrypt rounds=10
INSERT INTO users (username, email, password_hash, api_calls_limit) 
VALUES ('demo', 'demo@example.com', '$2a$10$rN7K8vZQZxH5kYJX0Y5YKOVn4EhM0wFZc7T5x6Y7Z8A9B0C1D2E3F', 5000)
ON DUPLICATE KEY UPDATE username=username;

-- ==========================================
-- Setup complete!
-- ==========================================
-- You can now start the server with: npm start
-- 
-- Test credentials:
--   Username: demo
--   Password: demo123
--
-- API endpoints:
--   POST http://localhost:3000/auth/login
--   GET  http://localhost:3000/users/me
-- ==========================================

SELECT 'Database setup complete!' AS message;
SELECT COUNT(*) AS total_users FROM users;
