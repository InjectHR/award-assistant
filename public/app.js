const officialSources = {
  awardsList: "https://www.fairwork.gov.au/employment-conditions/awards/list-of-awards",
  mapd: "https://www.fwc.gov.au/work-conditions/awards/modern-awards-pay-database",
  mapdApi: "https://developer.fwc.gov.au/",
  nesAnnualLeave: "https://www.fairwork.gov.au/leave/annual-leave"
};

const awardLibrary = (window.awardLibrary || [
  {
    code: "MA000010",
    shortName: "Manufacturing Award",
    title: "Manufacturing and Associated Industries and Occupations Award",
    keywords: ["manufacturing", "associated", "industries", "occupations", "ma000010"]
  }
]).sort((a, b) => a.title.localeCompare(b.title));

const manufacturingAward = awardLibrary.find((award) => award.code === "MA000010") || awardLibrary[0];

const payRateRows = [
  ["C14 / V1", 922.7, 24.28],
  ["C13 / V2", 948.0, 24.95],
  ["C12 / V3", 982.4, 25.85],
  ["C11 / V4", 1014.7, 26.7],
  ["C10 / V5", 1068.4, 28.12],
  ["C9 / V6", 1102.0, 29.0],
  ["C8 / V7", 1135.5, 29.88],
  ["C7", 1165.7, 30.68],
  ["V8", 1168.9, 30.76],
  ["C6 / V9", 1224.9, 32.23],
  ["C5 / V10", 1250.1, 32.9],
  ["C4 / V11", 1283.5, 33.78],
  ["C3 / V12", 1350.8, 35.55],
  ["C2(a) / V13", 1384.4, 36.43],
  ["C2(b) / V14", 1445.1, 38.03],
  ["D1", 1027.8, 27.05],
  ["D2", 1040.2, 27.37],
  ["D3", 1052.6, 27.7],
  ["D4", 1067.3, 28.09]
].map(([classification, weekly, hourly]) => ({ classification, weekly, hourly }));

const clauses = [
  {
    id: "clause-3",
    number: "3",
    title: "The National Employment Standards and this award",
    tags: ["nes", "minimum", "standards", "disclaimer"],
    source: "Manufacturing Award MA000010, clause 3",
    body: [
      "The NES and this award contain the minimum conditions of employment for employees covered by the award.",
      "Where the award refers to a condition of employment provided for in the NES, the NES definition applies.",
      "Employers must ensure copies of the award and NES are available to employees, either on a notice board or through accessible electronic means."
    ],
    related: ["clause-34"]
  },
  {
    id: "clause-4",
    number: "4",
    title: "Coverage",
    tags: ["coverage", "manufacturing", "industry", "scope"],
    source: "Manufacturing Award MA000010, clauses 4 and 4.8",
    body: [
      "The award covers employers throughout Australia of employees in Manufacturing and Associated Industries and Occupations who are covered by the classifications in the award.",
      "The Fair Work summary lists manufacturing examples including metal work, products associated with metal, rubber and plastic, cable making, vehicle manufacturing, and associated industries.",
      "Coverage still needs a factual check against the employer activity, the employee's work, any more specific award, and any enterprise agreement."
    ],
    related: ["clause-20", "schedule-a"]
  },
  {
    id: "clause-20",
    number: "20",
    title: "Minimum rates and classifications",
    tags: ["pay", "rates", "classification", "minimum rates", "wages"],
    source: "Manufacturing Award MA000010, clause 20.1 and 20.5",
    body: [
      "Adult employees are paid not less than the rate assigned to the appropriate classification level.",
      "Clause 20.1 sets adult weekly and hourly minimum rates. It also notes employees may be entitled to allowances, loadings or penalties elsewhere in the award.",
      "Clause 20.5 points classification work to Schedule A for general manufacturing and Schedule B for vehicle manufacturing employees, with competency standards or indicative tasks used where relevant."
    ],
    related: ["schedule-a"]
  },
  {
    id: "clause-34",
    number: "34",
    title: "Annual leave",
    tags: ["annual leave", "leave", "holiday", "loading", "shutdown", "cash out", "shiftworker"],
    source: "Manufacturing Award MA000010, clause 34",
    body: [
      "Annual leave is provided for in the NES. Except for clause 48, annual leave does not apply to casual employees.",
      "For the extra NES week, a shiftworker is a 7 day shiftworker who is regularly rostered to work on Sundays and public holidays.",
      "Before annual leave, an employee under this award must be paid the wages they would have received for ordinary hours had they not been on leave during the relevant period.",
      "The annual leave payment includes all-purpose allowances, first aid allowance, and other wages payable under the employee's contract including over-award payments, but not overtime, shift loading, weekend penalty rates, special rates, or expense reimbursements, subject to annual leave loading.",
      "Annual leave loading is 17.5% of the clause 34.3 wages or the relevant weekend penalty/shift loading, whichever is greater, but not both.",
      "The award includes rules for EFT payment, temporary shutdown directions, leave on termination, excessive leave accruals, annual leave in advance, and cashing out annual leave."
    ],
    related: ["clause-3", "clause-20"]
  },
  {
    id: "schedule-a",
    number: "Schedule A",
    title: "Classification structure and definitions",
    tags: ["classifications", "schedule a", "duties", "trade", "technical", "engineering"],
    source: "Manufacturing Award MA000010, Schedule A",
    body: [
      "The award recognises vocational fields including trade, technical, engineering/manufacturing, supervisor/trainer/coordinator, and professional.",
      "General manufacturing levels include induction and production levels through C14, C13, C12 and C11, trade and systems levels at C10/V5, and higher trade, technical, supervisor and professional levels above that.",
      "A classification check should match the actual duties, training, qualifications, supervision, competency standards, and vehicle manufacturing carve-outs before selecting a pay rate."
    ],
    related: ["clause-20", "clause-4"]
  }
];

