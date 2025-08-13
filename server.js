const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// =====================
// 📦 Load data
// =====================
const npcs = JSON.parse(fs.readFileSync(path.join(__dirname, 'public/game/data/npcs.json')));
let players = {}; // Store player state in memory for now

// =====================
// 📜 API: Get NPC dialogue
// =====================
app.get('/npc/:id/dialogue', (req, res) => {
    const npcId = req.params.id;
    const playerId = req.query.playerId;
    const npc = npcs[npcId];

    if (!npc) {
        return res.status(404).json({ text: 'This NPC does not exist.', options: [] });
    }

    if (!players[playerId]) {
        players[playerId] = { quests: {}, bank: [] };
    }

    let text = npc.greeting;
    let options = npc.options;

    // Quest reminder logic
    if (players[playerId].quests[npc.questId] && !players[playerId].quests[npc.questId].completed) {
        text = npc.reminder || text;
    }

    res.json({ text, options });
});

// =====================
// 📜 API: Choose NPC dialogue option
// =====================
app.post('/npc/:id/choose', (req, res) => {
    const npcId = req.params.id;
    const { optionId, playerId } = req.body;
    const npc = npcs[npcId];

    if (!npc || !npc.responses[optionId]) {
        return res.status(404).json({ text: 'Invalid choice.' });
    }

    // Example quest progression
    if (npc.questId) {
        if (!players[playerId].quests[npc.questId]) {
            players[playerId].quests[npc.questId] = { completed: false, progress: 0 };
        }
        players[playerId].quests[npc.questId].progress++;
    }

    res.json({ text: npc.responses[optionId] });
});

// =====================
// 📜 API: Player state
// =====================
app.get('/player/:id/state', (req, res) => {
    const playerId = req.params.id;
    if (!players[playerId]) {
        players[playerId] = { quests: {}, bank: [] };
    }
    res.json(players[playerId]);
});

// =====================
// 💬 API: Chat
// =====================
app.post('/chat/send', (req, res) => {
    const { playerId, message } = req.body;
    console.log(`[Chat] ${playerId}: ${message}`);
    res.json({ status: 'ok', echo: message });
});

// =====================
// 🌍 Serve static files
// =====================
app.use(express.static(path.join(__dirname, 'public')));

// =====================
// 🛠 Fix for Express v5 wildcard
// =====================
app.get(/^(?!\/(npc|player|chat|assets|scripts|styles|data)).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================
// 🚀 Start server
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ElderScape server running on http://localhost:${PORT}`));
