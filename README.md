# GDPR Consent — on-chain PoC

Proof-of-concept companion to the internal concept paper on GDPR-compliant consent
management using BSV. The PoC demonstrates the paper's central architectural claim:

> **Off-chain PII, on-chain commitment, erasure by crypto-shredding.** A data subject
> holds a 1Sat Ordinal consent token in their own wallet. The token's inscription
> metadata commits to *what* was consented to (controller, purposes, policy hash, expiry,
> pseudonymous subject ID) and carries **no plaintext personal data**. Following EDPB
> Guidelines 02/2025, the on-chain salted-hash subject ID is treated as *pseudonymous
> personal data* while the controller holds the salt — not as anonymous data. The right
> to erasure is honoured by **crypto-shredding**: the controller destroys the off-chain
> per-consent salt, after which the immutable on-chain commitment is no longer
> re-identifiable by anyone. Withdrawal of consent is a signed on-chain revocation
> published by the subject. Audit is replay of the commitment chain against the
> off-chain plaintext the controller still holds.

GDPR scope covered: Art. 6 (lawful basis), Art. 7 (conditions for consent + 7(3)
withdrawability), Art. 13/14 (transparency), Art. 5(1)(c)/(e) (minimisation +
storage limitation) and Art. 17 (erasure via crypto-shredding). The legal analysis
is anchored on **EDPB Guidelines 02/2025 on blockchain** — see `docs/paper-draft-v0.md`.

## Architecture

| Component | Lives in | Built on |
|---|---|---|
| Controller service (server) | `app/api/*` | `@bsv/simple/server` (via simple-mcp) |
| Subject wallet (browser) | `components/WalletProvider.tsx` | `@bsv/simple/browser` |
| Consent token (1Sat Ordinal) | `lib/consent/*` | `@bsv/simple` + `@bsv/sdk` |
| DID resolution proxy | `app/api/resolve-did/route.ts` | `@bsv/simple/server` |

The PoC keeps all plaintext PII off-chain. The controller derives the pseudonym
server-side from a **random per-consent salt held off-chain** (`lib/consent/saltStore.ts`)
and never puts the salt on the chain. On-chain inscriptions only carry:

```
{
  "type": "gdpr-consent-v1",
  "controller": "<did:bsv:...>",
  "subject_pseudonym": "<sha256(subject_id|controller_id|salt) — salt held off-chain>",
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
| `/erasure` | Controller erasure (crypto-shredding) | The controller's off-chain salt-store view; per-record "Crypto-shred salt" flips the on-chain pseudonym from linkable-to-subject to anonymous while leaving the immutable record on-chain. |

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
   inscription into the `gdpr-consent-revocation-v1` basket. The original
   consent inscription stays on-chain as the historical record; live state =
   consents minus revocations whose `ref` matches. After revoking, the
   confirmation offers a **separate "Request erasure (Art. 17(1)(b))"** action
   that crypto-shreds the controller's salt for that consent — demonstrating the
   withdrawal→erasure path without conflating the two distinct rights
   (withdrawal = Art. 7(3); erasure = Art. 17). Offered, not automatic.
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
8. **Crypto-shred (erasure)** — `/erasure` lists the controller's salt-store
   records. **Crypto-shred salt** calls `POST /api/consent/erase`, destroying the
   off-chain salt + plaintext subject link for that pseudonym. The record flips to
   *anonymous (salt destroyed)*; the on-chain inscription is untouched and still
   resolves in `/decode`, but is no longer re-identifiable. This is the operational
   instantiation of anonymisation-on-erasure (paper §4.1, §4.5, §5.8).

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
9. Open `/erasure`. The consent appears as *linkable to subject*. Click
   **Crypto-shred salt**, then confirm via `/decode` that the on-chain inscription
   still exists — but the `/erasure` view now shows it as *anonymous (salt
   destroyed)*. The off-chain salt is gone; the immutable record is no longer
   re-identifiable.

## A note on the mint primitive

We use `wallet.inscribeJSON(...)`, **not** `wallet.createToken(...)`.
The `createToken` primitive in `@bsv/simple` encrypts the payload with a
wallet-derived key under `counterparty: 'self'` — only the minting wallet can
ever read it back. That trivially breaks public verifiability. Any consent
record we put on chain must be plaintext to anyone fetching the tx.

If you minted via an earlier version of this PoC that used `createToken`,
those tokens are encrypted on chain and the decoder will not find them.
Re-mint with the current code to test the decoder.

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
- [x] Off-chain random per-consent salt store + server-side pseudonym derivation
- [x] Crypto-shredding erasure (`/erasure` + `/api/consent/erase`) — anonymisation-on-erasure
- [ ] Strict inscription-envelope parsing in audit endpoint (still trusts caller bundle)
- [ ] Point-in-time audit (block-height-resolved state at past timestamps)
- [ ] BEEF-formatted proof bundles for offline / portable audits
- [ ] Production salt store: KMS/HSM-backed, with shred-integrity verification
- [ ] BRC draft for the consent-token metadata format

## Classification

Internal. Do not share externally without the owner role's sign-off.
