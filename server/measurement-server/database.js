/**
 * Database configuration for SRAM PUF Measurement Server
 * Using SQLite for simple, file-based storage
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || './db/measurements.sqlite';
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
const fs = require('fs');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
let db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[ERROR] Cannot open database:', err.message);
        throw err;
    } else {
        console.log('[INFO] Connected to SQLite database:', DB_PATH);
        
        // Create table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS sram (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            espid INTEGER NOT NULL,
            data TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('[ERROR] Failed to create table:', err.message);
            } else {
                console.log('[INFO] Database table ready');
                
                // Check if we have any data
                db.get('SELECT COUNT(*) as count FROM sram', (err, row) => {
                    if (!err && row) {
                        console.log(`[INFO] Current measurements in database: ${row.count}`);
                    }
                });
            }
        });
    }
});

module.exports = db;

