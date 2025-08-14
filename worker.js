export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/add") {
      const name = url.searchParams.get("name");
      const score = parseInt(url.searchParams.get("score"), 10);
      if (!name || isNaN(score)) {
        return new Response("Missing name or score", { status: 400 });
      }
      await env.DB.prepare("INSERT INTO players (name, score) VALUES (?, ?)")
        .bind(name, score)
        .run();
      return new Response(`Added ${name} with score ${score}`);
    }

    if (url.pathname === "/list") {
      const { results } = await env.DB.prepare(
        "SELECT id, name, score FROM players ORDER BY score DESC"
      ).all();
      return Response.json(results);
    }

    if (url.pathname === "/reset" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM players").run();
      return new Response("All player scores reset.");
    }

    return new Response("Not found", { status: 404 });
  },
};
