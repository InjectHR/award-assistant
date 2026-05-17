# Award Assistant

Small custom web app for searching the Fair Work A-Z awards catalogue, opening an embedded official award viewer, asking for clauses such as "annual leave clause", and checking related classification/pay-rate context.

Manufacturing Award MA000010 is included as a richer worked example with curated annual leave, pay-rate and classification cards. Other awards are selectable from the catalogue and searched through their official `awards.fairwork.gov.au/{awardCode}.html` source by the local server.

Each selected award also exposes quick links to the Fair Work pay guide PDF and DOCX using the official calculator download endpoint, plus an in-app pay guide viewer.

The viewer loads the selected official award HTML through the app, so the browser can display it inline with an in-viewer contents sidebar for moving through the award.

## Run

```powershell
npm start
```

Then open http://localhost:4173.

## Put It On A Website

Yes. Host it as a small Node web app so the server routes keep working:

- `/api/award-search` fetches/searches official award pages from the server.
- `/api/pay-rates` keeps any FWC MAPD subscription key server-side.
- Static files are served from `public/`.

Any Node-capable host works, including an internal company server, Azure App Service, Render, Railway, Fly.io, or a container platform. Set the host's start command to:

```powershell
npm start
```

The server reads `PORT` from the hosting environment, so most web hosts can route traffic to it automatically.

For a team-facing deployment, put authentication in front of the app if it should stay internal, and keep `FWC_API_SUBSCRIPTION_KEY` as a server environment variable only.

## FWC MAPD API

The app includes a server-side pay-rate proxy at `/api/pay-rates`. By default it returns demo fallback rates sourced from MA000010 clause 20.1 / Schedule C only, because the live FWC Modern Awards Pay Database API requires a registered subscription key. For all other awards, configure the live MAPD key.

To connect a live subscription:

```powershell
$env:FWC_API_SUBSCRIPTION_KEY="your-key"
$env:FWC_API_BASE_URL="https://api.fwc.gov.au"
$env:FWC_API_PAY_RATES_PATH="/api/v1/awards/{id_or_code}/pay-rates"
npm start
```

If your FWC portal account shows a different pay-rate path, set `FWC_API_PAY_RATES_PATH` to that path. The subscription key is sent using the `Ocp-Apim-Subscription-Key` header by default.

To check whether your Render environment has the key configured correctly, open:

```text
https://your-render-site.onrender.com/api/fwc-test
```

If the key is installed and the `/api/v1/awards` route is correct, this returns `connected: true`. If FWC uses a different awards-list route in your portal, set `FWC_API_AWARDS_PATH` to that route.

## Official Sources Used

- Fair Work A-Z award list: https://www.fairwork.gov.au/employment-conditions/awards/list-of-awards
- Fair Work pay guides: https://www.fairwork.gov.au/pay-and-wages/minimum-wages/pay-guides
- Manufacturing Award HTML: https://awards.fairwork.gov.au/MA000010.html
- Manufacturing Award PDF: https://www.fwc.gov.au/documents/modern_awards/pdf/ma000010.pdf
- Fair Work Ombudsman award summary: https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000010-summary
- FWC Modern Awards Pay Database: https://www.fwc.gov.au/work-conditions/awards/modern-awards-pay-database
- FWC developer portal: https://developer.fwc.gov.au/
- Fair Work Ombudsman annual leave/NES guide: https://www.fairwork.gov.au/leave/annual-leave

General information only; check the current award, NES and FWC/Fair Work sources before relying on it.