const state = {
  selectedAward: manufacturingAward,
  selectedClauseId: "clause-34",
  dynamicClauses: [],
  isLoadingAwardText: false,
  hideIndustryAwards: false,
  lastSearchTerm: "annual leave",
  currentView: "clauses"
};

const awardSearch = document.querySelector("#awardSearch");
const awardResults = document.querySelector("#awardResults");
const industryFilterButton = document.querySelector("#industryFilterButton");
const clauseView = document.querySelector("#clauseView");
const officialView = document.querySelector("#officialView");
const ratesView = document.querySelector("#ratesView");
const payGuideView = document.querySelector("#payGuideView");
const tabs = document.querySelectorAll(".tab");
const questionInput = document.querySelector("#questionInput");
const askButton = document.querySelector("#askButton");
const answerTitle = document.querySelector("#answerTitle");
const answerBody = document.querySelector("#answerBody");
const toast = document.querySelector("#toast");
const classificationSelect = document.querySelector("#classificationSelect");
const rateLookupButton = document.querySelector("#rateLookupButton");
const payRateOutput = document.querySelector("#payRateOutput");
const currentAwardCode = document.querySelector("#currentAwardCode");
const currentAwardStatus = document.querySelector("#currentAwardStatus");
const currentAwardUse = document.querySelector("#currentAwardUse");
const officialAwardLink = document.querySelector("#officialAwardLink");
const payGuidePdfLink = document.querySelector("#payGuidePdfLink");
const payGuideDocxLink = document.querySelector("#payGuideDocxLink");
const awardHtmlFrame = document.querySelector("#awardHtmlFrame");
const payGuideFrame = document.querySelector("#payGuideFrame");

function awardHtmlUrl(award = state.selectedAward) {
  return `https://awards.fairwork.gov.au/${award.code}.html`;
}

function awardPdfUrl(award = state.selectedAward) {
  return `https://www.fwc.gov.au/documents/modern_awards/pdf/${award.code.toLowerCase()}.pdf`;
}

function payGuideUrl(fileType, award = state.selectedAward) {
  const params = new URLSearchParams({
    awardCode: award.code.toLowerCase(),
    fileType
  });
  return `https://calculate.fairwork.gov.au/Download/AwardSummary?${params.toString()}`;
}

function payGuideViewerUrl(award = state.selectedAward) {
  return `/api/pay-guide?awardCode=${encodeURIComponent(award.code)}`;
}

