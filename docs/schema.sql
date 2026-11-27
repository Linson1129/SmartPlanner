-- SmartPlanner reference schema (MySQL 8.0+ / 9.x)
-- The application uses Hibernate ddl-auto=update for local development.
-- This file documents the resulting tables and can also be applied to a fresh DB.

CREATE DATABASE IF NOT EXISTS smartplanner
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE smartplanner;

CREATE TABLE IF NOT EXISTS user_profile (
  id BIGINT NOT NULL,
  display_name VARCHAR(60) NOT NULL,
  expected_finish_time TIME(6) NOT NULL,
  holiday_mode ENUM('OFF', 'SOFT', 'AVOID') NOT NULL,
  holiday_region ENUM('CN', 'MO') NOT NULL,
  weather_province VARCHAR(30) NULL,
  idle_threshold_seconds INT NOT NULL,
  demo_seeded BOOLEAN NOT NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS schedule_event (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  notes VARCHAR(4000) NULL,
  event_type ENUM('NORMAL', 'IMPORTANT', 'CASUAL', 'CONTAINER', 'GOAL') NOT NULL,
  priority ENUM('HIGH', 'MEDIUM', 'LOW') NOT NULL,
  status ENUM('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED') NOT NULL,
  start_at DATETIME(6) NOT NULL,
  end_at DATETIME(6) NULL,
  due_at DATETIME(6) NULL,
  parent_id BIGINT NULL,
  location VARCHAR(200) NULL,
  goal_completed BOOLEAN NOT NULL,
  weather_sensitive BIT(1) NOT NULL DEFAULT b'0',
  lookahead_days INT NOT NULL DEFAULT 0,
  completed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_event_user_start (user_id, start_at),
  KEY idx_event_user_due (user_id, due_at),
  KEY idx_event_parent (parent_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS reminder_log (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id BIGINT NOT NULL,
  occurrence_key VARCHAR(80) NOT NULL,
  strength ENUM('SOFT', 'STRONG') NOT NULL,
  delivered_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reminder_event_occurrence_strength (event_id, occurrence_key, strength),
  KEY idx_reminder_event (event_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
