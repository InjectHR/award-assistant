export async function onRequestGet() {
  const source = "https://www.fairwork.gov.au/employment-conditions/awards/list-of-awards";

  const response = await fetch(source);
  const html = await response.text();

  const matches = [...html.matchAll(/href="https:\/\/awards\.fairwork\.gov\.au\/(MA\d{6})\.html"[^>]*>(.*?)<\/a>/gi)];

  const awards = matches.map((match) => ({
    code: match[1],
    title: match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim()
  }));

  const uniqueAwards = Array.from(
    new Map(awards.map((award) => [award.code, award])).values()
  ).sort((a, b) => a.title.localeCompare(b.title));

  return Response.json({
    source,
    count: uniqueAwards.length,
    awards: uniqueAwards
  });
}
