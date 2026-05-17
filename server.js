const http = require("http");
const path = require("path");
const fs = require("fs/promises");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const samplePayRates = [
  { classification: "C14 / V1", weekly: 922.7, hourly: 24.28 },
  { classification: "C13 / V2", weekly: 948.0, hourly: 24.95 },
  { classification: "C12 / V3", weekly: 982.4, hourly: 25.85 },
  { classification: "C11 / V4", weekly: 1014.7, hourly: 26.7 },
  { classification: "C10 / V5", weekly: 1068.4, hourly: 28.12 },
  { classification: "C9 / V6", weekly: 1102.0, hourly: 29.0 },
  { classification: "C8 / V7", weekly: 1135.5, hourly: 29.88 },
  { classification: "C7", weekly: 1165.7, hourly: 30.68 },
  { classification: "V8", weekly: 1168.9, hourly: 30.76 },
  { classification: "C6 / V9", weekly: 1224.9, hourly: 32.23 },
  { classification: "C5 / V10", weekly: 1250.1, hourly: 32.9 },
  { classification: "C4 / V11", weekly: 1283.5, hourly: 33.78 },
  { classification: "C3 / V12", weekly: 1350.8, hourly: 35.55 },
  { classification: "C2(a) / V13", weekly: 1384.4, hourly: 36.43 },
  { classification: "C2(b) / V14", weekly: 1445.1, hourly: 38.03 },
  { classification: "D1", weekly: 1027.8, hourly: 27.05 },
  { classification: "D2", weekly: 1040.2, hourly: 27.37 },
  { classification: "D3", weekly: 1052.6, hourly: 27.7 },
  { classification: "D4", weekly: 1067.3, hourly: 28.09 }
];

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function normaliseClassification(value = "") {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getSampleRates(classification) {
  const wanted = normaliseClassification(classification);
  if (!wanted) {
    return samplePayRates;
  }

  return samplePayRates.filter((rate) => {
    const normalised = normaliseClassification(rate.classification);
    return normalised.includes(wanted) || wanted.includes(normalised);
  });
}

function buildFwcApiUrl(routePath, baseUrl = process.env.FWC_API_BASE_URL || "https://api.fwc.gov.au/api/v1") {
  if (/^https?:\/\//i.test(routePath)) {
    return new URL(routePath);
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  let cleanPath = routePath.replace(/^\/+/, "");
  if (/\/api\/v1$/i.test(cleanBase) && /^api\/v1\//i.test(cleanPath)) {
    cleanPath = cleanPath.replace(/^api\/v1\//i, "");
  }
  return new URL(`${cleanBase}/${cleanPath}`);
}

function getPayRatesPath() {
  const configuredPath = process.env.FWC_API_PAY_RATES_PATH || "/api/v1/awards/{id_or_code}/pay-rates";
  if (/^\/?pay-?rates$/i.test(configuredPath)) {
    return "/api/v1/awards/{id_or_code}/pay-rates";
  }
  return configuredPath;
}

function getFwcApiHeaders() {
  const key = process.env.FWC_API_SUBSCRIPTION_KEY;
  const keyHeader = process.env.FWC_API_KEY_HEADER || "Ocp-Apim-Subscription-Key";
  return {
    Accept: "application/json",
    ...(key ? { [keyHeader]: key } : {})
  };
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToSearchableText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(h[1-6]|p|li|tr|div|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  ).trim();
}

function awardViewerScript(code) {
  return `
    <script>
      (function () {
        var awardCode = ${JSON.stringify(code)};
        var officialOrigin = "https://awards.fairwork.gov.au";
        var topicTerms = {
          "ordinary hours": [["ordinary", "hours"]],
          "overtime": [["overtime"]],
          "penalty rates": [["penalty", "rates"], ["penalties"]],
          "annual leave": [["annual", "leave"]],
          "classifications": [["schedule", "a"], ["classification"], ["classifications"]]
        };

        function normalise(value) {
          return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        }

        function visibleText(element) {
          return String(element.textContent || "").replace(/\\s+/g, " ").trim();
        }

        function linkTextLength(element) {
          return Array.prototype.slice.call(element.querySelectorAll("a")).reduce(function (total, link) {
            return total + visibleText(link).length;
          }, 0);
        }

        function isMostlyLinkText(element, text) {
          if (element.tagName === "A" || element.closest("a")) return true;
          if (!element.querySelector("a")) return false;
          return linkTextLength(element) / Math.max(text.length, 1) > 0.55;
        }

        function inLinkHeavyContainer(element) {
          var container = element.closest("nav, ul, ol, table, [role='navigation']");
          if (!container) return false;
          var linkCount = container.querySelectorAll("a").length;
          if (linkCount < 5) return false;
          return linkTextLength(container) / Math.max(visibleText(container).length, 1) > 0.5;
        }

        function hasBodyTextAfter(element) {
          var current = element;
          for (var i = 0; i < 6; i += 1) {
            current = current.nextElementSibling;
            if (!current) return false;
            var text = visibleText(current);
            if (text.length > 80 && !isMostlyLinkText(current, text)) {
              return true;
            }
          }
          return false;
        }

        function nextBodyText(element) {
          var parts = [];
          var current = element;
          for (var i = 0; i < 8; i += 1) {
            current = current.nextElementSibling;
            if (!current) break;
            var text = visibleText(current);
            if (text && !isMostlyLinkText(current, text)) {
              parts.push(text);
            }
          }
          return normalise(parts.join(" "));
        }

        function findAnchorTarget(hash) {
          if (!hash || hash === "#") return null;
          var id = decodeURIComponent(hash.slice(1));
          return document.getElementById(id) || document.getElementsByName(id)[0];
        }

        function scrollToAnchor(hash) {
          var target = findAnchorTarget(hash);
          if (!target) return false;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.classList.add("award-assistant-highlight");
          window.setTimeout(function () {
            target.classList.remove("award-assistant-highlight");
          }, 2600);
          return true;
        }

        function internalHashFromLink(link) {
          var rawHref = link.getAttribute("href") || "";
          if (!rawHref || rawHref.indexOf("javascript:") === 0 || rawHref.indexOf("mailto:") === 0) {
            return "";
          }

          if (rawHref.charAt(0) === "#") {
            return rawHref;
          }

          try {
            var url = new URL(rawHref, officialOrigin + "/" + awardCode + ".html");
            var isSameAward = url.hostname === "awards.fairwork.gov.au" && url.pathname.toLowerCase().endsWith("/" + awardCode.toLowerCase() + ".html");
            return isSameAward && url.hash ? url.hash : "";
          } catch (error) {
            return "";
          }
        }

        function buildAwardSidebar() {
          var seen = {};
          var items = [];
          Array.prototype.slice.call(document.querySelectorAll("a[href]")).forEach(function (link) {
            var hash = internalHashFromLink(link);
            var text = visibleText(link);
            if (!hash || seen[hash] || !text || text.length < 3 || text.length > 90) return;
            if (!findAnchorTarget(hash)) return;
            seen[hash] = true;
            items.push({ hash: hash, text: text });
          });

          if (!items.length) return;

          var sidebar = document.createElement("aside");
          sidebar.className = "award-assistant-sidebar";
          sidebar.setAttribute("aria-label", "Award contents");
          sidebar.innerHTML = '<strong>Contents</strong>';

          items.slice(0, 120).forEach(function (item) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = item.text;
            button.addEventListener("click", function () {
              scrollToAnchor(item.hash);
            });
            sidebar.appendChild(button);
          });

          document.body.classList.add("award-assistant-has-sidebar");
          document.body.appendChild(sidebar);
        }

        function handleAwardLinks() {
          document.addEventListener("click", function (event) {
            var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
            if (!link) return;

            var rawHref = link.getAttribute("href") || "";
            if (!rawHref || rawHref.indexOf("javascript:") === 0 || rawHref.indexOf("mailto:") === 0) {
              return;
            }

            if (rawHref.charAt(0) === "#") {
              event.preventDefault();
              scrollToAnchor(rawHref);
              return;
            }

            var url;
            try {
              url = new URL(rawHref, officialOrigin + "/" + awardCode + ".html");
            } catch (error) {
              return;
            }

            var isSameAward = url.hostname === "awards.fairwork.gov.au" && url.pathname.toLowerCase().endsWith("/" + awardCode.toLowerCase() + ".html");
            if (isSameAward && url.hash) {
              event.preventDefault();
              scrollToAnchor(url.hash);
              return;
            }

            event.preventDefault();
            window.open(url.href, "_blank", "noopener,noreferrer");
          });
        }

        function scoreCandidate(element, query, topic) {
          var text = visibleText(element);
          if (!text || text.length > 260) return 0;
          if (isMostlyLinkText(element, text) || inLinkHeavyContainer(element)) return 0;
          var normalised = normalise(text);
          var groups = topicTerms[normalise(topic)] || [normalise(query).split(" ").filter(Boolean)];
          var best = 0;

          groups.forEach(function (terms) {
            if (terms.length && terms.every(function (term) { return normalised.indexOf(term) !== -1; })) {
              best = Math.max(best, terms.length * 10);
            }
          });

          if (!best) return 0;
          if (/^(\\d+[A-Z]?(?:\\.\\d+)?|Schedule\\s+[A-Z])\\.?\\s+/i.test(text)) best += 12;
          if (/^(H[1-6]|B|STRONG)$/i.test(element.tagName)) best += 6;
          if (hasBodyTextAfter(element)) best += 10;
          return best - Math.min(text.length / 200, 1);
        }

        function findScheduleAClassificationTarget() {
          var candidates = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,b,strong"));
          return candidates
            .map(function (element, index) {
              var text = visibleText(element);
              var normalised = normalise(text);
              if (!text || text.length > 260 || isMostlyLinkText(element, text) || inLinkHeavyContainer(element)) {
                return { element: element, index: index, score: 0 };
              }

              var following = nextBodyText(element);
              var hasScheduleA = /(^|\\s)schedule\\s+a(\\s|$)/.test(normalised);
              var mentionsClassifications = normalised.indexOf("classification") !== -1 || following.indexOf("classification") !== -1;
              var score = hasScheduleA && mentionsClassifications ? 80 : 0;
              if (hasBodyTextAfter(element)) score += 10;
              return { element: element, index: index, score: score };
            })
            .filter(function (item) { return item.score > 0; })
            .sort(function (a, b) { return b.score - a.score || a.index - b.index; })[0];
        }

        function jumpToAwardTopic(payload) {
          var query = payload.query || payload.topic || "";
          var topic = payload.topic || query;
          var candidates = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,b,strong"));
          var best = normalise(topic) === "classifications" ? findScheduleAClassificationTarget() : null;

          best = best || candidates
            .map(function (element, index) {
              return { element: element, index: index, score: scoreCandidate(element, query, topic) };
            })
            .filter(function (item) { return item.score > 0; })
            .sort(function (a, b) { return b.score - a.score || a.index - b.index; })[0];

          Array.prototype.forEach.call(document.querySelectorAll(".award-assistant-highlight"), function (element) {
            element.classList.remove("award-assistant-highlight");
          });

          if (!best) {
            window.parent.postMessage({ type: "award-jump-result", found: false, topic: topic }, "*");
            return;
          }

          best.element.classList.add("award-assistant-highlight");
          best.element.scrollIntoView({ behavior: "smooth", block: "center" });
          window.parent.postMessage({
            type: "award-jump-result",
            found: true,
            topic: topic,
            text: visibleText(best.element).slice(0, 180)
          }, "*");
        }

        window.addEventListener("message", function (event) {
          if (event.data && event.data.type === "award-jump") {
            jumpToAwardTopic(event.data);
          }
        });

        handleAwardLinks();
        buildAwardSidebar();
      })();
    </script>
  `;
}

function makeEmbeddableAwardHtml(html, code) {
  const viewerCss = `
    <style>
      html { scroll-behavior: smooth; }
      body { padding: 18px; }
      a[target="_blank"]::after { content: ""; }
      body.award-assistant-has-sidebar { padding-left: 286px !important; }
      .award-assistant-sidebar {
        position: fixed;
        z-index: 2147483647;
        top: 0;
        left: 0;
        bottom: 0;
        width: 250px;
        overflow-y: auto;
        padding: 14px 12px;
        border-right: 1px solid #dbe3e8;
        background: #f7fafb;
        box-shadow: 8px 0 18px rgba(29, 38, 48, 0.08);
        font-family: Arial, Helvetica, sans-serif;
      }
      .award-assistant-sidebar strong {
        display: block;
        margin: 0 0 10px;
        color: #62717f;
        font-size: 12px;
        text-transform: uppercase;
      }
      .award-assistant-sidebar button {
        display: block;
        width: 100%;
        margin: 0 0 4px;
        padding: 7px 8px;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: #1d2630;
        font: inherit;
        font-size: 13px;
        line-height: 1.25;
        text-align: left;
        cursor: pointer;
      }
      .award-assistant-sidebar button:hover,
      .award-assistant-sidebar button:focus {
        outline: none;
        background: #e8f0f4;
      }
      .award-assistant-highlight {
        background: #fff0a6 !important;
        box-shadow: 0 0 0 4px rgba(255, 240, 166, 0.85) !important;
        border-radius: 4px !important;
      }
      @media (max-width: 780px) {
        body.award-assistant-has-sidebar { padding-left: 18px !important; padding-top: 210px !important; }
        .award-assistant-sidebar {
          right: 0;
          bottom: auto;
          width: auto;
          max-height: 180px;
          border-right: 0;
          border-bottom: 1px solid #dbe3e8;
        }
      }
    </style>
  `;
  const base = `<base href="https://awards.fairwork.gov.au/" target="_blank">`;
  const safeHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");
  const withHead = safeHtml.includes("</head>")
    ? safeHtml.replace("</head>", `${base}${viewerCss}</head>`)
    : `${base}${viewerCss}${safeHtml}`;

  const script = awardViewerScript(code);
  return withHead.includes("</body>")
    ? withHead.replace("</body>", `${script}</body>`)
    : `${withHead}${script}`;
}

async function serveAwardHtml(requestUrl, res) {
  const code = (requestUrl.searchParams.get("code") || "").toUpperCase();

  if (!/^MA\d{6}$/.test(code)) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Award code must look like MA000010.</p>");
    return;
  }

  const url = `https://awards.fairwork.gov.au/${code}.html`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      res.writeHead(response.status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<p>The official award source returned ${response.status}.</p>`);
      return;
    }

    const html = await response.text();
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=3600",
      "X-Award-Code": code
    });
    res.end(makeEmbeddableAwardHtml(html, code));
  } catch (error) {
    res.writeHead(502, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<p>The official award source could not be loaded: ${error.message}</p>`);
  }
}

function getQueryTerms(query) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 3);
}

