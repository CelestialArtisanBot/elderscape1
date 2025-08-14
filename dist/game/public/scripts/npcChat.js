async function talkToNPC(npcId) {
  try {
    const response = await fetch("../data/npcs.json");
    const npcData = await response.json();
    const npc = npcData.find(n => n.id === npcId);

    if (!npc) {
      console.error("NPC not found:", npcId);
      return;
    }

    // Show basic NPC greeting in the game UI
    showChatMessage(`${npc.name}: Hello, traveler.`);

    // Send prompt to AI backend for richer dialog
    const aiResponse = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: npc.ai_prompt },
          { role: "user", content: "Greet the player and offer help." }
        ]
      })
    });

    if (!aiResponse.ok) throw new Error("AI API request failed");

    const reader = aiResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      try {
        const jsonData = JSON.parse(chunk);
        if (jsonData.response) {
          fullText += jsonData.response;
          updateChatWindow(`${npc.name}: ${fullText}`);
        }
      } catch (e) {
        // Ignore partial chunks
      }
    }
  } catch (err) {
    console.error("Error talking to NPC:", err);
  }
}

function showChatMessage(message) {
  console.log("[NPC]", message); // Replace with in-game chat UI update
}

function updateChatWindow(message) {
  console.log("[AI NPC]", message); // Replace with real UI binding
}
