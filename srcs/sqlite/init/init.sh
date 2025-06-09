#!/bin/sh
set -x

DB_FILE="/data/database.sqlite"  # adapt this to your sqlite db path

# Create DB file if not exists (sqlite3 will create on first command)
sqlite3 "$DB_FILE" <<SQL
		-- Create users info table if not exists

CREATE TABLE IF NOT EXISTS $DB_USER_INFO_TABLE (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL
);

		-- We declare login_type as TEXT but restrict values
		-- We allow empty password when login is handled by third party Oauth

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider_id TEXT NOT NULL,
  login_type TEXT NOT NULL CHECK (login_type IN ('google', '42', 'local')),
  password TEXT,
  email TEXT NOT NULL,
  UNIQUE (login_type, provider_id),
  UNIQUE (email, login_type),
  FOREIGN KEY (user_id) REFERENCES user_info(id) ON DELETE CASCADE,
  CHECK (
    (login_type = 'local' AND password IS NOT NULL AND password <> '')
    OR login_type <> 'local'
  )
);

		-- Insert admin user if not exists

INSERT INTO $DB_USER_INFO_TABLE (firstname, lastname, username)
SELECT '$ADMIN_FIRSTNAME', '$ADMIN_LASTNAME', '$ADMIN_USERNAME'
WHERE NOT EXISTS (
  SELECT 1 FROM $DB_USER_TABLE
  WHERE provider_id = '$ADMIN_EMAIL' AND login_type = '$ADMIN_LOGIN_TYPE'
);

		-- Insert login info referencing last inserted user ID or existing user ID

INSERT INTO $DB_USER_TABLE (user_id, provider_id, login_type, email, password)
SELECT id, '$ADMIN_EMAIL', '$ADMIN_LOGIN_TYPE', '$ADMIN_EMAIL', '$ADMIN_PASSWORD'
FROM $DB_USER_INFO_TABLE
WHERE username = '$ADMIN_USERNAME'
  AND NOT EXISTS (
    SELECT 1 FROM $DB_USER_TABLE
    WHERE provider_id = '$ADMIN_EMAIL' AND login_type = '$ADMIN_LOGIN_TYPE'
  );
SQL

tail -f /dev/null