let awards = [];
let selectedAward = null;

const awardSearch = document.querySelector("#awardSearch");
const awardResults = document.querySelector("#awardResults");
const viewerTitle = document.querySelector("#viewerTitle");
const questionInput = document.querySelector("#questionInput");
const askButton = document.querySelector("#askButton");
const answerBody = document.querySelector("#answerBody");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadAwards() {
  awardResults.innerHTML = `<p class="note">Loading official A-Z awards list...</p>`;

  try {
    const response = await fetch("/api/awards");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load awards");
    }

    awards = data.awards || [];
    renderAwards();
  } catch (error) {
    awardResults.innerHTML = `
      <p class="error">Could not load the official awards list: ${escapeHtml(error.message)}</p>
    `;
  }
}

function renderAwards() {
  const query = awardSearch.value.toLowerCase().trim();

  const filtered = awards.filter((award) => {
    const haystack = `${award.code} ${award.title}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  awardResults.innerHTML = filtered.map((award) => `
    <button class="award-button" type="button" data-code="${escapeHtml(award.code)}">
      <strong>${escapeHtml(award.title)}</strong>
      <span>${escapeHtml(award.code)}</span>
    </button>
  `).join("");

  if (!filtered.length) {
    awardResults.innerHTML = `<p class="note">No award found. Try another keyword.</p>`;
  }
}

function selectAward(code) {
  selectedAward = awards.find((award) => award.code === code);

  if (!selectedAward) return;

  viewerTitle.textContent = selectedAward.title;

  answerBody.innerHTML = `
    <p><strong>${escapeHtml(selectedAward.title)}</strong> selected.</p>
    <p>Ask a question such as <em>annual leave</em>, <em>classification</em>, <em>overtime</em>, <em>casual loading</em>, or <em>penalty rates</em>.</p>
    <p>
      <a href="https://awards.fairwork.gov.au/${escapeHtml(selectedAward.code)}.html" target="_blank" rel="noreferrer">
        Open official award
      </a>
    </p>
  `;
}

async function searchAward() {
  if (!selectedAward) {
    answerBody.innerHTML = `<p class="error">Select an award first.</p>`;
    return;
  }

  const query = questionInput.value.trim();

  if (!query) {
    answerBody.innerHTML = `<p class="error">Type a search question first.</p>`;
    return;
  }

  answerBody.innerHTML = `<p>Searching ${escapeHtml(selectedAward.title)} for “${escapeHtml(query)}”...</p>`;

  try {
    const response = await fetch(
      `/api/award-search?code=${encodeURIComponent(selectedAward.code)}&q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed");
    }

    if (!data.matches || !data.matches.length) {
      answerBody.innerHTML = `
        <p>No clear match found for “${escapeHtml(query)}”.</p>
        <p>
          <a href="${escapeHtml(data.source)}" target="_blank" rel="noreferrer">
            Open the official award and search manually
          </a>
        </p>
      `;
      return;
    }

    answerBody.innerHTML = `
      <p class="source">
        Source:
        <a href="${escapeHtml(data.source)}" target="_blank" rel="noreferrer">
          Official award ${escapeHtml(data.code)}
        </a>
      </p>
      ${data.matches.map((match) => `
        <article class="result-card">
          <h3>${escapeHtml(match.title)}</h3>
          <p>${escapeHtml(match.text)}</p>
        </article>
      `).join("")}
    `;
  } catch (error) {
    answerBody.innerHTML = `
      <p class="error">Search failed: ${escapeHtml(error.message)}</p>
      <p>This usually means the official award page could not be fetched from Cloudflare.</p>
    `;
  }
}

awardSearch.addEventListener("input", renderAwards);

awardResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-code]");
  if (!button) return;
  selectAward(button.dataset.code);
});

askButton.addEventListener("click", searchAward);

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    searchAward();
  }
});

loadAwards();
