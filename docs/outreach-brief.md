# On-chain GDPR consent management — research partner brief

**Status:** Internal · BSV Association
**Purpose:** Concept brief for approaching a policy / research partner about co-authoring a joint paper analogous to existing EU-policy blockchain papers (e.g. blockchain-enabled Digital Product Passports).
**Companion artifact:** Working proof-of-concept at `github.com/MatiasJF/gdpr` (private).

---

## Summary

GDPR makes data controllers carry the burden of proving that every instance of personal-data processing is backed by valid consent (Art. 7(1)), that consent is as easy to withdraw as it is to give (Art. 7(3)), and that data subjects are kept informed (Art. 13/14). In practice, the evidence for these obligations sits in the controller's own CRM logs — mutable, controller-controlled, and opaque to both the data subject and the supervisory authority. We propose a paper, jointly authored with a research partner, that lays out an on-chain alternative: **data-subject-held consent tokens with off-chain personal data and on-chain commitments**, accompanied by a public proof-of-concept implementation.

---

## The compliance gap

Three failure modes recur in GDPR enforcement against current consent management systems.

1. **Auditability gap.** When a Data Protection Authority audits a controller's consent practice, the controller produces records from systems they themselves maintain. There is no externally-verifiable evidence that those records were not edited, backdated, or generated after the fact. The same gap appears in litigation and in data-subject-access requests.
2. **Withdrawal asymmetry.** GDPR Art. 7(3) requires that withdrawing consent be as easy as giving it. In practice giving consent is one click on a banner; withdrawing it is a support ticket, an email chain, or a deeply-buried preference screen. The asymmetry is structural — controllers are the only party with the technical ability to honour withdrawal, and they have weak incentives to make it trivial.
3. **Portability gap.** A typical data subject in the EU has given consent to dozens or hundreds of controllers over time, each holding its own record. The subject has no consolidated view of which controllers hold consent, for what purposes, under which policy version. They cannot reason about their own consent surface area.

These are not implementation defects — they are direct consequences of architecting consent as a private record held by the party that benefits from the processing.

---

## Proposed approach

We propose a system with three architectural commitments.

**Commitment 1 — off-chain personal data, on-chain commitments.** No personal data is written to the chain. On-chain inscriptions carry only: a controller identifier (W3C DID), a pseudonymous subject identifier (a salted hash, deliberately not re-identifiable across controllers), a list of purpose identifiers, a hash of the off-chain plaintext consent policy, an issuance timestamp, and an expiry. The off-chain plaintext policy and the subject's real identity remain in the controller's own systems and remain subject to the GDPR data-subject rights, including erasure under Art. 17. Erasing the off-chain plaintext does not invalidate the on-chain audit trail; it simply means the audit can no longer be replayed against plaintext, only summarised as "a consent existed at time T with policy hash H".

**Commitment 2 — the data subject holds the token.** Each granted consent is materialised as a non-fungible token (a 1Sat Ordinal on BSV) issued directly into the data subject's own wallet. The subject — not the controller — is the custodian of the live record of what they have consented to and with whom. This inverts the asymmetry: the subject can enumerate their consent surface area, port it between wallets, and demonstrate it to third parties without going through any controller.

**Commitment 3 — withdrawal is a signed on-chain event.** A subject withdraws consent by signing and broadcasting an on-chain revocation that references the original token's outpoint. The revocation is a public fact, observable by the controller, by supervisory authorities, and by the subject themselves. Controllers commit, as part of integration, to honouring the on-chain revocation state. Audit is replay: at any point in time T, the on-chain UTXO graph plus the off-chain plaintext that the controller still holds is sufficient to reconstruct the consent state and prove that state to a third party.

---

## What we have built

A Next.js proof-of-concept implementing the three core flows is committed at `github.com/MatiasJF/gdpr` (private). The PoC uses BSV blockchain primitives via the `@bsv/simple` scaffolding tooling and the BSV Blockchain TypeScript SDK. It demonstrates:

- **Issue.** A simulated controller serves a consent envelope; the data subject reviews it and mints a 1Sat Ordinal consent token into their own wallet.
- **List and inspect.** The subject's wallet enumerates live consent tokens with the controller, purposes, policy hash, and expiry visible.
- **Revoke.** A single user action publishes an on-chain revocation inscription and clears the token from the subject's live basket.

Open work tracked in the repository README includes a controller-side audit endpoint, a portable BEEF-formatted proof-bundle export suitable for handing to a Data Protection Authority, end-to-end testnet validation, and a draft Bitcoin Request for Comments (BRC) standardising the consent-token metadata format.

---

## What this brief proposes

We are seeking a research partner with deep EU regulatory and standards expertise to co-author a position paper on this architecture. The paper would be structured similarly to existing policy papers on blockchain applications in EU-regulated domains — establishing the regulatory context, the specific compliance gap, the proposed technical architecture, the legal-interpretation arguments for why the architecture satisfies GDPR's substantive obligations, and a set of concrete policy recommendations.

Indicative scope of the joint paper:
- GDPR Art. 6 (lawful basis) and Art. 7 (conditions for consent, including 7(3) withdrawability) as the load-bearing provisions.
- Transparency obligations under Art. 13/14, addressed through the subject's wallet-side enumeration capability.
- The Art. 5(1)(c) data-minimisation and Art. 17 right-to-erasure tension with immutable ledger storage, addressed by the off-chain plaintext / on-chain commitment separation.
- EDPB Guidelines 05/2020 on consent and their compatibility with the proposed architecture.
- Policy recommendations for supervisory authorities and standards bodies, including the recognition of on-chain commitments as admissible Art. 7(1) evidence and the need for a standards-track metadata format.

What we would ask of the partner: regulatory expertise, policy framing, contribution to the legal analysis sections, and joint signature on the published paper. What we contribute: the technical architecture, the working PoC, the BSV-side implementation expertise, and editorial / publication support.

---

## Proposed next steps

1. Internal review and approval of this brief by the accountable BSVA role.
2. Identification of named partner contacts and initial outreach (handled outside this document at present, per Internal classification).
3. On partner agreement: scope-and-timeline alignment session, joint outline of the paper, work-split agreement.
4. PoC hardening in parallel: audit endpoint, BEEF proof-bundle export, testnet end-to-end, BRC draft.
5. Paper draft v0 within 4–6 weeks of partner agreement.

---

*This document is internal. Partner names are deliberately omitted. Any external sharing requires sign-off from the accountable role.*
