# Market Prices / Admin Panel / Registrations — Setup

This site is deployed on Vercel. The pages [market-prices.html](market-prices.html), [register.html](register.html) and [admin.html](admin.html) are backed by serverless functions in [api/](api/) that read/write an Airtable base. Nothing works until both Airtable and the environment variables below are configured.

## 1. Create the Airtable base

Create one base with two tables, using these **exact** field names and types.

### Table: `Market Prices`

| Field | Type | Notes |
|---|---|---|
| Commodity | Single line text | Primary field |
| Category | Single select | Options: `Agricultural`, `Mineral`, `Livestock` |
| Market | Single line text | e.g. "Jos Main Market" |
| Unit | Single line text | e.g. "100kg bag", "tonne" |
| Price (NGN) | Number | Decimal, 2 precision |
| Change (%) | Number | Decimal, allow negative |
| Notes | Long text | Optional |
| Last Updated | **Last modified time** | Tracks all fields. Read-only, Airtable sets this automatically — used as the "freshness" timestamp on the public page. |

Seed it with a few realistic rows (e.g. Irish Potatoes, Tomatoes, Maize, Cassiterite, Columbite, Gemstones) so the Market Prices page isn't empty on first load — these can be edited or replaced anytime from the admin panel.

### Table: `Registrations`

| Field | Type | Notes |
|---|---|---|
| Full Name | Single line text | Primary field |
| Registration Type | Single select | Options: `Individual Farmer`, `Cooperative / Group` |
| Cooperative Name | Single line text | |
| Phone | Single line text | |
| Email | Email | |
| LGA | Single line text | Populated from a fixed dropdown on the form, so plain text is fine |
| Primary Commodities | Single line text | Comma-separated, free text from the form |
| Farm/Group Size | Single line text | |
| Years Active | Number | Integer |
| Notes | Long text | |
| Status | Single select | Options: `New`, `Reviewed`, `Contacted`, `Approved` |

Leave this table empty — it fills up as the public registration form is submitted.

### Get your credentials

1. Base ID: open the base, **Help → API documentation**, copy the ID starting with `app...`.
2. Personal Access Token: [airtable.com/create/tokens](https://airtable.com/create/tokens) → scopes `data.records:read` and `data.records:write` → access limited to this one base only.

## 2. Set environment variables in Vercel

Project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `AIRTABLE_TOKEN` | the Personal Access Token from above |
| `AIRTABLE_BASE_ID` | the `app...` base ID |
| `AIRTABLE_MARKET_TABLE` | `Market Prices` (only needed if you rename the table) |
| `AIRTABLE_REGISTRATIONS_TABLE` | `Registrations` (only needed if you rename the table) |
| `ADMIN_PASSWORD` | a strong password for accessing `/admin.html` |
| `ADMIN_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) used to sign admin login sessions |

Redeploy after adding/changing these — functions only pick up env vars on a fresh build.

## 3. Using it

- Public market data: `/market-prices.html` — reads `Market Prices` via `GET /api/market-data`.
- Public registration form: `/register.html` — writes to `Registrations` via `POST /api/registrations`.
- Admin panel: `/admin.html` — sign in with `ADMIN_PASSWORD` to add/edit/delete commodities and review/update registration status. It is not linked from the public navigation.

## Known limitations (accepted for this build)

- No rate limiting on the public registration endpoint beyond a honeypot field and input length caps.
- `ADMIN_PASSWORD` is a single shared password, not per-user accounts — fine for one or two staff managing this, not for a larger team.
