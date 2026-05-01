const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'accounts.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const P2P_FILE = path.join(__dirname, 'p2p_chats.json');

// Get Users
app.get('/api/users', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(JSON.parse(data));
    });
});

// Save Users
app.post('/api/users', (req, res) => {
    const users = req.body;
    fs.writeFile(DB_FILE, JSON.stringify(users, null, 2), (err) => {
        if (err) return res.status(500).send(err);
        res.send({ status: 'success' });
    });
});

// Get Global Settings (API Key etc.)
app.get('/api/settings', (req, res) => {
    if (!fs.existsSync(SETTINGS_FILE)) {
        return res.json({ gemini_api_key: "" });
    }
    fs.readFile(SETTINGS_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(JSON.parse(data || '{}'));
    });
});

// Save Global Settings
app.post('/api/settings', (req, res) => {
    const settings = req.body;
    fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), (err) => {
        if (err) return res.status(500).send(err);
        res.send({ status: 'success' });
    });
});

// Get P2P Chats
app.get('/api/p2p', (req, res) => {
    if (!fs.existsSync(P2P_FILE)) return res.json({});
    fs.readFile(P2P_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(JSON.parse(data || '{}'));
    });
});

// Save P2P Chats
app.post('/api/p2p', (req, res) => {
    const chats = req.body;
    fs.writeFile(P2P_FILE, JSON.stringify(chats, null, 2), (err) => {
        if (err) return res.status(500).send(err);
        res.send({ status: 'success' });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Avenaa AI Server running at http://localhost:${PORT}`);
    console.log(`📂 Database file: ${DB_FILE}`);
});
