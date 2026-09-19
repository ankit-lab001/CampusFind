require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    user: process.env.DB_USER || "postgres",
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "campusfind",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 8888
});

pool.connect()
    .then(() => {
        console.log("PostgreSQL connected successfully 🚀");
    })
    .catch((error) => {
        console.log("Database connection failed:", error.message);
    });

module.exports = pool;