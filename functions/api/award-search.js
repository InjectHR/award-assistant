export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = (url.searchParams.get("code") || "").toUpperCase();
  const query = (url.searchParams.get("q") || "").toLowerCase().trim();

  if (!/^MA\d{6}$/.test(code)) {
    return Response.json({ error: "Invalid award code" }, { status: 400 });
  }

  if (!query) {
    return Response.json({ error: "Missing search query" }, { status: 400 });
  }

  const awardUrl = `https://awards.fairwork.gov.au/${code}.html`;

  const response = await fetch(awardUrl);
  const html = await response.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lowerText = text.toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const matches = [];

  for (const word of words) {
    let searchFrom = 0;

    while (matches.length < 6) {
      const index = lowerText.indexOf(word, searchFrom);
      if (index === -1) break;

      const start = Math.max(0, index - 800);
      const end = Math.min(text.length, index + 1800);

      matches.push({
        title: `Match ${matches.length + 1}`,
        text: text.slice(start, end)
      });

      searchFrom = index + word.length;
    }
  }

  return Response.json({
    code,
    query,
    source: awardUrl,
    matches
  });
}
