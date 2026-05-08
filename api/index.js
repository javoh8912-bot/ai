const express = require('express');
const { kv } = require('@vercel/kv');
const app = express();

app.use(express.json({ limit: '10mb' }));

// Helper to get or set default data
const getKV = async (key, defaultVal) => {
    try {
        const val = await kv.get(key);
        return val !== null ? val : defaultVal;
    } catch (e) {
        return defaultVal;
    }
};

// Get Users
app.get('/api/users', async (req, res) => {
    try {
        let users = await getKV('users', []);
        if (users.length === 0) {
            users = [{
                user: 'Javoh',
                pass: 'javoh2012',
                id: '111111',
                role: 'admin',
                joined: new Date().toISOString()
            }];
            await kv.set('users', users);
        }
        res.json(users);
    } catch (e) { res.status(500).send(e.message); }
});

// Update/Save Users (Batch)
app.post('/api/users', async (req, res) => {
    try {
        await kv.set('users', req.body);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// Update single user profile
app.post('/api/users/profile', async (req, res) => {
    try {
        const { username, profileData } = req.body;
        let users = await getKV('users', []);
        
        const idx = users.findIndex(u => u.user === username);
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...profileData };
            await kv.set('users', users);
            res.json({ status: 'success' });
        } else {
            res.status(404).send("User not found");
        }
    } catch (e) { res.status(500).send(e.message); }
});

// Settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await getKV('settings', { gemini_api_key: "" });
        
        // Vercel compatibility: Prioritize environment variable if set
        if (process.env.GEMINI_API_KEY) {
            settings.gemini_api_key = process.env.GEMINI_API_KEY;
        }
        
        res.json(settings);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await kv.set('settings', req.body);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// AI Chats
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await getKV('chats_ai', {});
        res.json(chats);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/chats', async (req, res) => {
    try {
        await kv.set('chats_ai', req.body);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

// P2P Chats
app.get('/api/p2p', async (req, res) => {
    try {
        const p2p = await getKV('chats_p2p', {});
        res.json(p2p);
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/p2p', async (req, res) => {
    try {
        await kv.set('chats_p2p', req.body);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/', (req, res) => {
    res.send('Aureoo AI API v3.1 (KV) is running...');
});

module.exports = app;

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 API running at http://localhost:${PORT}`);
    });
}
