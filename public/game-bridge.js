const currentPlayerId = "player123";

// --- Chat State ---
let activeChannel = "world";
const chatTabs  = document.querySelectorAll("#chat-tabs button");
const chatLog   = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const chatSend  = document.getElementById("chat-send");

const chatHistory = {
  world:   [],
  public:  [],
  friends: [],
  group:   [],
  npc:     []
};

// Switch chat channel
chatTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    chatTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeChannel = tab.dataset.channel;
    renderChatHistory();
  });
});

function renderChatHistory() {
  chatLog.innerHTML = "";
  chatHistory[activeChannel].forEach(line => chatLog.appendChild(line));
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addChatMessage(channel, sender, message) {
  const line = document.createElement("div");
  line.className = `chat-line chat-${channel}`;
  const tag = document.createElement("span");
  tag.className = "chat-tag";
  tag.textContent = `[${channel.toUpperCase()}] ${sender}: `;
  line.appendChild(tag);
  line.appendChild(document.createTextNode(message));
  chatHistory[channel].push(line);
  if (channel === activeChannel) {
    chatLog.appendChild(line);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

// Send chat message to backend
function sendChatMessage(channel, message) {
  if (!message.trim()) return;
  addChatMessage(channel, "You", message);
  fetch(`/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: currentPlayerId, channel, message })
  }).catch(console.error);
}

chatSend.addEventListener("click", () => {
  sendChatMessage(activeChannel, chatInput.value);
  chatInput.value = "";
});

chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    sendChatMessage(activeChannel, chatInput.value);
    chatInput.value = "";
  }
});

// --- NPC Dialogue ---
function interactWithNPC(npcId) {
  fetch(`/npc/${npcId}/dialogue?playerId=${currentPlayerId}`)
    .then(res => res.json())
    .then(dialogueData => {
      addChatMessage("npc", "NPC", dialogueData.text);
      showNPCDialogue(dialogueData.text, dialogueData.options);
    })
    .catch(console.error);
}

function showNPCDialogue(text, options) {
  const npcDialogue = document.getElementById("npc-dialogue");
  const npcText     = document.getElementById("npc-text");
  const npcOptions  = document.getElementById("npc-options");

  npcText.textContent = text;
  npcOptions.innerHTML = "";
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.textContent = opt.text;
    btn.addEventListener("click", () => chooseNPCOption(opt.id));
    npcOptions.appendChild(btn);
  });
  npcDialogue.classList.remove("hidden");
  document.body.classList.add("npc-active");
}

function chooseNPCOption(optionId) {
  fetch(`/npc/${optionId}/choose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: currentPlayerId })
  })
    .then(res => res.json())
    .then(response => {
      addChatMessage("npc", "NPC", response.text);
      if (response.endDialogue) {
        closeNPCDialogue();
      } else {
        showNPCDialogue(response.text, response.options);
      }
    })
    .catch(console.error);
}

function closeNPCDialogue() {
  const npcDialogue = document.getElementById("npc-dialogue");
  npcDialogue.classList.add("hidden");
  document.body.classList.remove("npc-active");
}

// --- Quest Reminders ---
function remindQuestProgress() {
  fetch(`/player/${currentPlayerId}/state`)
    .then(res => res.json())
    .then(state => {
      if (state.quests) {
        state.quests.forEach(q => {
          addChatMessage("npc", "Quest Giver", `You are ${q.percent}% done with "${q.name}"`);
        });
      }
    })
    .catch(console.error);
}

setInterval(remindQuestProgress, 5 * 60 * 1000);

