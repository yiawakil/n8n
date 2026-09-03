#!/bin/sh
# If DB_POSTGRESDB_CONNECTION_STRING is set (e.g. from Neon), parse it into individual n8n environment variables
if [ -n "$DB_POSTGRESDB_CONNECTION_STRING" ]; then
  eval $(node -e '
    try {
      const u = new URL(process.env.DB_POSTGRESDB_CONNECTION_STRING);
      // Remove -pooler suffix so TypeORM connects directly without PgBouncer lock issues
      const host = u.hostname.replace("-pooler", "");
      console.log("export DB_TYPE=postgresdb;");
      console.log(`export DB_POSTGRESDB_HOST="${host}";`);
      console.log(`export DB_POSTGRESDB_PORT="${u.port || 5432}";`);
      console.log(`export DB_POSTGRESDB_USER="${decodeURIComponent(u.username)}";`);
      console.log(`export DB_POSTGRESDB_PASSWORD="${decodeURIComponent(u.password)}";`);
      console.log(`export DB_POSTGRESDB_DATABASE="${u.pathname.replace(/^\//, "")}";`);
      console.log("export DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false;");
    } catch (err) {
      console.error("Failed to parse DB_POSTGRESDB_CONNECTION_STRING:", err);
    }
  ')
fi

exec /docker-entrypoint.sh "$@"
