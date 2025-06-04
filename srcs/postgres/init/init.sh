#!/bin/sh

set -x

psql -v ON_ERROR_STOP=1 --username "$ADMIN_USERNAME" --dbname "$DB_NAME" <<EOSQL
	ALTER USER $ADMIN_USERNAME WITH PASSWORD '$ADMIN_PASSWORD';
	GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $ADMIN_USERNAME;
EOSQL

# echo "# Allow admin_user to connect to transcendence DB from localhost only
# host    transcendence    $ADMIN_USERNAME    127.0.0.1/32    md5
# host    transcendence    $ADMIN_USERNAME    ::1/128    md5

# # Optional: Allow admin_user to connect via Unix socket (local)
# local   transcendence    $ADMIN_USERNAME                    md5

# # Reject all other connections to transcendence DB
# host    transcendence    all           0.0.0.0/0       reject
# local   transcendence    all                          reject
# " > "$PGDATA/pg_hba.conf"

psql -v ON_ERROR_STOP=1 --username "$ADMIN_USERNAME" --dbname "$DB_NAME" <<EOSQL
DO \$\$
DECLARE
	admin_id INTEGER;
BEGIN
						-- Create enum type if not exists
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_type') THEN
		CREATE TYPE login_type AS ENUM ('google', '42', 'local');
	END IF;

						-- Create users table if not exists
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = '$DB_USER_INFO_TABLE'
	) THEN
		EXECUTE format('CREATE TABLE %I (
			id SERIAL PRIMARY KEY,
			firstname VARCHAR(255) NOT NULL,
			lastname VARCHAR(255) NOT NULL,
			username VARCHAR(255) UNIQUE NOT NULL
		)', '$DB_USER_INFO_TABLE');
	END IF;

						-- Create $DB_USER_TABLE table if not exists
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = '$DB_USER_TABLE'
	) THEN
		EXECUTE format('CREATE TABLE %I
		(
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES %I(id) ON DELETE CASCADE,
			provider_id VARCHAR(255) NOT NULL,
			login_type login_type NOT NULL,
			password VARCHAR(255),
			email VARCHAR(255) UNIQUE NOT NULL,
			UNIQUE (login_type, provider_id)
		)', '$DB_USER_TABLE', '$DB_USER_INFO_TABLE');
	END IF;

						-- Add password constraint for local login if not exists
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint 
		WHERE conname = 'pw_required_for_local'
	) THEN
		EXECUTE format('ALTER TABLE %I
			ADD CONSTRAINT pw_required_for_local CHECK (
			(login_type = ''local'' AND password IS NOT NULL)
			OR login_type <> ''local''
		)', '$DB_USER_TABLE');
	END IF;


						-- Insert admin user and login if not exists
	IF NOT EXISTS (
		SELECT 1 FROM $DB_USER_TABLE
		WHERE provider_id = '$ADMIN_EMAIL' AND login_type = '$ADMIN_LOGIN_TYPE'
	) THEN
		INSERT INTO $DB_USER_INFO_TABLE (firstname, lastname, username)
		VALUES ('$ADMIN_FIRSTNAME', '$ADMIN_LASTNAME', '$ADMIN_USERNAME')
		RETURNING id INTO admin_id;

		INSERT INTO $DB_USER_TABLE (user_id, provider_id, login_type, email, password)
		VALUES (admin_id, '$ADMIN_EMAIL', '$ADMIN_LOGIN_TYPE', '$ADMIN_EMAIL', '$ADMIN_PASSWORD');
	END IF;
END
\$\$;
EOSQL
