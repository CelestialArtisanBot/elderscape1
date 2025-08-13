/* ===========================
   ElderScape: chat-system.js
   ===========================
   Provides:
     - addChatMessage(channel, author, text)
     - showNPCDialogue(text, options)
     - closeNPCDialogue()
     - remindQuestProgress(npcId)
     - setChatChannel(channel)
     - togglePlayerInteractChat(on)

   Depends on:
     - Global: playerId, playerData (initialized in index.html)
     - DOM: #chat-box, #npc-dialogue-container, #gameCanvas
*/

(function () {
  // ---- DOM bootstrap -------------------------------------------------------
  const chatBox = document.getElementById("chat-box");
  const npcOverlay = document.getElementById("npc-dialogue-container");

  // Build chat input UI dynamically so index.html stays simple
  const chatUI = document.createElement("div");
  chatUI.style.position = "absolute";
  chatUI.style.left = "8px";
  chatUI.style.right = "8px";
  chatUI.style.bottom = "8px";
  chatUI.style.display = "flex";
  chatUI.style.gap = "8px";
  chatUI.style.alignItems = "center";

  // Channel selector
  const channelSelect = document.createElement("select");
  channelSelect.id = "chat-channel";
  const channels = ["World", "Public", "Friends", "Group"];
  channels.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.toLowerCase();
    opt.textContent = c;
    channelSelect.appendChild(opt);
  });

  // Interact chat toggle
  const interactToggleWrap = document.createElement("label");
  interactToggleWrap.style.display = "flex";
  interactToggleWrap.style.alignItems = "center";
  interactToggleWrap.style.gap = "6px";
  const interactToggle = document.createElement("input");
  interactToggle.type = "checkbox";
  interactToggle.id = "interact-chat-toggle";
  interactToggle.checked =
    JSON.parse(localStorage.getItem("interactChatEnabled") || "true") === true;
  const toggleText = document.createElement("span");
  toggleText.textContent = "NPC Interact Chat";
  interactToggleWrap.appendChild(interactToggle);
  interactToggleWrap.appendChild(toggleText);

  // Chat input
  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.id = "chat-input";
  chatInput.placeholder = "Type message… (Enter to send)";
  chatInput.style.flex = "1 1 auto";
  chatInput.style.height = "36px";
  chatInput.style.borderRadius = "6px";
  chatInput.style.border = "1px solid #555";
  chatInput.style.padding = "0 10px";
  chatInput.style.background = "rgba(30,30,30,0.9)";
  chatInput.style.color = "#fff";

  // Send button
  const sendBtn = document.createElement("button");
  sendBtn.id = "chat-send";
  sendBtn.textContent = "Send";
  sendBtn.style.height = "36px";
  sendBtn.style.padding = "0 14px";
  sendBtn.style.borderRadius = "6px";
  sendBtn.style.border = "1px solid #f6821f";
  sendBtn.style.background = "#f6821f";
  sendBtn.style.color = "#fff";
  sendBtn.style.cursor = "pointer";

  chatUI.appendChild(channelSelect);
  chatUI.appendChild(interactToggleWrap);
  chatUI.appendChild(chatInput);
  chatUI.appendChild(sendBtn);

  // Place chatUI on top of chatBox (which is full-width, bottom docked)
  chatBox.appendChild(chatUI);

  // ---- State ---------------------------------------------------------------
  const CHAT_LOG_KEY = `chatLog_${playerId}`;
  const FRIENDS_KEY = `friends_${playerId}`;
  const GROUP_KEY = `group_${playerId}`;
  const NPC_INTERACT_KEY = `interactChatEnabled`;

  let currentChannel =
    localStorage.getItem(`chatChannel_${playerId}`) || "world";

  // Ensure persisted lists exist
  const friends = new Set(
    JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]") || []
  );
  let group = JSON.parse(localStorage.getItem(GROUP_KEY) || "null");

  // ---- Helpers -------------------------------------------------------------

  function persistFriends() {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify([...friends]));
  }
  function persistGroup() {
    localStorage.setItem(GROUP_KEY, JSON.stringify(group));
  }
  function persistChannel() {
    localStorage.setItem(`chatChannel_${playerId}`, currentChannel);
  }

  function timeStamp() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function saveChatLog(entry) {
    try {
      const log = JSON.parse(localStorage.getItem(CHAT_LOG_KEY) || "[]");
      log.push(entry);
      // limit to 500 messages
      while (log.length > 500) log.shift();
      localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(log));
      // Fire-and-forget telemetry if endpoint exists
      fetch("/telemetry/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => {});
    } catch (_) {}
  }

  function scrollChatToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function styleForChannel(channel) {
    switch (channel) {
      case "world":
        return "color:#79c0ff";
      case "public":
        return "color:#c8ffa8";
      case "friends":
        return "color:#ffd580";
      case "group":
        return "color:#ff9bd7";
      default:
        return "color:#ddd";
    }
  }

  function sanitize(text) {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // ---- Chat API (global) ---------------------------------------------------

  function addChatMessage(channel, author, text) {
    const safeText = sanitize(text);
    const safeAuthor = sanitize(author);
    const line = document.createElement("div");
    line.className = "chat-message";
    line.style.margin = "4px 0";
    line.style.fontSize = "14px";
    line.innerHTML = `<span style="opacity:.65;">[${timeStamp()}]</span> <span style="${styleForChannel(
      channel
    )}">[${channel}]</span> <strong>${safeAuthor}:</strong> ${safeText}`;
    // Insert above the input row (chatUI is the last child)
    chatBox.insertBefore(line, chatUI);
    scrollChatToBottom();

    saveChatLog({
      t: Date.now(),
      ts: timeStamp(),
      channel,
      author,
      text,
    });
  }

  // ---- NPC Dialogue Overlay ------------------------------------------------

  function showNPCDialogue(text, options = []) {
    // Respect interact chat toggle: if off, don't auto-open
    const enabled =
      JSON.parse(localStorage.getItem(NPC_INTERACT_KEY) || "true") === true;
    if (!enabled) return;

    // Build overlay
    npcOverlay.style.display = "block";
    npcOverlay.className = "npc-dialogue-overlay";
    npcOverlay.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.maxWidth = "920px";
    wrap.style.margin = "0 auto";
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr";
    wrap.style.gap = "10px";

    const txt = document.createElement("div");
    txt.style.fontSize = "16px";
    txt.style.lineHeight = "1.5";
    txt.style.color = "#ffcc66";
    txt.textContent = text;

    const optsWrap = document.createElement("div");
    optsWrap.style.display = "grid";
    optsWrap.style.gridTemplateColumns = "1fr 1fr";
    optsWrap.style.gap = "8px";

    // Options: [{id, label}] or simple strings
    (options || []).forEach((opt) => {
      const id = typeof opt === "string" ? opt : opt.id;
      const label = typeof opt === "string" ? opt : opt.label;
      const btn = document.createElement("button");
      btn.className = "npc-option";
      btn.textContent = label;
      btn.onclick = () => selectNPCOption(id);
      optsWrap.appendChild(btn);
    });

    // Close / Continue button if no options
    if (!options || options.length === 0) {
      const cont = document.createElement("button");
      cont.className = "npc-option";
      cont.textContent = "Continue";
      cont.onclick = closeNPCDialogue;
      optsWrap.appendChild(cont);
    }

    wrap.appendChild(txt);
    wrap.appendChild(optsWrap);
    npcOverlay.appendChild(wrap);

    // Also echo into chat (as NPC)
    addChatMessage("public", "NPC", text);
  }

  function closeNPCDialogue() {
    npcOverlay.style.display = "none";
    npcOverlay.innerHTML = "";
  }

  // Option selection handler (client-first; falls back to local)
  async function selectNPCOption(optionId) {
    try {
      // If your Worker route exists, this will drive dynamic dialogue
      const res = await fetch(`/npc/option/${encodeURIComponent(optionId)}?playerId=${encodeURIComponent(playerId)}`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applyRewards) {
          applyRewardsToPlayer(data.applyRewards);
        }
        if (data.updateQuest) {
          updateQuestProgress(data.updateQuest);
        }
        if (data.text || data.options) {
          showNPCDialogue(data.text || "", data.options || []);
          return;
        }
      }
    } catch (_) {
      // ignore network errors, fall back to local
    }
    // Local fallback
    const local = localOptionRouter(optionId);
    if (local.applyRewards) applyRewardsToPlayer(local.applyRewards);
    if (local.updateQuest) updateQuestProgress(local.updateQuest);
    showNPCDialogue(local.text || "…", local.options || []);
  }

  // ---- Quest reminders -----------------------------------------------------

  function remindQuestProgress(npcId) {
    const q = summarizeQuestForNPC(npcId);
    if (!q) return;
    showNPCDialogue(q, ["Got it"]);
  }

  function summarizeQuestForNPC(npcId) {
    // Minimal mapping (extend as you add content)
    const npcToQuest = {
      tutorial_guide: "tutorial_basics",
      wizard_merlin: "first_magic",
      smith_gareth: "smithing_intro",
      chef_rosa: "fresh_catch",
    };
    const qid = npcToQuest[npcId];
    if (!qid) return null;

    const progress = playerData.quests[qid] || { step: 0, complete: false };
    if (progress.complete) {
      return "You've already completed this quest. Well done!";
    }
    // Simple example text:
    switch (qid) {
      case "tutorial_basics": {
        const step = progress.step || 0;
        if (step === 0)
          return "Talk to Sage Elara at the Town Center to begin your journey.";
        if (step === 1)
          return "Mine 5 copper ore at the smithing area rocks.";
        if (step === 2)
          return "Smelt bronze bars at the furnace, then smith a bronze dagger.";
        if (step === 3) return "Equip your bronze dagger.";
        if (step === 4)
          return "Attack the training dummy in the cave 3 times to practice combat.";
        return "Return to Sage Elara to finish the tutorial.";
      }
      default:
        return "Keep going—you’re making progress!";
    }
  }

  // ---- Rewards & Quest Progress (client-side) ------------------------------

  function applyRewardsToPlayer(rew) {
    playerData.gold = (playerData.gold || 0) + (rew.gold || 0);
    if (rew.items && Array.isArray(rew.items)) {
      playerData.items = playerData.items || [];
      rew.items.forEach((it) => playerData.items.push(it));
    }
    if (rew.xp) {
      playerData.xp = playerData.xp || {};
      Object.entries(rew.xp).forEach(([skill, amt]) => {
        playerData.xp[skill] = (playerData.xp[skill] || 0) + amt;
      });
    }
    localStorage.setItem(`playerData_${playerId}`, JSON.stringify(playerData));
    addChatMessage("public", "System", "Rewards applied.");
  }

  function updateQuestProgress({ id, stepDelta = 1, complete = false }) {
    const q = (playerData.quests[id] = playerData.quests[id] || {
      step: 0,
      complete: false,
    });
    if (!q.complete) q.step = Math.max(0, (q.step || 0) + stepDelta);
    if (complete) q.complete = true;
    localStorage.setItem(`playerData_${playerId}`, JSON.stringify(playerData));
    addChatMessage(
      "public",
      "System",
      `Quest "${id}" updated. Step: ${q.step}${q.complete ? " (Complete)" : ""}`
    );
  }

  // ---- Local dialogue fallback content -------------------------------------

  // Minimal dialogue trees for key NPCs (expand freely)
  const LOCAL_NPCS = {
    tutorial_guide: {
      greet() {
        const q = playerData.quests["tutorial_basics"] || { step: 0 };
        if (!playerData.quests["tutorial_basics"]) {
          playerData.quests["tutorial_basics"] = { step: 0, complete: false };
          localStorage.setItem(
            `playerData_${playerId}`,
            JSON.stringify(playerData)
          );
        }
        return {
          text:
            "Sage Elara: Welcome to ElderScape! I’ll teach you the basics. Ready to begin?",
          options: [
            { id: "tut_begin", label: "Yes, let's begin." },
            { id: "tut_remind", label: "Remind me what to do." },
            { id: "tut_later", label: "Not now." },
          ],
        };
      },
    },
    banker_aldric: {
      greet() {
        return {
          text:
            "Banker Aldric: Your items are safe with me. Would you like to access your bank?",
          options: [
            { id: "bank_open", label: "Open bank" },
            { id: "bank_info", label: "How does banking work?" },
            { id: "close", label: "Close" },
          ],
        };
      },
    },
    wizard_merlin: {
      greet() {
        return {
          text:
            "Wizard Merlin: Magic flows through all things! Care to buy runes or learn a trick?",
          options: [
            { id: "magic_shop", label: "Open Magic Shop" },
            { id: "magic_hint", label: "Any beginner tips?" },
            { id: "close", label: "Close" },
          ],
        };
      },
    },
    chef_rosa: {
      greet() {
        return {
          text:
            "Chef Rosa: Good food keeps adventurers strong! Want to cook or learn about fishing?",
          options: [
            { id: "cook_open", label: "Open Cooking" },
            { id: "fish_hint", label: "Fishing tips" },
            { id: "close", label: "Close" },
          ],
        };
      },
    },
  };

  function localOptionRouter(optionId) {
    switch (optionId) {
      // Tutorial Guide
      case "tut_begin":
        return {
          updateQuest: { id: "tutorial_basics", stepDelta: 1 },
          text:
            "Great! First, mine 5 copper ore at the rocks near the smithing area.",
          options: ["Got it"],
        };
      case "tut_remind":
        return {
          text: summarizeQuestForNPC("tutorial_guide"),
          options: ["Thanks"],
        };
      case "tut_later":
        return { text: "Very well. Return when you’re ready.", options: [] };

      // Banker
      case "bank_open":
        // You can open your own bank UI here; for now just a message
        return {
          text: "Bank opened. (UI coming from game engine overlay)",
          options: ["Close"],
        };
      case "bank_info":
        return {
          text:
            "Banking is free for all players. Items stored here stay safe and persist.",
          options: ["Close"],
        };

      // Wizard
      case "magic_shop":
        return {
          text:
            "Shop opened. (UI coming from game engine overlay). Anything else?",
          options: ["Close"],
        };
      case "magic_hint":
        return {
          text:
            "Begin with Mind runes and a basic staff. Air spells are cheap and reliable.",
          options: ["Thanks"],
        };

      // Chef
      case "cook_open":
        return {
          text:
            "Cooking station opened. (UI via engine) Bring raw fish to practice.",
          options: ["Close"],
        };
      case "fish_hint":
        return {
          text:
            "Shrimp spots are level 1; cook them right away to save trips. Never eat raw fish!",
          options: ["Thanks"],
        };

      // Generic close
      case "close":
        return { text: "Safe travels!", options: [] };

      default:
        return { text: "…", options: [] };
    }
  }

  // Expose a helper for the engine/bridge to start NPC convo
  window.__npcStartDialogue = function (npcId) {
    const npc = LOCAL_NPCS[npcId];
    if (npc && typeof npc.greet === "function") {
      const d = npc.greet();
      showNPCDialogue(d.text, d.options);
    } else {
      // Attempt server fallback if unknown locally
      fetch(`/npc/${encodeURIComponent(npcId)}/dialogue?playerId=${encodeURIComponent(playerId)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          showNPCDialogue(data.text || "…", data.options || []);
        })
        .catch(() => {
          showNPCDialogue("Hello, adventurer.", ["Close"]);
        });
    }
  };

  // ---- Chat input behavior -------------------------------------------------

  function sendChatFromInput() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Simple command parsing
    if (text.startsWith("/")) {
      handleSlashCommand(text);
      chatInput.value = "";
      return;
    }

    // Route message to selected channel
    addChatMessage(currentChannel, playerData.name || "You", text);

    // Optional: send to server if present
    fetch(`/chat/${currentChannel}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        name: playerData.name || "Adventurer",
        text,
      }),
    }).catch(() => {});

    chatInput.value = "";
  }

  function handleSlashCommand(cmd) {
    const [base, ...rest] = cmd.slice(1).split(" ");
    const arg = rest.join(" ").trim();

    switch (base.toLowerCase()) {
      case "channel":
      case "ch":
        if (["world", "public", "friends", "group"].includes(arg.toLowerCase())) {
          setChatChannel(arg.toLowerCase());
          addChatMessage("public", "System", `Channel set to ${arg}.`);
        } else {
          addChatMessage(
            "public",
            "System",
            "Usage: /ch world|public|friends|group"
          );
        }
        break;

      case "addfriend":
        if (!arg) {
          addChatMessage("public", "System", "Usage: /addfriend <name>");
        } else {
          friends.add(arg);
          persistFriends();
          addChatMessage("friends", "System", `Added ${arg} to friends.`);
        }
        break;

      case "rmfriend":
        if (!arg) {
          addChatMessage("public", "System", "Usage: /rmfriend <name>");
        } else {
          friends.delete(arg);
          persistFriends();
          addChatMessage("friends", "System", `Removed ${arg} from friends.`);
        }
        break;

      case "group":
        if (arg.toLowerCase() === "leave") {
          group = null;
          persistGroup();
          addChatMessage("group", "System", "You left the group.");
        } else if (arg) {
          group = { id: arg, members: [playerData.name || "You"] };
          persistGroup();
          addChatMessage("group", "System", `Joined/created group: ${arg}`);
        } else {
          addChatMessage(
            "group",
            "System",
            "Usage: /group <name>  — or —  /group leave"
          );
        }
        break;

      case "name":
        if (!arg) {
          addChatMessage("public", "System", "Usage: /name <yourName>");
        } else {
          playerData.name = arg;
          localStorage.setItem(
            `playerData_${playerId}`,
            JSON.stringify(playerData)
          );
          addChatMessage("public", "System", `Name set to ${arg}`);
        }
        break;

      case "npc":
        if (!arg) {
          addChatMessage(
            "public",
            "System",
            "Usage: /npc <tutorial_guide|banker_aldric|wizard_merlin|chef_rosa>"
          );
        } else {
          window.__npcStartDialogue(arg);
        }
        break;

      case "remind":
        remindQuestProgress("tutorial_guide");
        break;

      default:
        addChatMessage(
          "public",
          "System",
          `Unknown command: /${base}. Try /ch, /addfriend, /group, /name, /npc, /remind`
        );
    }
  }

  // ---- Public setters ------------------------------------------------------

  function setChatChannel(channel) {
    currentChannel = channel;
    channelSelect.value = channel;
    persistChannel();
  }

  function togglePlayerInteractChat(on) {
    interactToggle.checked = !!on;
    localStorage.setItem(NPC_INTERACT_KEY, JSON.stringify(!!on));
  }

  // ---- Wire up events ------------------------------------------------------

  sendBtn.addEventListener("click", sendChatFromInput);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendChatFromInput();
    }
  });

  channelSelect.addEventListener("change", (e) => {
    setChatChannel(e.target.value);
  });

  interactToggle.addEventListener("change", (e) => {
    localStorage.setItem(NPC_INTERACT_KEY, JSON.stringify(e.target.checked));
    addChatMessage(
      "public",
      "System",
      `NPC Interact Chat ${e.target.checked ? "enabled" : "disabled"}.`
    );
  });

  // ---- Initial greet & restore --------------------------------------------

  setChatChannel(currentChannel);

  addChatMessage(
    "public",
    "System",
    "Channels: /ch world|public|friends|group  •  Friends: /addfriend <name>  •  Group: /group <name>|leave  •  NPC: /npc tutorial_guide  •  Remind: /remind"
  );

  // Expose globals for bridge / engine usage
  window.addChatMessage = addChatMessage;
  window.showNPCDialogue = showNPCDialogue;
  window.closeNPCDialogue = closeNPCDialogue;
  window.remindQuestProgress = remindQuestProgress;
  window.setChatChannel = setChatChannel;
  window.togglePlayerInteractChat = togglePlayerInteractChat;
})();
