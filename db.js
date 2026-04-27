/**
 * Avenaa AI Database Manager
 * Handles all persistent data operations via LocalStorage
 */

const DB = {
    // ── SYNC WITH FILE DATABASE (accounts.json) ──
    syncWithFile: async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const users = await res.json();
                localStorage.setItem('ai_db', JSON.stringify(users));
                console.log("✅ Database synced with accounts.json");
            }
        } catch (e) {
            console.log("ℹ️ Server not running, using LocalStorage only.");
        }
    },

    saveToFile: async () => {
        try {
            const users = DB.getUsers();
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(users)
            });
        } catch (e) {}
    },

    // ── USER OPERATIONS ──
    getUsers: () => JSON.parse(localStorage.getItem('ai_db') || '[{"user":"Javoh","pass":"javoh2012","avatar":null}]'),
    
    saveUser: (userObj) => {
        let users = DB.getUsers();
        users.push(userObj);
        localStorage.setItem('ai_db', JSON.stringify(users));
        DB.saveToFile();
    },

    updateUser: (oldName, newData) => {
        let users = DB.getUsers();
        let idx = users.findIndex(u => u.user === oldName);
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...newData };
            localStorage.setItem('ai_db', JSON.stringify(users));
            DB.saveToFile();
            return true;
        }
        return false;
    },


    // ── CHAT OPERATIONS ──
    getChats: () => JSON.parse(localStorage.getItem('ai_chats') || '{}'),
    
    saveChats: (chats) => localStorage.setItem('ai_chats', JSON.stringify(chats)),

    getUserChats: (username) => {
        const chats = DB.getChats();
        return chats[username] || [];
    },

    // ── MESSAGE DATABASE ──
    getGlobalMessages: () => JSON.parse(localStorage.getItem('ai_all_messages') || '[]'),

    logMessage: (user, text) => {
        let msgs = DB.getGlobalMessages();
        msgs.unshift({ user, text, date: new Date().toLocaleString() });
        if (msgs.length > 500) msgs.pop();
        localStorage.setItem('ai_all_messages', JSON.stringify(msgs));
    },

    // ── SYSTEM SETTINGS ──
    getSettings: () => ({
        apiKey: localStorage.getItem('gemini_api_key') || "",
        theme: localStorage.getItem('ai_theme') || "#6366f1",
        bgOpacity: localStorage.getItem('ai_bg_opacity') || "50"
    }),

    saveSetting: (key, value) => localStorage.setItem(key, value),

    // ── EXPORT / IMPORT ──
    exportDB: () => {
        const data = {
            users: DB.getUsers(),
            chats: DB.getChats(),
            messages: DB.getGlobalMessages(),
            settings: DB.getSettings()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `avenaa_database_${Date.now()}.json`;
        a.click();
    },

    // ── MYSQL SIMULATOR ──
    runSQL: (query) => {
        const q = query.toLowerCase().trim();
        if (q === 'select * from users') return DB.getUsers();
        if (q === 'select * from messages') return DB.getGlobalMessages();
        
        if (q.startsWith('select * from users where')) {
            const val = q.split("'")[1];
            return DB.getUsers().filter(u => u.user.toLowerCase() === val.toLowerCase());
        }
        
        return { error: "Unknown query or syntax error. Try: SELECT * FROM users" };
    }
};

