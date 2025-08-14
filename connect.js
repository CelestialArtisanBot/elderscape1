export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CREATE: /add?name=Bob&score=150
    if (pathname === "/add") {
      const name = url.searchParams.get("name");
      const score = parseInt(url.searchParams.get("score"), 10);

      if (!name || isNaN(score)) {
        return new Response("Missing name or score", { status: 400 });
      }

      await env.DB.prepare(
        "INSERT INTO players (name, score) VALUES (?, ?)"
      ).bind(name, score).run();

      return new Response(`Player ${name} added with score ${score}`);
    }

    // READ: /list
    if (pathname === "/list") {
      const { results } = await env.DB.prepare("SELECT * FROM players").all();
      return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // DEFAULT
    return new Response("Try /add or /list");
  }
}
