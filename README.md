# GDPR Consent — on-chain PoC

Proof-of-concept companion to the internal concept paper on GDPR-compliant consent
management using BSV. The PoC demonstrates the paper's central architectural claim:

> **Off-chain PII, on-chain commitment.** A data subject holds a 1Sat Ordinal consent
> token in their own wallet. The token's inscription metadata commits to *what* was
> consented to (controller, purposes, policy hash, expiry, pseudonymous subject ID) but
> contains no personal data. Withdrawal of consent is a signed on-chain revocation
> published by the subject. Audit is replay of the commitment chain against the
> off-chain plaintext the controller still holds.

GDPR scope covered: Art. 6 (lawful basis), Art. 7 (conditions for consent + 7(3)
withdrawability), Art. 13/14 (transparency).

## Architecture

| Component | Lives in | Built on |
|---|---|---|
| Controller service (server) | `app/api/*` | `@bsv/simple/server` (via simple-mcp) |
| Subject wallet (browser) | `components/WalletProvider.tsx` | `@bsv/simple/browser` |
| Consent token (1Sat Ordinal) | `lib/consent/*` | `@bsv/simple` + `@bsv/sdk` |
| DID resolution proxy | `app/api/resolve-did/route.ts` | `@bsv/simple/server` |

The PoC keeps all PII off-chain. On-chain inscriptions only carry:

```
{
  "type": "gdpr-consent-v1",
  "controller": "<did:bsv:...>",
  "subject_pseudonym": "<sha256(subject_id|controller_id|salt)>",
  "purpose_ids": ["..."],
  "policy_hash": "<sha256 of plaintext policy>",
  "issued_at": "<iso8601>",
  "scope_expiry": "<iso8601|null>"
}
```

Revocation inscription:

```
{
  "type": "gdpr-consent-revocation-v1",
  "ref": "<original txid.vout>",
  "revoked_at": "<iso8601>"
}
```

## Surfaces

| Path | Role | Notes |
|---|---|---|
| `/` | Marketplace landing ("Northgate") | Hosts the cookie consent banner; demonstrates a real-feel entry-point. |
| `/consents` | Subject inbox | Enumerates live consent tokens; per-row revoke; proof-bundle export. |
| `/request` | Simulated controller request | Generic-consent flow (any purpose IDs, any policy text). |
| `/decode` | Public decoder | Paste any txid; fetches the tx, extracts the consent inscription, displays it with live/revoked state. No wallet required. |

## Flows

1. **Cookie consent (marketplace)** — `/` shows a polished cookie banner. The
   subject can accept all, decline, or customise per category
   (functional / analytics / advertising; strictly-necessary is always on).
   Acceptance mints a 1Sat Ordinal consent token with `purpose_ids` of the form
   `cookies:<category>`, controller `did:bsv:demo-northgate-market`, and a
   policy hash bound to `lib/consent/cookies.ts:NORTHGATE_COOKIE_POLICY`.
   Re-visit detects the live token and suppresses the banner. The footer
   "Manage cookie preferences" link re-opens the customise modal.
2. **General consent (controller request)** — `/request`: controller posts a
   policy envelope to `POST /api/consent/request`, the subject reviews it, and
   mints a `gdpr-consent-v1` token into their wallet.
3. **List / inspect** — `/consents` enumerates tokens in the `gdpr-consent-v1`
   basket.
4. **Revoke** — one click on a row in `/consents`. Publishes a revocation
   inscription and redeems the original token. (Two non-atomic txs — see
   `lib/consent/token.ts`.)
5. **Export proof bundle** — `/consents` → **Download proof bundle**: JSON file
   of live tokens with outpoints + inscriptions.
6. **Audit** — controller `POST`s the outpoints to `/api/consent/audit` with
   `{ network, outpoints }`. The endpoint queries WhatsOnChain and partitions
   them into `live`, `revoked`, and `missing`.
7. **Decode** — `/decode` (or `GET /api/decode?txid=…&network=…`) fetches a tx
   from the public chain, extracts the consent inscription via a tolerant
   data-push scanner, and renders the JSON metadata alongside the on-chain
   spent state. **No wallet required** — this is the public-verifiability
   demonstration that the paper's audit story depends on.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Testnet end-to-end (manual)

1. Boot the dev server (`npm run dev`).
2. On `/`, click **Connect wallet** to bootstrap a fresh browser wallet.
3. Fund the wallet with a small amount of testnet sats (any BSV testnet faucet).
4. Navigate to `/request`, fill in the controller DID / purposes / policy, click
   **Grant consent**. A 1Sat Ordinal consent token is broadcast and minted into
   the wallet's `gdpr-consent-v1` basket. The minted txid is shown.
5. Return to `/`. The token appears in the inbox.
6. Click **Download proof bundle**. A JSON file is saved locally.
7. Hand the bundle to a simulated controller. They `POST` the outpoints back:

```bash
curl -X POST http://localhost:3000/api/consent/audit \
  -H 'content-type: application/json' \
  -d '{"network":"test","outpoints":["<txid>.0"]}'
```

The response is `{ live: [...], revoked: [...], missing: [...] }`.

8. Back on `/`, click **Revoke** on the token. Two txs broadcast (revocation
   inscription + redeem). Re-run the audit `curl` — the outpoint now appears
   under `revoked` with the spending txid in `spentBy`.

## Status

- [x] Bootstrap Next.js + simple-mcp scaffolds
- [x] Consent inscription schema (v1) + browser-side mint/list/revoke
- [x] Controller envelope endpoint (hashes plaintext policy)
- [x] Subject UI: marketplace landing, `/consents`, `/request`
- [x] Subject proof-bundle export (live tokens, JSON)
- [x] Controller audit endpoint (WhatsOnChain presence + spent-state check)
- [x] Testnet end-to-end documented (manual)
- [x] Cookie consent flow on the marketplace landing (granular per-category)
- [x] Public decoder (`/decode` + `/api/decode`) — no wallet required
- [ ] Strict inscription-envelope parsing in audit endpoint (still trusts caller bundle)
- [ ] Point-in-time audit (block-height-resolved state at past timestamps)
- [ ] BEEF-formatted proof bundles for offline / portable audits
- [ ] BRC draft for the consent-token metadata format

## Classification

Internal. Do not share externally without the owner role's sign-off.
