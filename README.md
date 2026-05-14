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

## Flows

1. **Issue** — `/request` page: controller serves a consent envelope via
   `POST /api/consent/request`. The subject reviews it, then mints a 1Sat Ordinal
   consent token into their own wallet via `wallet.createToken(...)`.
2. **List / inspect** — `/` page enumerates live consent tokens in the subject's
   wallet basket `gdpr-consent-v1`.
3. **Revoke** — one click on `/`. Publishes a revocation inscription and redeems the
   original token. (Two non-atomic txs — see `lib/consent/token.ts`.)
4. **Export proof bundle** — subject downloads a JSON bundle of their live consent
   tokens (outpoint + inscription) via the **Download proof bundle** button on `/`.
5. **Audit** — controller `POST`s the outpoints from the bundle to
   `/api/consent/audit` with `{ network, outpoints }`. The endpoint queries
   WhatsOnChain and partitions them into `live`, `revoked`, and `missing`.

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
- [x] Subject UI: `/` (consent inbox) and `/request` (grant flow)
- [x] Subject proof-bundle export (live tokens, JSON)
- [x] Controller audit endpoint (WhatsOnChain presence + spent-state check)
- [x] Testnet end-to-end documented (manual)
- [ ] Inscription-script parsing in audit endpoint (currently trusts caller bundle)
- [ ] Point-in-time audit (block-height-resolved state at past timestamps)
- [ ] BEEF-formatted proof bundles for offline / portable audits
- [ ] BRC draft for the consent-token metadata format

## Classification

Internal. Do not share externally without the owner role's sign-off.
