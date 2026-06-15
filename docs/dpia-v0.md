# Data Protection Impact Assessment — on-chain consent management (living draft v0)

**Status:** Internal · BSV Association · **Living document — incomplete by design.**
**Classification:** Internal. Not for external distribution without sign-off from the accountable role.
**Companion artifacts:** Architecture paper `docs/paper-draft-v0.md`; reference implementation `github.com/MatiasJF/gdpr`.

> **Why this exists.** EDPB Guidelines 02/2025 treat a DPIA as effectively imperative for blockchain processing of personal data, conducted *before* processing and maintained as a living process (Article 35 GDPR). This document is started now so the DPIA exists as a real workstream rather than a promise. It is deliberately partial: the rows marked **[PARTNER WORKSTREAM]** depend on the legal analysis sought from the research co-author and are expected to change.

---

## 1. Is a DPIA required?

Article 35(1) requires a DPIA where processing is "likely to result in a high risk." Indicative triggers present here: systematic processing using a novel technology (blockchain), processing of identifiers that are replicated on a public network, and a context in which the EDPB itself signals heightened risk. **Working conclusion: a DPIA is required.** This should be confirmed against the competent supervisory authority's Article 35(4) list.

## 2. Description of the processing

- **Nature.** Recording the existence, scope, and revocation of a data subject's consent as a 1Sat-Ordinal token on the BSV Blockchain, with plaintext personal data held off-chain by the controller.
- **Scope.** On-chain: controller DID, salted-hash subject pseudonym, purpose IDs, policy hash, timestamps, revocation references. Off-chain (controller): plaintext policy, subject identity, per-consent random salt.
- **Context.** Consumer-facing consent and cookie-consent capture; supervisory-authority and data-subject audit.
- **Purposes.** Independently verifiable evidence of consent (Art. 7(1)); symmetric withdrawal (Art. 7(3)); subject-side transparency (Art. 13/14).
- **Controller / processor.** See architecture paper §4.6 — **[PARTNER WORKSTREAM]**, the status of node operators is the key open question.

## 3. Necessity and proportionality

- **Lawful basis:** consent (Art. 6(1)(a)); cookie storage/access under ePrivacy Art. 5(3).
- **Necessity of a public permissionless ledger:** independent verifiability cannot be achieved on a permissioned ledger without reintroducing a gatekeeper — see architecture paper §4.7. **[PARTNER WORKSTREAM]**
- **Data minimisation:** no plaintext personal data on-chain; pseudonymous, plaintext-free commitments only.
- **Storage limitation:** identifiable lifetime of the on-chain identifier is bounded by the existence of the off-chain salt (crypto-shredding). **[PARTNER WORKSTREAM — sufficiency under Art. 5(1)(e)]**

## 4. Risk register

| # | Risk to data subjects | Likelihood | Severity | Mitigation | Residual |
|---|---|---|---|---|---|
| R1 | Re-identification of the on-chain pseudonym **while the salt exists** | Med | Med | Per-consent 256-bit random salt held off-chain; access controls; the pseudonym is plaintext-free | Pseudonymous personal data by design — accepted for the consent lifetime |
| R2 | Re-identification **after** erasure | Low | High | Crypto-shredding: irreversible destruction of salt + plaintext; no backups/replicas/soft-delete | **[PARTNER WORKSTREAM — is this anonymisation in the EDPB sense?]** |
| R3 | Salt-store compromise (exfiltration of the linking secret) | Med | High | KMS/HSM-backed store (production); least-privilege access; audit logging | Open — PoC uses a file-backed store, not production-grade |
| R4 | Cross-controller collusion to correlate a subject | Low | Med | Random per-consent salts remove trivial correlation; shredded salts cannot participate; ZK construction recommended | Reduced, not eliminated |
| R5 | Lost-wallet — subject cannot revoke | Med | Med | Guardian/multi-sig recovery (production) | Open — see paper §7.4 |
| R6 | Global node replication as a Chapter V transfer | Med | Med | Pseudonymous, plaintext-free, time-bounded data | **[PARTNER WORKSTREAM — paper §4.8]** |
| R7 | Automated gating on consent state engaging Art. 22 | Low | Med | Architecture does not require automated significant decisions; assess per deployment | Open — paper §4.5 |
| R8 | Withdrawal not in practice "as easy" as a one-click grant (Art. 7(3)) | Med | Low | Wallet-UX programme; symmetric-by-construction signing | Open — paper §4.5, §7.3 |

## 5. Measures already implemented (PoC)

- Per-consent random salt generated server-side; never placed on-chain (`lib/consent/saltStore.ts`).
- Crypto-shredding erasure endpoint and demonstrable before/after re-identifiability (`/api/consent/erase`, `/erasure`).
- Off-chain plaintext; on-chain commitments only.

## 6. Open items / next revisions

- Confirm DPIA requirement against the competent SA's Art. 35(4) list.
- Settle controller/processor allocation and node-operator status (§4.6).
- Develop the necessity/proportionality and Chapter V analyses (§4.7, §4.8).
- Define production salt-store security (KMS/HSM) and shred-integrity verification (Art. 32).
- Consult data subjects' views where appropriate (Art. 35(9)).
- Determine whether prior consultation under Art. 36 is needed given residual high risk.
- **Withdrawal→erasure coupling.** Decide, per processing activity, whether withdrawal of consent must trigger crypto-shredding under Art. 17(1)(b) (consent as sole basis) or whether a residual retention basis justifies keeping the salt (e.g. proving consent existed for the period processing was lawful, per Art. 7(1)). The PoC offers erasure as an explicit post-revocation step rather than hard-wiring it (architecture paper §4.3, §5.4).

---

*This DPIA is a living document and will be revised as the legal analysis matures. It is not a sign-off.*