function awardHtmlViewerUrl(award = state.selectedAward) {
  return `/api/award-html?code=${encodeURIComponent(award.code)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD"
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function renderAwardMeta() {
  const award = state.selectedAward;
  currentAwardCode.textContent = award.code;
  currentAwardStatus.textContent =
    award.code === "MA000010" ? "Curated clauses + official source" : "Official source searchable";
  currentAwardUse.textContent = "HR clause lookup";
  officialAwardLink.href = awardHtmlUrl(award);
  officialAwardLink.textContent = `${award.code} official award`;
  payGuidePdfLink.href = payGuideUrl("pdf", award);
  payGuidePdfLink.textContent = `${award.code} pay guide PDF`;
  payGuideDocxLink.href = payGuideUrl("docx", award);
  payGuideDocxLink.textContent = `${award.code} pay guide DOCX`;
  awardHtmlFrame.src = awardHtmlViewerUrl(award);
  payGuideFrame.src = payGuideViewerUrl(award);
  document.querySelector("#viewerTitle").textContent = award.title;
}

function activeClauses() {
  return state.selectedAward.code === "MA000010" ? clauses : state.dynamicClauses;
}

function renderAwardResults() {
  const query = awardSearch.value.trim().toLowerCase();
  const terms = query.split(/[^a-z0-9]+/).filter(Boolean);
  const matches = awardLibrary
    .filter((award) => !state.hideIndustryAwards || !/\bindustry\b/i.test(award.title))
    .filter((award) => {
      const haystack = [award.code, award.shortName, award.title, ...award.keywords]
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query) || terms.every((term) => haystack.includes(term));
    });

  awardResults.innerHTML = matches
    .map(
      (award) => `
        <button class="award-result" type="button" data-award="${escapeHtml(award.code)}">
          <strong>${escapeHtml(award.shortName)}</strong>
          <span>${escapeHtml(award.title)} (${escapeHtml(award.code)})</span>
        </button>
      `
    )
    .join("");

  if (!matches.length) {
    awardResults.innerHTML = `<p class="source-note">No award match in the local A-Z catalogue. Check the official Fair Work list.</p>`;
  }
}

function toggleIndustryFilter() {
  state.hideIndustryAwards = !state.hideIndustryAwards;
  industryFilterButton.setAttribute("aria-pressed", String(state.hideIndustryAwards));
  industryFilterButton.textContent = state.hideIndustryAwards
    ? "View all awards"
    : "View occupational awards only";
  renderAwardResults();
}

function highlightText(text, term) {
  const safeText = escapeHtml(text);
  const trimmed = term.trim();
  if (!trimmed) {
    return safeText;
  }

  const words = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3);
  if (!words.length) {
    return safeText;
  }

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  return safeText.replace(pattern, "<mark>$1</mark>");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderClauses() {
  const list = activeClauses();

  if (state.isLoadingAwardText) {
    clauseView.innerHTML = `
      <article class="clause-card is-highlighted">
        <h3>Searching ${escapeHtml(state.selectedAward.title)}</h3>
        <p>Fetching the official award text and looking for "${escapeHtml(state.lastSearchTerm)}".</p>
      </article>
    `;
    return;
  }

  if (!list.length) {
    clauseView.innerHTML = `
      <article class="clause-card is-highlighted">
        <h3>${escapeHtml(state.selectedAward.title)}</h3>
        <p>This award is selected from the Fair Work A-Z catalogue. Ask a clause question to search the official award text, or open the official page tab.</p>
        <p class="source-note">
          Source:
          <a href="${awardHtmlUrl()}" target="_blank" rel="noreferrer">official award HTML</a>
          and <a href="${awardPdfUrl()}" target="_blank" rel="noreferrer">FWC PDF</a>
        </p>
      </article>
    `;
    return;
  }

  clauseView.innerHTML = list
    .map((clause) => {
      const highlighted = clause.id === state.selectedClauseId ? " is-highlighted" : "";
      return `
        <article id="${clause.id}" class="clause-card${highlighted}" data-clause-id="${clause.id}">
          <h3>${escapeHtml(clause.number)}. ${escapeHtml(clause.title)}</h3>
          <p class="source-note">${escapeHtml(clause.source)}</p>
          ${clause.body.map((paragraph) => `<p>${highlightText(paragraph, state.lastSearchTerm)}</p>`).join("")}
          <p class="source-note">
            Source:
            <a href="${awardHtmlUrl()}" target="_blank" rel="noreferrer">official award HTML</a>
            and <a href="${awardPdfUrl()}" target="_blank" rel="noreferrer">FWC PDF</a>
          </p>
        </article>
      `;
    })
    .join("");
}

function renderClassificationOptions() {
  if (state.selectedAward.code !== "MA000010") {
    classificationSelect.innerHTML = `<option value="">Live MAPD lookup for selected award</option>`;
    classificationSelect.value = "";
    return;
  }

  classificationSelect.innerHTML = payRateRows
    .map((rate) => `<option value="${escapeHtml(rate.classification)}">${escapeHtml(rate.classification)}</option>`)
    .join("");
  classificationSelect.value = "C10 / V5";
}

function renderPayRatePlaceholder() {
  payRateOutput.dataset.awardCode = state.selectedAward.code;
  payRateOutput.innerHTML = `
    <p class="api-note">
      Ready to check rates for <strong>${escapeHtml(state.selectedAward.code)}</strong>.
      Use the button above to query the FWC Modern Awards Pay Database for the selected award.
    </p>
  `;
}

function setView(view) {
  state.currentView = view;
  clauseView.hidden = view !== "clauses";
  officialView.hidden = view !== "official";
  ratesView.hidden = view !== "rates";
  payGuideView.hidden = view !== "payGuide";

  if (view === "rates" && payRateOutput.dataset.awardCode !== state.selectedAward.code) {
    renderPayRatePlaceholder();
  }

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  });
}

function scoreClause(clause, query) {
  const words = query.toLowerCase().split(/\W+/).filter(Boolean);
  const haystack = [clause.title, clause.number, clause.tags.join(" "), clause.body.join(" ")]
    .join(" ")
    .toLowerCase();
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function findBestClause(query) {
  const list = activeClauses();
  if (/annual|leave|holiday|loading|shutdown|cash/i.test(query)) {
    return list.find((clause) => clause.id === "clause-34") || list[0];
  }

  if (/classification|classify|duties|schedule|trade|technical/i.test(query)) {
    return list.find((clause) => clause.id === "schedule-a") || list[0];
  }

  if (/pay|rate|wage|minimum|allowance|penalt/i.test(query)) {
    return list.find((clause) => clause.id === "clause-20") || list[0];
  }

  if (/coverage|covered|industry|employer/i.test(query)) {
    return list.find((clause) => clause.id === "clause-4") || list[0];
  }

  return list
    .map((clause) => ({ clause, score: scoreClause(clause, query) }))
    .sort((a, b) => b.score - a.score)[0].clause;
}

function selectClause(clauseId, term = "") {
  state.selectedClauseId = clauseId;
  state.lastSearchTerm = term;
  renderClauses();
  setView("clauses");
  requestAnimationFrame(() => {
    document.querySelector(`#${clauseId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function selectedClause() {
  return activeClauses().find((clause) => clause.id === state.selectedClauseId) || activeClauses()[0] || clauses[0];
}

