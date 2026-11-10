const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.code || error.name);
});

module.exports = pool;
