const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite DB:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
        // Initialize Tables
        db.run(`
            CREATE TABLE IF NOT EXISTS MonthlyData (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Month INTEGER NOT NULL,
                Date TEXT,
                Type TEXT,
                Category TEXT,
                Department TEXT,
                Client TEXT,
                Project TEXT,
                Description TEXT,
                Amount REAL,
                Status TEXT
            )
        `, (err) => {
            if (err) console.error("Error creating MonthlyData table", err);
        });
    }
});

module.exports = db;
