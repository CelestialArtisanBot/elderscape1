export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Example: Add player
    if (url.pathname === "/add" && request.method === "POST") {
      const { name, score } = await request.json();
      await env.DB.prepare(
        "INSERT INTO players (name, score) VALUES (?, ?)"
      ).bind(name, score).run();
      return new Response(`Player ${name} added with score ${score}`);
    }

    // Example: Get all players
    if (url.pathname === "/players") {
      const { results } = await env.DB.prepare("SELECT * FROM players").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Example: Home
    return new Response("Elderscape2 D1 Worker is running");
  }
};
