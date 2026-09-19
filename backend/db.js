require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

pool.connect()
    .then(() => {
        console.log("PostgreSQL connected successfully 🚀");
    })
    .catch((error) => {
        console.log("Database connection failed:", error.message);
    });

module.exports = pool;