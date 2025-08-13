// 📂 File: npc-routes.js
const express = require('express');
const router = express.Router();

// In-memory storage for now (replace with DB later)
let playerData = {};

// Helper to get player state
function getPlayerState(playerId) {
    if (!playerData[playerId]) {
        playerData[playerId] = {
            quests: {},
            bank: [],
            idleChatCount: 0
        };
    }
    return playerData[playerId];
}

// NPC dialogue endpoint
router.get('/:npcId/dialogue', (req, res) => {
    const { npcId } = req.params;
    const { playerId } = req.query;
    const state = getPlayerState(playerId);

    let text = '';
    let options = [];

    if (npcId === 'questgiver1') {
        if (!state.quests.main) {
            text = "Hello traveler! I have a quest for you. Will you accept it?";
            options = [
                { id: 'acceptQuest', label: 'Yes, tell me more' },
                { id: 'declineQuest', label: 'No thanks' }
            ];
        } else if (state.quests.main.completed) {
            text = "You’ve already completed my quest. Thank you again!";
        } else {
            text = `You are still working on "${state.quests.main.name}". Progress: ${state.quests.main.progress}/5.`;
        }
    } else {
        text = "Greetings! What can I help you with?";
        options = [
            { id: 'bankAccess', label: 'Access my bank' },
            { id: 'idleChat', label: 'Let’s just chat' },
            { id: 'questCheck', label: 'Remind me of my quests' }
        ];
    }

    res.json({ text, options });
});

// NPC option selection endpoint
router.post('/option/:optionId', (req, res) => {
    const { optionId } = req.params;
    const { playerId } = req.query;
    const state = getPlayerState(playerId);

    let text = '';
    let options = [];

    switch (optionId) {
        case 'acceptQuest':
            state.quests.main = { name: 'Gather 5 Apples', progress: 0, completed: false };
            text = "Great! Please bring me 5 apples.";
            break;

        case 'declineQuest':
            text = "Very well. Come back if you change your mind.";
            break;

        case 'bankAccess':
            text = `Your bank contains: ${state.bank.length ? state.bank.join(', ') : 'nothing yet'}.`;
            break;

        case 'idleChat':
            state.idleChatCount++;
            text = `We’ve chatted ${state.idleChatCount} times now.`;
            break;

        case 'questCheck':
            if (Object.keys(state.quests).length === 0) {
                text = "You have no active quests.";
            } else {
                let questList = Object.values(state.quests)
                    .map(q => `${q.name} (${q.progress}/5)`)
                    .join(', ');
                text = `Your quests: ${questList}`;
            }
            break;

        default:
            text = "I don't understand that choice.";
            break;
    }

    res.json({ text, options });
});

module.exports = router;
