const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));

const sqlite3 = require('sqlite3').verbose();
const DB_PATH = path.join(process.cwd(), 'db.sqlite3');

// Initialize Database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("Database opening error: ", err);
    else console.log("Connected to SQLite database.");
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        pass TEXT,
        id TEXT,
        role TEXT,
        avatar TEXT,
        bio TEXT,
        joined TEXT,
        settings TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS chats (
        key TEXT PRIMARY KEY,
        data TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);

    // Insert default admin if not exists
    db.get("SELECT * FROM users WHERE username = 'Javoh'", (err, row) => {
        if (!row) {
            db.run("INSERT INTO users (username, pass, id, role, joined) VALUES (?, ?, ?, ?, ?)", 
                   ['Javoh', 'javoh2012', '111111', 'admin', new Date().toISOString()]);
        }
    });
});

// Helper for DB queries
const dbAll = (query, params = []) => new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
});
const dbRun = (query, params = []) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) { err ? reject(err) : resolve(this); });
});
const dbGet = (query, params = []) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

// Get Users
app.get('/api/users', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM users");
        const users = rows.map(r => ({
            user: r.username,
            pass: r.pass,
            id: r.id,
            role: r.role,
            avatar: r.avatar,
            bio: r.bio,
            joined: r.joined,
            settings: r.settings ? JSON.parse(r.settings) : {}
        }));
        res.json(users);
    } catch (e) { res.status(500).send(e.message); }
});

// Update/Save Users (Batch)
app.post('/api/users', async (req, res) => {
    try {
        const users = req.body;
        for (const u of users) {
            await dbRun(`INSERT OR REPLACE INTO users (username, pass, id, role, avatar, bio, joined, settings) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                         [u.user, u.pass, u.id, u.role, u.avatar, u.bio, u.joined, JSON.stringify(u.settings || {})]);
        }
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// Update single user profile
app.post('/api/users/profile', async (req, res) => {
    try {
        const { username, profileData } = req.body;
        const current = await dbGet("SELECT * FROM users WHERE username = ?", [username]);
        if (current) {
            const updated = { ...current, ...profileData };
            await dbRun(`UPDATE users SET user=?, pass=?, id=?, role=?, avatar=?, bio=?, joined=?, settings=? WHERE username=?`,
                        [updated.user, updated.pass, updated.id, updated.role, updated.avatar, updated.bio, updated.joined, JSON.stringify(updated.settings || {}), username]);
            res.json({ status: 'success' });
        } else res.status(404).send("User not found");
    } catch (e) { res.status(500).send(e.message); }
});

// Settings
app.get('/api/settings', async (req, res) => {
    try {
        const row = await dbGet("SELECT value FROM settings WHERE key = 'global'");
        res.json(row ? JSON.parse(row.value) : { gemini_api_key: "" });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['global', JSON.stringify(req.body)]);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// AI Chats
app.get('/api/chats', async (req, res) => {
    try {
        const row = await dbGet("SELECT data FROM chats WHERE key = 'ai'");
        res.json(row ? JSON.parse(row.data) : {});
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/chats', async (req, res) => {
    try {
        await dbRun("INSERT OR REPLACE INTO chats (key, data) VALUES (?, ?)", ['ai', JSON.stringify(req.body)]);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// P2P Chats
app.get('/api/p2p', async (req, res) => {
    try {
        const row = await dbGet("SELECT data FROM chats WHERE key = 'p2p'");
        res.json(row ? JSON.parse(row.data) : {});
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/p2p', async (req, res) => {
    try {
        await dbRun("INSERT OR REPLACE INTO chats (key, data) VALUES (?, ?)", ['p2p', JSON.stringify(req.body)]);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/', (req, res) => {
    res.send('Avenaa AI API v3.0 (SQLite) is running...');
});

module.exports = app;

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 API running at http://localhost:${PORT}`);
    });
}