async function askAward() {
  const query = questionInput.value.trim() || "annual leave clause";
  if (state.selectedAward.code !== "MA000010") {
    if (/compare|nes/i.test(query)) {
      compareWithNes();
      return;
    }
    if (/classif/i.test(query)) {
      checkClassifications();
      return;
    }
    if (/pay|rate|wage/i.test(query)) {
      checkPayRates();
      return;
    }
    await searchOfficialAwardText(query);
    return;
  }

  const clause = findBestClause(query);
  selectClause(clause.id, query);
  if (/compare|nes/i.test(query)) {
    compareWithNes();
    return;
  }
  if (/classif/i.test(query)) {
    checkClassifications();
    return;
  }
  if (/pay|rate|wage/i.test(query)) {
    checkPayRates();
    return;
  }
  summariseClause(clause);
}

async function searchOfficialAwardText(query, topic = "") {
  state.isLoadingAwardText = true;
  state.lastSearchTerm = query;
  renderClauses();
  setView("clauses");
  answerTitle.textContent = "Searching official award";
  answerBody.innerHTML = `<p>Searching ${escapeHtml(state.selectedAward.title)} for "${escapeHtml(query)}".</p>`;

  try {
    const params = new URLSearchParams({
      code: state.selectedAward.code,
      q: query,
      topic
    });
    const response = await fetch(`/api/award-search?${params.toString()}`);
    const payload = await response.json();
    const matches = Array.isArray(payload.matches) ? payload.matches : [];
    state.dynamicClauses = matches.map((match, index) => ({
      id: match.id || `official-match-${index + 1}`,
      number: match.number || `Match ${index + 1}`,
      title: match.title || "Official award text match",
      tags: [query],
      source: `${state.selectedAward.code} official award text`,
      body: Array.isArray(match.body) ? match.body : []
    }));
    state.selectedClauseId = state.dynamicClauses[0]?.id || "";
    state.isLoadingAwardText = false;
    renderClauses();

    if (state.selectedClauseId) {
      requestAnimationFrame(() => {
        document.querySelector(`#${state.selectedClauseId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (!matches.length) {
      answerTitle.textContent = "No text match";
      answerBody.innerHTML = `
        <p>I could not find a clear official-text match for "${escapeHtml(query)}" in ${escapeHtml(state.selectedAward.title)} from this session.</p>
        <p>Open the official page tab and check the award directly before relying on the result.</p>
      `;
      return;
    }

    summariseClause(state.dynamicClauses[0]);
  } catch (error) {
    state.dynamicClauses = [];
    state.isLoadingAwardText = false;
    renderClauses();
    answerTitle.textContent = "Official search unavailable";
    answerBody.innerHTML = `
      <p>The app could not fetch the official award text in this session: ${escapeHtml(error.message)}.</p>
      <p>Use the official page tab for ${escapeHtml(state.selectedAward.code)}, or run the server somewhere with access to awards.fairwork.gov.au.</p>
    `;
  }
}

function summariseClause(clause = selectedClause()) {
  answerTitle.textContent = `${clause.number}. ${clause.title}`;
  if (clause.id === "clause-34") {
    answerBody.innerHTML = `
      <p><strong>Short answer:</strong> clause 34 points annual leave back to the NES, then adds award-specific rules about payment, leave loading, shutdowns, excessive accruals, leave in advance and cashing out.</p>
      <ul>
        <li>Annual leave generally does not apply to casual employees.</li>
        <li>A shiftworker gets the extra NES week if they are a 7 day shiftworker regularly rostered Sundays and public holidays.</li>
        <li>Payment is based on ordinary hours the employee would have worked, with specified allowances and over-award amounts included.</li>
        <li>Annual leave loading is 17.5% or the relevant penalty/shift loading, whichever is greater, but not both.</li>
      </ul>
    `;
    return;
  }

  answerBody.innerHTML = `
    <p><strong>Matched clause:</strong> ${escapeHtml(clause.source)}.</p>
    <ul>${clause.body.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

async function compareWithNes() {
  if (state.selectedAward.code === "MA000010") {
    selectClause("clause-34", "annual leave NES");
  } else {
    state.dynamicClauses = [
      {
        id: "nes-compare",
        number: "NES",
        title: "Compare selected award with the National Employment Standards",
        tags: ["nes", "annual leave"],
        source: `${state.selectedAward.code} official award source and Fair Work NES guide`,
        body: [
          "The NES sets minimum entitlements including annual leave, personal/carer's leave, public holidays and notice of termination.",
          "The selected award can add detail about how those entitlements are paid, taken, loaded, rostered or administered.",
          "Ask a specific entitlement such as 'annual leave clause' to fetch matching text from the official award page."
        ]
      }
    ];
    selectClause("nes-compare", "NES award comparison");
  }

  answerTitle.textContent = "Compare with NES";
  answerBody.innerHTML = `
    <p><strong>NES baseline:</strong> full-time and part-time employees get 4 weeks paid annual leave based on ordinary hours, with an extra week for certain shiftworkers. Casuals do not get paid annual leave.</p>
    <p><strong>Award overlay:</strong> check ${escapeHtml(state.selectedAward.code)} for award-specific rules about payment, leave loading, shutdowns, excessive accruals, leave in advance, cashing out, rostering and related conditions.</p>
    <p><strong>Practical read:</strong> use the NES for the minimum entitlement and the award for the payment/loading mechanics and taking-leave rules.</p>
    <p class="source-note">Source: <a href="${officialSources.nesAnnualLeave}" target="_blank" rel="noreferrer">Fair Work Ombudsman annual leave</a> and <a href="${awardHtmlUrl()}" target="_blank" rel="noreferrer">${escapeHtml(state.selectedAward.code)} official award</a>.</p>
  `;
}

function checkClassifications() {
  if (state.selectedAward.code === "MA000010") {
    selectClause("schedule-a", "classification duties");
  } else {
    state.dynamicClauses = [
      {
        id: "classification-check",
        number: "Classification",
        title: `Classification check for ${state.selectedAward.title}`,
        tags: ["classification", "duties", "coverage"],
        source: `${state.selectedAward.code} official award source`,
        body: [
          "Start with coverage: confirm the employer, industry and employee role are within the selected award.",
          "Then find the classification schedule or classification definitions in the official award.",
          "Match actual duties, training, qualifications, responsibility and supervision before checking the pay rate."
        ]
      }
    ];
    selectClause("classification-check", "classification duties");
  }

  answerTitle.textContent = "Classification check";
  answerBody.innerHTML = `
    <p>Use this as a structured HR checklist before looking up a rate:</p>
    <ol>
      <li>Confirm the employer and role are covered by ${escapeHtml(state.selectedAward.code)} and no more specific award applies.</li>
      <li>Identify employment type: full-time, part-time, casual, apprentice, trainee or supported wage.</li>
      <li>Find the classification schedule or classification definitions in the official award.</li>
      <li>Match actual duties, qualifications, competency standards and supervision level.</li>
      <li>Use the FWC MAPD data to check the minimum rate, then separately check allowances, penalties and overtime.</li>
    </ol>
  `;
}

async function checkPayRates() {
  if (state.selectedAward.code === "MA000010") {
    selectClause("clause-20", "minimum pay rates");
  }
  setView("rates");
  const classification = state.selectedAward.code === "MA000010" ? classificationSelect.value || "C10 / V5" : "";
  payRateOutput.dataset.awardCode = state.selectedAward.code;
  payRateOutput.innerHTML = `<p class="api-note">Checking rates for ${escapeHtml(state.selectedAward.code)}${classification ? ` / ${escapeHtml(classification)}` : ""}...</p>`;

  try {
    const params = new URLSearchParams({
      awardCode: state.selectedAward.code,
      classification
    });
    const response = await fetch(`/api/pay-rates?${params.toString()}`);
    const payload = await response.json();
    const rates = Array.isArray(payload.rates) ? payload.rates : normaliseApiRates(payload.data);
    renderRates(payload, rates);
  } catch (error) {
    payRateOutput.innerHTML = `
      <p class="api-note">The pay-rate check failed in this browser session: ${escapeHtml(error.message)}.</p>
      ${rateTable(payRateRows.filter((rate) => rate.classification === classification))}
    `;
  }
}

function normaliseApiRates(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  if (data && Array.isArray(data.data)) {
    return data.data;
  }

  if (data && Array.isArray(data.rates)) {
    return data.rates;
  }

  return [];
}

function renderRates(payload, rates) {
  const hasManufacturingDemoRates = !payload.connected && state.selectedAward.code === "MA000010";
  const connectedLabel = payload.connected
    ? "Live FWC API response"
    : hasManufacturingDemoRates
      ? "Manufacturing demo fallback"
      : "Live MAPD not configured";
  const note = payload.message || payload.source || connectedLabel;
  const rows = rates.length ? rates : state.selectedAward.code === "MA000010" ? payRateRows : [];

  payRateOutput.innerHTML = `
    <p class="api-note"><strong>${escapeHtml(connectedLabel)} for ${escapeHtml(state.selectedAward.code)}.</strong> ${escapeHtml(note)}</p>
    ${rateTable(rows)}
    <p class="source-note">Always reconcile against the current award and the <a href="${officialSources.mapd}" target="_blank" rel="noreferrer">FWC Modern Awards Pay Database</a>.</p>
  `;
  payRateOutput.dataset.awardCode = state.selectedAward.code;

  answerTitle.textContent = "Pay rates";
  answerBody.innerHTML = `
    <p>The app has a real server-side hook for the FWC MAPD API and sends the selected award code (${escapeHtml(state.selectedAward.code)}). Without a subscription key it only shows sample values for MA000010.</p>
    <p>For production, keep the FWC API key on the server and use the response together with the award text, because MAPD rates do not decide coverage, classification or every entitlement.</p>
  `;
}

function rateTable(rates) {
  if (!rates.length) {
    return `<p>No rates returned for this filter.</p>`;
  }

  const isMapdResponse = rates.some((rate) => "base_rate" in rate || "calculated_rate" in rate);

  return `
    <table class="rate-table">
      <thead>
        <tr>
          <th>Classification</th>
          <th>${isMapdResponse ? "Base rate" : "Weekly"}</th>
          <th>${isMapdResponse ? "Calculated rate" : "Hourly"}</th>
        </tr>
      </thead>
      <tbody>
        ${rates
          .map((rate) => {
            const classification =
              rate.classification ||
              rate.parent_classification_name ||
              rate.classificationLevel ||
              rate.name ||
              "Returned rate";
            const baseRate = rate.base_rate ?? rate.weekly ?? rate.minimumWeeklyRate ?? rate.weekly_rate;
            const calculatedRate =
              rate.calculated_rate ?? rate.hourly ?? rate.minimumHourlyRate ?? rate.hourly_rate;
            const baseLabel = rate.base_rate_type || "";
            const calculatedLabel = rate.calculated_rate_type || "";
            return `
              <tr>
                <td>${escapeHtml(classification)}</td>
                <td>${baseRate === undefined || baseRate === null ? "Check API response" : `${money(baseRate)} ${escapeHtml(baseLabel)}`}</td>
                <td>${calculatedRate === undefined || calculatedRate === null ? "Check API response" : `${money(calculatedRate)} ${escapeHtml(calculatedLabel)}`}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

async function copyClause() {
  const clause = selectedClause();
  const text = `${clause.number}. ${clause.title}\n\n${clause.body.join("\n\n")}\n\nSource: ${clause.source} - ${awardHtmlUrl()}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Clause copied");
  } catch {
    showToast("Clipboard unavailable in this browser");
  }
}

function handleAction(action) {
  if (action === "copy-clause") {
    copyClause();
  }
  if (action === "summarise-clause") {
    summariseClause();
  }
  if (action === "compare-nes") {
    compareWithNes();
  }
  if (action === "check-classifications") {
    checkClassifications();
  }
  if (action === "check-pay-rates") {
    checkPayRates();
  }
  if (action === "view-pay-guide") {
    setView("payGuide");
  }
}

function selectAward(code) {
  const award = awardLibrary.find((item) => item.code === code);
  if (!award) {
    showToast("Award not found in the A-Z catalogue");
    return;
  }

  state.selectedAward = award;
  state.dynamicClauses = [];
  state.isLoadingAwardText = false;
  state.selectedClauseId = award.code === "MA000010" ? "clause-34" : "";
  state.lastSearchTerm = award.code === "MA000010" ? "annual leave clause" : "";

  renderAwardMeta();
  renderClassificationOptions();
  renderPayRatePlaceholder();
  renderAwardResults();
  renderClauses();
  setView("official");

  if (award.code === "MA000010") {
    summariseClause(clauses.find((clause) => clause.id === "clause-34"));
  } else {
    answerTitle.textContent = "Award selected";
    answerBody.innerHTML = `
      <p>${escapeHtml(award.title)} is selected from the Fair Work A-Z awards catalogue.</p>
      <p>The full official award is loading in the embedded viewer. Use the contents sidebar inside the viewer to move through the award.</p>
    `;
  }

  showToast(`${award.code} opened`);
}

function boot() {
  renderAwardMeta();
  renderAwardResults();
  renderClassificationOptions();
  renderPayRatePlaceholder();
  renderClauses();
  summariseClause(clauses.find((clause) => clause.id === "clause-34"));
  requestAnimationFrame(() => selectClause("clause-34", "annual leave clause"));

  awardSearch.addEventListener("input", renderAwardResults);
  industryFilterButton.addEventListener("click", toggleIndustryFilter);

  awardResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-award]");
    if (!button) {
      return;
    }
    selectAward(button.dataset.award);
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
  });

  askButton.addEventListener("click", askAward);
  questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      askAward();
    }
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }
    handleAction(actionButton.dataset.action);
  });

  rateLookupButton.addEventListener("click", checkPayRates);
}

boot();