function toSearchLine(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function likelyHeading(line) {
  if (line.length > 170) {
    return false;
  }

  return (
    /^(\d+[A-Z]?(?:\.\d+)?|Schedule\s+[A-Z])\.?\s+/i.test(line) ||
    /^[A-Z][A-Za-z,&()/ -]{2,120}$/.test(line)
  );
}

function topicNeedles(topic, query) {
  const wanted = toSearchLine(topic || query);
  const known = {
    "ordinary hours": [["ordinary", "hours"], ["ordinary", "hours", "work"]],
    overtime: [["overtime"]],
    "penalty rates": [["penalty", "rates"], ["penalties"], ["weekend", "penalty"]],
    "annual leave": [["annual", "leave"]],
    classifications: [["classifications"], ["classification", "structure"], ["classification", "definitions"]]
  };

  return known[wanted] || [getQueryTerms(wanted)];
}

function buildMatch(lines, item, resultIndex) {
  const context = lines.slice(item.index, item.index + 8);
  const heading = item.line;
  return {
    id: `official-match-${resultIndex + 1}`,
    number: heading.match(/^(\d+[A-Z]?(?:\.\d+)?|Schedule\s+[A-Z])/i)?.[1] || `Match ${resultIndex + 1}`,
    title: heading.replace(/^(\d+[A-Z]?(?:\.\d+)?|Schedule\s+[A-Z])\.?\s*/i, "").slice(0, 140),
    body: context.slice(0, 8)
  };
}

function findAwardTextMatches(text, query, topic = "") {
  const terms = getQueryTerms(query);
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 2);

  const headingMatches = lines
    .map((line, index) => ({ line, index, lower: toSearchLine(line) }))
    .filter((item) => likelyHeading(item.line))
    .map((item) => {
      const needles = topicNeedles(topic, query);
      const score = needles.reduce((best, termsForNeedle) => {
        const matched = termsForNeedle.every((term) => item.lower.includes(term));
        return matched ? Math.max(best, termsForNeedle.length + 5) : best;
      }, 0);
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3);

  if (headingMatches.length) {
    return headingMatches.map((item, index) => buildMatch(lines, item, index));
  }

  const scored = lines
    .map((line, index) => {
      const lower = line.toLowerCase();
      const score = terms.reduce((total, term) => total + (lower.includes(term) ? 1 : 0), 0);
      return { line, index, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 5);

  return scored.map((item, resultIndex) => {
    const context = lines.slice(Math.max(0, item.index - 1), item.index + 3);
    const heading = context.find((line) => /^\d+[A-Z]?\./.test(line)) || item.line;
    return {
      id: `official-match-${resultIndex + 1}`,
      number: heading.match(/^(\d+[A-Z]?(?:\.\d+)?)/)?.[1] || `Match ${resultIndex + 1}`,
      title: heading.replace(/^\d+[A-Z]?(?:\.\d+)?\s*/, "").slice(0, 120),
      body: context.slice(0, 4)
    };
  });
}

async function searchAwardText(requestUrl, res) {
  const code = (requestUrl.searchParams.get("code") || "").toUpperCase();
  const query = requestUrl.searchParams.get("q") || "";
  const topic = requestUrl.searchParams.get("topic") || "";

  if (!/^MA\d{6}$/.test(code)) {
    json(res, 400, {
      connected: false,
      message: "Award code must look like MA000010."
    });
    return;
  }

  if (!query.trim()) {
    json(res, 400, {
      connected: false,
      message: "Enter a clause search question."
    });
    return;
  }

  const url = `https://awards.fairwork.gov.au/${code}.html`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      json(res, response.status, {
        connected: false,
        source: url,
        message: `The official award source returned ${response.status}.`
      });
      return;
    }

    const html = await response.text();
    const text = htmlToSearchableText(html);
    const matches = findAwardTextMatches(text, query, topic);

    json(res, 200, {
      connected: true,
      source: url,
      awardCode: code,
      query,
      topic,
      matches
    });
  } catch (error) {
    json(res, 502, {
      connected: false,
      source: url,
      message: "The official award text could not be fetched from this server session.",
      error: error.message
    });
  }
}

async function proxyFwcPayRates(requestUrl, res) {
  const key = process.env.FWC_API_SUBSCRIPTION_KEY;
  const awardCode = requestUrl.searchParams.get("awardCode") || "MA000010";
  const classification = requestUrl.searchParams.get("classification") || "";

  if (!key) {
    if (awardCode.toUpperCase() !== "MA000010") {
      json(res, 200, {
        connected: false,
        source: "Fair Work Commission Modern Awards Pay Database API",
        message:
          "Set FWC_API_SUBSCRIPTION_KEY to call live MAPD pay rates for this award. The no-key demo fallback only includes MA000010 sample rates.",
        awardCode,
        rates: []
      });
      return;
    }

    json(res, 200, {
      connected: false,
      source: "Demo fallback from Manufacturing Award clause 20.1 / Schedule C",
      message:
        "Set FWC_API_SUBSCRIPTION_KEY to call the live Modern Awards Pay Database API. These fallback rates are for the app demo and must be checked against the current award and FWC MAPD extracts.",
      awardCode,
      rates: getSampleRates(classification)
    });
    return;
  }

  const baseUrl = process.env.FWC_API_BASE_URL || "https://api.fwc.gov.au";
  const payRatesPath = getPayRatesPath().replace("{id_or_code}", encodeURIComponent(awardCode));
  const target = buildFwcApiUrl(payRatesPath, baseUrl);
  const allowedQueryParams = new Set([
    "classification_level",
    "classification_fixed_id",
    "employee_rate_type_code",
    "page",
    "limit",
    "operative_from",
    "operative_to",
    "sort"
  ]);

  for (const [name, value] of requestUrl.searchParams.entries()) {
    if (allowedQueryParams.has(name) && value) {
      target.searchParams.set(name, value);
    }
  }
  if (!target.searchParams.has("limit")) {
    target.searchParams.set("limit", "100");
  }

  try {
    const response = await fetch(target, {
      headers: getFwcApiHeaders()
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    json(res, response.ok ? 200 : response.status, {
      connected: response.ok,
      endpoint: target.toString(),
      status: response.status,
      source: "Fair Work Commission Modern Awards Pay Database API",
      data: body
    });
  } catch (error) {
    json(res, 502, {
      connected: false,
      source: "Fair Work Commission Modern Awards Pay Database API",
      message: "The live API request failed. Showing the app fallback rates instead.",
      error: error.message,
      awardCode,
      rates: getSampleRates(classification)
    });
  }
}

async function testFwcApi(res) {
  const key = process.env.FWC_API_SUBSCRIPTION_KEY;
  const awardsPath = process.env.FWC_API_AWARDS_PATH || "/api/v1/awards";
  const target = buildFwcApiUrl(awardsPath);
  target.searchParams.set("limit", "1");

  if (!key) {
    json(res, 200, {
      connected: false,
      message: "FWC_API_SUBSCRIPTION_KEY is not set on this server.",
      expectedHeader: process.env.FWC_API_KEY_HEADER || "Ocp-Apim-Subscription-Key",
      testEndpoint: target.toString()
    });
    return;
  }

  try {
    const response = await fetch(target, {
      headers: getFwcApiHeaders()
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    json(res, response.ok ? 200 : response.status, {
      connected: response.ok,
      status: response.status,
      expectedHeader: process.env.FWC_API_KEY_HEADER || "Ocp-Apim-Subscription-Key",
      testEndpoint: target.toString(),
      sample: Array.isArray(body) ? body.slice(0, 3) : body
    });
  } catch (error) {
    json(res, 502, {
      connected: false,
      expectedHeader: process.env.FWC_API_KEY_HEADER || "Ocp-Apim-Subscription-Key",
      testEndpoint: target.toString(),
      error: error.message
    });
  }
}

async function proxyPayGuide(requestUrl, res) {
  const awardCode = (requestUrl.searchParams.get("awardCode") || "MA000010").toUpperCase();

  if (!/^MA\d{6}$/.test(awardCode)) {
    json(res, 400, {
      connected: false,
      message: "Award code must look like MA000010."
    });
    return;
  }

  const target = new URL("https://calculate.fairwork.gov.au/Download/AwardSummary");
  target.searchParams.set("awardCode", awardCode.toLowerCase());
  target.searchParams.set("fileType", "pdf");

  try {
    const response = await fetch(target, {
      headers: {
        Accept: "application/pdf"
      }
    });

    if (!response.ok) {
      json(res, response.status, {
        connected: false,
        source: target.toString(),
        message: `The Fair Work pay guide returned ${response.status}.`
      });
      return;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": response.headers.get("content-type") || "application/pdf",
      "Content-Disposition": `inline; filename="${awardCode.toLowerCase()}-pay-guide.pdf"`,
      "Cache-Control": "private, max-age=3600"
    });
    res.end(bytes);
  } catch (error) {
    json(res, 502, {
      connected: false,
      source: target.toString(),
      message: "The Fair Work pay guide could not be loaded into the viewer.",
      error: error.message
    });
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(500);
    res.end("Server error");
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      fwcApiConfigured: Boolean(process.env.FWC_API_SUBSCRIPTION_KEY),
      fwcApiBaseUrl: process.env.FWC_API_BASE_URL || "https://api.fwc.gov.au",
      officialSources: {
        awardHtml: "https://awards.fairwork.gov.au/MA000010.html",
        awardPdf: "https://www.fwc.gov.au/documents/modern_awards/pdf/ma000010.pdf",
        mapd: "https://www.fwc.gov.au/work-conditions/awards/modern-awards-pay-database",
        mapdApi: "https://developer.fwc.gov.au/"
      }
    });
    return;
  }

  if (requestUrl.pathname === "/api/pay-rates") {
    await proxyFwcPayRates(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/fwc-test") {
    await testFwcApi(res);
    return;
  }

  if (requestUrl.pathname === "/api/pay-guide") {
    await proxyPayGuide(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/award-html") {
    await serveAwardHtml(requestUrl, res);
    return;
  }

  if (requestUrl.pathname === "/api/award-search") {
    await searchAwardText(requestUrl, res);
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Award Assistant is running at http://localhost:${PORT}`);
});
