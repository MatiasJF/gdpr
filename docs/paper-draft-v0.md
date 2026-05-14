# On-chain consent management under the GDPR

## A blockchain-enabled architecture for verifiable consent

**Status:** Internal draft v0 · BSV Association · Co-author placeholders intentionally not filled.
**Classification:** Internal. Not for external distribution without sign-off from the accountable role.
**Companion artifact:** Reference implementation at `github.com/MatiasJF/gdpr`.

---

## 1. Executive summary

The General Data Protection Regulation (GDPR) assigns to data controllers the burden of proving that every act of personal-data processing is backed by a valid lawful basis. Where that basis is consent, Article 7(1) requires the controller to be able to demonstrate that the data subject consented; Article 7(3) requires that withdrawing consent be as easy as giving it; and Articles 13 and 14 require that data subjects be kept transparently informed about how their data is being used. In current practice, the evidence for all three obligations sits in the controller's own customer-relationship and consent-management systems — mutable, controller-controlled, and opaque to both the data subject and the supervisory authority.

This paper proposes an alternative architecture in which the live record of consent is a non-fungible token held by the data subject in their own wallet, the issuance and revocation of which are publicly verifiable events on the BSV Blockchain. The token's inscription metadata commits to *what* was consented to — controller identifier, purpose IDs, hash of the off-chain plaintext policy, pseudonymous subject identifier, scope expiry — but contains no personal data, satisfying the minimization requirement of Article 5(1)(c) and preserving the right to erasure under Article 17 against the off-chain plaintext. Withdrawal is a signed on-chain transaction that any party can observe.

The architecture closes three gaps in current consent practice. **First**, it gives supervisory authorities an externally-verifiable evidence base for Article 7(1) audits, where today they must rely on records produced by the audited party. **Second**, it makes withdrawal of consent symmetric with its granting, both being one signed wallet action. **Third**, it gives the data subject a single consolidated view of their consent surface area, addressing a transparency-and-control deficit that no individual controller can solve.

A working proof-of-concept implementing the three core flows — issue, revoke, audit — accompanies this paper as a companion repository. The paper closes with a set of policy recommendations: that on-chain consent commitments be recognised as admissible evidence under Article 7(1); that subject-held consent records be recognised as a valid implementation of the transparency obligations under Articles 13 and 14; and that a standards-track metadata format be developed in collaboration with European policy and standards bodies.

---

## 2. Regulatory context

### 2.1 Consent as a lawful basis

Under Article 6(1) of the GDPR, personal-data processing is lawful only if at least one of six enumerated bases applies. Of these, Article 6(1)(a) — the data subject has given consent — is the most operationally prominent for consumer-facing services. Consent under GDPR is not implied or assumed; it must satisfy the cumulative requirements set out in Article 4(11) — *freely given, specific, informed, and unambiguous* — and the conditions set out in Article 7. Recital 32 further requires "a clear affirmative act establishing a freely given, specific, informed and unambiguous indication of the data subject's agreement".

These requirements are substantive, not procedural. A clickwrap banner that does not allow granular per-purpose choice fails the "specific" requirement. Consent obtained through a take-it-or-leave-it choice between accepting and being denied service fails the "freely given" requirement where the service is not strictly conditional on the processing. The European Data Protection Board has elaborated these requirements in its Guidelines 05/2020 on consent under the GDPR (adopted 4 May 2020, version 1.1), which functions as the de facto interpretive baseline across EU supervisory authorities.

### 2.2 The burden of proof

Article 7(1) provides: "Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data." Recital 42 reinforces this with the explicit allocation of the burden of proof to the controller. In administrative enforcement, in litigation, and in response to a data-subject access request under Article 15, it is the controller — not the supervisory authority and not the data subject — who must produce the evidence.

This burden has two practical components. The controller must produce evidence (i) that consent was given, and (ii) that the consent has not been subsequently withdrawn. The second component is operationally non-trivial: the controller must maintain a temporally-resolved record of consent state, not merely a one-time record of the original grant. In supervisory enforcement, the absence of any record is sufficient for a finding of non-compliance; this is a key consideration when the underlying systems are designed.

### 2.3 The right to withdraw

Article 7(3) provides: "The data subject shall have the right to withdraw his or her consent at any time. ... It shall be as easy to withdraw as to give consent." This is the *withdrawal symmetry* requirement. It is among the most operationally consequential of the GDPR's consent provisions because it imposes a positive UX-level obligation on the controller. EDPB Guidelines 05/2020 reiterate that "if consent is obtained via only one mouse click, swipe or keystroke, data subjects must, in practice, be able to withdraw that consent equally as easily" (paragraph 114).

In the current state of the practice the withdrawal symmetry requirement is widely under-implemented. Granting consent is typically a single click on a banner; withdrawing it is typically a multi-step preference-screen interaction, a support ticket, or an emailed Article 21 objection. The architectural reason for this asymmetry is that the controller is the only party with the technical authority to honour the withdrawal — they hold the consent records, they operate the processing systems, they decide the user-interface flow — and they have weak incentives to make withdrawal frictionless. Any solution that materially advances Article 7(3) compliance must redistribute that authority.

### 2.4 Transparency obligations

Articles 13 and 14 set out the controller's obligation to inform the data subject of the processing being conducted — its purposes, the legal basis, the categories of recipients, the retention period, the data-subject rights. Where the data has been collected from the data subject, Article 13 applies at the point of collection; where it has been obtained otherwise, Article 14 applies within reasonable timeframes. Article 15 establishes the right of the data subject to request a confirmation of, and copy of, the processing being conducted.

These provisions are typically discharged through privacy notices and through controller-side dashboards. The dashboard approach has the same structural weakness as the consent-record approach: it depends on the controller maintaining the surface area honestly and in real time. A subject who has interacted with dozens of controllers has no consolidated view of their transparency surface area and no portable representation of their consent state across them.

### 2.5 Data minimization and the right to erasure

Article 5(1)(c) requires that personal data be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed". Article 17 ("right to erasure", colloquially "right to be forgotten") establishes the data subject's right to obtain the erasure of personal data concerning them under specified conditions, including the withdrawal of consent that formed the lawful basis.

These two provisions are the principal source of tension between GDPR compliance and immutable-ledger architectures. A naive design in which personal data is written to a blockchain is incompatible with both: it stores more than the minimum necessary (because it stores forever) and it cannot honour erasure. The architecture proposed in Section 4 addresses this tension directly through the separation of off-chain plaintext from on-chain commitments — discussed in detail there.

### 2.6 Accountability

Article 5(2) sets out the *accountability* principle: the controller shall be responsible for, and able to demonstrate compliance with, the data-protection principles. Article 24 elaborates this into a positive obligation to implement appropriate technical and organisational measures, reviewed and updated where necessary, to ensure and demonstrate that processing complies with the Regulation. The accountability principle and the consent burden of proof in Article 7(1) together form the regulatory anchor for the architectural argument that follows: the controller is responsible for *demonstrating* compliance, and a system in which the evidence is independently verifiable is materially stronger than a system in which it is not.

---

## 3. The compliance gap

Three recurring failure modes characterise the current state of consent-management practice. Each is structural — a consequence of architectural choices made decades ago in the design of consent infrastructure — rather than an implementation defect of any individual product.

### 3.1 The auditability gap

When a supervisory authority audits a controller's consent practice, or when a court considers whether a controller has discharged the burden of proof under Article 7(1), the records placed in evidence are produced by the controller themselves from systems they themselves maintain. The records are typically database rows in the controller's customer-relationship system, optionally accompanied by application logs and timestamps.

There is no externally-verifiable evidence that those records were not edited, backdated, or generated after the fact. The data subject cannot independently confirm what their own consent record looks like in the controller's database. The supervisory authority's only recourse is to inspect the controller's systems, and even then only at the resolution of trust that the systems are providing accurate readouts.

This is the *auditability gap*: the party with the burden of proof is the same party with sole physical custody of the evidence. The gap is widely acknowledged in the practice and is at the centre of multiple ongoing enforcement disputes, particularly in the ad-tech and analytics sectors where consent is high-volume and contested.

### 3.2 The withdrawal asymmetry

Article 7(3) requires that withdrawal of consent be as easy as its grant. In practice it is materially harder. Granting consent in a typical European user-experience is a single click on a banner. Withdrawing it requires the user to find the preference centre (which is rarely linked from the homepage), to navigate its multi-tab structure, to find the specific purpose they wish to withdraw, to confirm the action, and frequently to be presented with friction-introducing intermediate confirmations.

The asymmetry is not, in any individual product, a bug. It is a rational response by controllers to incentives. The controller's economic interest is in retaining processing rights as long as possible; the regulatory penalty for an asymmetric implementation is low-probability and ex post; therefore the implementation drifts toward asymmetry. The only structural answer is one in which the technical authority to honour withdrawal does not sit with the party that has the incentive against it.

### 3.3 The portability gap

A typical European internet user has given consent to hundreds of distinct controllers over time, each holding its own consent record in its own format in its own systems. The user has no consolidated view of which controllers hold consent from them, for which purposes, under which version of which policy. They cannot reason about their own consent surface area at any level of aggregation. They cannot port the record between providers. They cannot present it as evidence in their own right.

This is the *portability gap*. It is closely related to the GDPR Article 20 right to data portability, but Article 20 addresses the portability of *processed* personal data; the consent state itself, which sits a layer above the processed data, has no analogous portability mechanism in the current state of the practice. The result is a substantial information asymmetry between the data subject and the aggregate of controllers — one which the GDPR's transparency provisions in Articles 13 and 14 do not, on their own, address at the inter-controller level.

### 3.4 Structural, not implementation, failure

It is important to be clear about the nature of these three gaps. They are not implementation defects that better software practice can remove. They are direct consequences of architecting consent as a private record held exclusively by the party that benefits from the processing. As long as that architectural choice is in place, the gaps will recur regardless of the implementation quality of any particular controller's system. The architectural choice itself must be questioned.

---

## 4. Proposed architecture

The proposed architecture rests on three commitments. We state each, derive the technical specification from it, and address the GDPR-compatibility analysis that the commitment implies.

### 4.1 Commitment 1 — Off-chain personal data, on-chain commitments

**No personal data is written to the chain.** What is written to the chain is a compact JSON metadata object — an *inscription*, in the 1Sat Ordinal token format used on the BSV Blockchain — that commits to the existence and content of a consent without revealing any personal information. The metadata schema (version 1) is:

```
{
  "type": "gdpr-consent-v1",
  "controller": "<controller_DID, e.g. did:bsv:...>",
  "subject_pseudonym": "<sha256(subject_id || controller_id || salt)>",
  "purpose_ids": ["<purpose_id_1>", "<purpose_id_2>", ...],
  "policy_hash": "<sha256 of the plaintext consent policy>",
  "issued_at": "<iso8601 timestamp>",
  "scope_expiry": "<iso8601 timestamp | null>"
}
```

The *subject pseudonym* is a salted hash of the subject's real identifier combined with the controller identifier. It is deliberately not re-identifiable across controllers — two different controllers holding consent from the same subject see two different pseudonyms on the chain. The *policy hash* is the SHA-256 of the plaintext consent policy that the subject was shown; the plaintext itself is retained by the controller in their own off-chain systems and can be erased under Article 17 without disturbing the on-chain audit trail. Erasing the plaintext leaves the on-chain record intact but renders it audit-replayable only at the level of "a consent existed at time T with policy hash H", not at the level of the policy content itself.

This separation is the load-bearing element of the GDPR-compatibility argument. The on-chain inscription is not personal data within the meaning of Article 4(1), because (i) it does not contain any directly-identifying field, and (ii) the pseudonym is engineered to be not re-identifiable except by the controller themselves, who is the only party in possession of the salt and the off-chain mapping. Under the standard interpretation of *pseudonymous data* in GDPR Recital 26, data is non-personal where re-identification requires additional information that is held separately and subject to technical and organisational measures to prevent re-identification — exactly the construction here.

### 4.2 Commitment 2 — The data subject holds the token

Each granted consent is materialised as a non-fungible token issued *directly into the data subject's own wallet*, not into the controller's. The 1Sat Ordinal format treats a single satoshi as the bearer of a unique inscription; the satoshi is held at an output controlled by the subject's wallet keys; the inscription metadata travels with it.

This is the *inversion of custody*. The subject — not the controller — is the custodian of the live record of what they have consented to and with whom. The subject can enumerate their consent surface area by enumerating the consent tokens in their own wallet. The subject can present the bundle of tokens to a third party (a regulator, a successor controller in a merger, an auditor) without going through any current controller. The subject can — in principle, subject to further engineering on cross-wallet portability — port the bundle between wallet providers without loss.

The custody inversion is what fundamentally addresses the withdrawal-asymmetry problem. When the subject holds the token, the act of withdrawing consent is technically symmetric with the act of granting it: both are signed transactions originating from the same wallet, observable on the same chain, mediated by the same UX. The asymmetry of incentives between the controller (who wants retention) and the subject (who wants control) is removed from the technical layer entirely; the controller can no longer make withdrawal harder than granting because the controller does not control the path.

### 4.3 Commitment 3 — Withdrawal is a signed on-chain event

A subject withdraws consent by signing and broadcasting an on-chain revocation transaction. In the reference implementation, the revocation has two components: a *revocation inscription* (a public, chain-observable JSON object) that names the original token outpoint and the revocation timestamp; and a *redeem* of the original token, which spends it out of the subject's live consent basket. The revocation inscription serves the public-record function; the redeem clears the local state.

The revocation transaction is a signed, time-stamped, on-chain fact. It is observable by the original controller, by any successor or recipient of the data, and by supervisory authorities. There is no further action required of the controller for the revocation to take effect; the controller's only obligation is to monitor the chain (directly, through an overlay indexer, or via subject notification) and to honour the revocation in their own processing systems. The controller's compliance posture under Article 7(3) is reinforced by the very fact that the revocation record exists independently of them.

### 4.4 Audit flow

Audit, in this architecture, is replay. The party performing the audit — typically a data controller responding to a supervisory authority inquiry, or a supervisory authority directly — proceeds as follows:

1. The subject supplies a *proof bundle*: a list of `(outpoint, claimed-inscription)` pairs covering the consents at issue.
2. The auditor checks each outpoint against the chain: the transaction must exist, the inscription bytes must match the claimed-inscription, and the spent-state of the output is read off.
3. The auditor partitions the result into *live* (output exists and is unspent), *revoked* (output exists and is spent, with the spending transaction identifying when), and *missing* (output does not exist on the chain — which indicates an unbroadcast or falsified claim).
4. For each *live* consent, the auditor cross-checks the on-chain policy hash against the off-chain plaintext policy still held by the original controller. If the hashes match, the consent is verifiably bound to a specific policy text. If the controller has subsequently erased the plaintext under Article 17, the audit can confirm "a consent existed at time T against a policy with hash H" but cannot reconstruct H.

The reference implementation provides an HTTP audit endpoint (`POST /api/consent/audit`) implementing steps 2 and 3 above against the WhatsOnChain block-explorer API. The v0 endpoint trusts the caller-supplied inscription bundle for the metadata content; a production implementation would parse inscription bytes directly from each transaction, eliminating that trust requirement.

### 4.5 GDPR compatibility analysis

Five GDPR provisions deserve direct analysis against the proposed architecture.

**Article 5(1)(c) — minimization.** The on-chain inscription is the minimum information necessary to discharge the controller's burden of proof under Article 7(1): the existence of the consent, the controller and pseudonymous subject, the purposes, the policy hash, the timestamps. No directly-identifying personal data is on the chain. The minimization principle is satisfied at the on-chain layer; the off-chain plaintext retained by the controller is subject to the same minimization requirements as in any standard architecture.

**Article 7(1) — burden of proof.** The controller can demonstrate consent by exhibiting (i) the on-chain inscription, which is independently verifiable, (ii) the off-chain plaintext policy whose hash matches the on-chain commitment, and (iii) the controller's internal mapping from the on-chain pseudonym to the real subject (under the controller's own access controls). This evidence chain is materially stronger than the current state-of-the-practice CRM-log evidence because each link is independently verifiable by the audit counterparty.

**Article 7(3) — right to withdraw.** Withdrawal is technically symmetric with grant by construction (Commitment 2). The controller's obligation reduces to monitoring the chain and honouring the revocation; it is no longer an obligation to provide an asymmetric UX.

**Article 13/14 — transparency.** The subject can enumerate their consent surface area directly from their own wallet. The transparency obligations are discharged at the subject-side layer in addition to the controller-side privacy-notice layer.

**Article 17 — right to erasure.** The off-chain plaintext is erasable on subject request without disturbing the on-chain audit trail. The on-chain inscription itself, being non-personal data under the analysis in 4.1, is not subject to Article 17 in the first instance. The relationship between the on-chain pseudonym and the real subject is severed at the moment the controller deletes the salt and the mapping, at which point even the controller cannot re-identify the subject from the on-chain record.

---

## 5. Proof-of-concept case study

The reference implementation accompanying this paper is a Next.js application that exercises the three core flows end-to-end against the BSV Blockchain testnet. The full source is available at `github.com/MatiasJF/gdpr`. This section walks through the implementation in enough detail to support the architectural claims of Section 4 with concrete artefacts.

### 5.1 Stack

The application is built on Next.js 16 (App Router, TypeScript, Tailwind), with BSV Blockchain primitives provided by the `@bsv/simple` package — itself a scaffolding layer over the BSV Blockchain TypeScript SDK (`@bsv/sdk`) and the `@bsv/wallet-toolbox`. The package's `simple-mcp` Model Context Protocol server was used to generate the lower-level wallet and server-route scaffolds; the consent-specific logic was written directly against the SDK.

The wallet, both the subject's browser wallet and the controller's server wallet, is bootstrapped through `createWallet()` and `createServerWalletHandler()` respectively. DID resolution is proxied through a Next.js API route to a public BSV DID resolver. The consent inscription is published to the chain through `wallet.inscribeJSON(inscription, { basket })`, which writes the JSON metadata as a plaintext data push in the output's locking script. (A note on primitive selection: the `@bsv/simple` package also exposes a `wallet.createToken(...)` primitive whose superficial API is identical, but it encrypts the data with a wallet-derived key under `counterparty: 'self'` semantics, rendering the on-chain bytes unreadable to any party other than the minting wallet. That primitive is incompatible with the public-verifiability requirement of this architecture and is deliberately not used.)

### 5.2 Issue flow

A simulated data controller at `/request` serves a consent envelope through `POST /api/consent/request`. The endpoint accepts the controller DID, the purpose IDs, the plaintext policy, and an optional scope expiry, and returns the envelope with the plaintext SHA-256 hashed. The plaintext is returned to the subject for review (so they can see what they are consenting to), but only the hash is destined for the chain.

The subject reviews the envelope and, on confirmation, the subject's wallet computes the subject pseudonym by hashing `subject_id || controller_id || salt`, constructs the `gdpr-consent-v1` inscription, and broadcasts a transaction that places a 1Sat output with the inscription metadata into the subject's `gdpr-consent-v1` token basket. The transaction ID is displayed to the subject.

### 5.3 List flow

The subject's consent inbox at `/` enumerates tokens in the `gdpr-consent-v1` basket through `wallet.listTokenDetails(basket)`. Each row displays the outpoint, the controller, the purposes, the issuance timestamp, and the scope expiry. The "Download proof bundle" action exports a JSON file containing the outpoints and the inscription metadata for handing to an audit counterparty.

### 5.4 Revoke flow

A single button on each consent row triggers the revocation. The wallet broadcasts a revocation inscription (`type: gdpr-consent-revocation-v1`, referencing the original outpoint with the revocation timestamp) into a dedicated revocation basket. The original consent inscription's output is *not* spent — its data is the historical record that the consent existed, which the regulator needs to be able to find years later. Live state is computed by the subject's wallet (and by any auditor) as the set of consent inscriptions minus the set of revocation inscriptions whose `ref` matches. The architecture deliberately makes both grant and revocation *additive* events on the public chain rather than mutations of a token's UTXO status — this preserves the full audit history at the cost of a slightly more involved live-state calculation.

### 5.5 Audit flow

A controller audits by posting outpoints to `POST /api/consent/audit`. The endpoint queries the WhatsOnChain block-explorer API for each outpoint's transaction existence and spent-state and partitions the results into `live`, `revoked`, and `missing`. Live consents come back with the unspent confirmation; revoked consents come back with the spending transaction ID, which is itself referenceable to the revocation inscription.

### 5.6 The cookie-consent specialisation

The architecture generalises directly to cookie consent under the ePrivacy Directive (2002/58/EC, Article 5(3)), which requires consent for the storage of and access to information on a user's terminal equipment. The PoC implements a "Northgate Market" demonstration site whose landing page hosts a granular cookie-consent banner. On acceptance, the subject mints a `gdpr-consent-v1` token whose `purpose_ids` are of the form `cookies:functional`, `cookies:analytics`, `cookies:advertising` — preserving the per-purpose granularity that the ePrivacy regime and the EDPB's Article 7 jurisprudence both require. Withdrawal symmetry is realised in the same way as for the general consent case: the same wallet that minted the token can revoke it from any page of the site via a single footer action.

The cookie-consent specialisation is significant because the cookie domain is operationally the most regulated and the most subject to compliance-tooling proliferation in the EU; an architecture that handles it natively is an architecture that addresses the largest single category of consent interactions on the continent.

### 5.7 Public decoder and the verifiability argument

The PoC includes a public decoder (`/decode` in the application and `GET /api/decode` programmatically) that takes only a transaction ID and a network identifier as input. It fetches the raw transaction from the public chain via WhatsOnChain, parses the locking scripts of the transaction's outputs, and identifies any `gdpr-consent-*` inscription bytes through a tolerant data-push scanner. The decoder renders the inscription's full JSON metadata, the inferred state of the output (live, revoked, or unknown), and the on-chain references — all without requiring access to any wallet, any controller-side database, or any privileged credential.

This is the operational instantiation of the Section 4.4 audit argument and of the broader public-verifiability claim. The architecture's regulatory force depends on the proposition that anyone — supervisory authority, court-appointed expert, journalist, the data subject themselves — can independently inspect the on-chain commitment. The decoder makes that proposition concrete: any reader of this paper with an internet connection and a transaction ID can reproduce the audit. The asymmetry that defines the current state of the practice, in which only the controller can produce or verify their own consent records, is dissolved by the existence of a tool that any party can run.

### 5.8 Status and open work

At the time of this draft, the PoC supports the seven flows above end-to-end against the BSV Blockchain testnet. Open items, tracked in the repository README, include: strict inscription-envelope parsing in the audit endpoint (the v0 decoder uses a tolerant data-push scanner sufficient for the PoC; production should parse the envelope structure directly); point-in-time audit (block-height-resolved state at past timestamps); BEEF-formatted proof bundles for offline / portable audits; and a draft Bitcoin Request for Comments (BRC) standardising the consent-token metadata format.

---

## 6. Policy recommendations

The architecture described in Section 4 is technically feasible today; what would unlock its adoption is policy clarity from European supervisory authorities and standards bodies on three specific points.

### 6.1 Recognition of on-chain commitments as Article 7(1) evidence

We recommend that supervisory authorities, in the context of Article 7(1) enforcement, explicitly recognise an on-chain inscription bound to a verified off-chain policy plaintext as admissible — and indeed preferred — evidence of consent. This is consistent with the existing accountability framework in Article 5(2) and the burden-of-proof allocation in Article 7(1); it does not require any new regulatory instrument; and it materially strengthens the supervisory authority's ability to audit.

### 6.2 Recognition of subject-held records as transparency-obligation implementation

We recommend that the EDPB clarify, through an addendum to Guidelines 05/2020 or a separate guidelines document, that a subject-held cryptographic record of consent transactions — enumerated through a wallet under the subject's sole control — is a valid implementation of the transparency obligations under Articles 13 and 14, complementary to the controller-side privacy-notice obligation. This recognition would create a clear regulatory path for the architecture proposed here and for related subject-sovereignty designs.

### 6.3 Standardisation of the consent-token metadata format

We recommend that a standards-track Bitcoin Request for Comments (BRC) be developed, in collaboration with European standards bodies, specifying the consent-token metadata format at a level of precision suitable for cross-implementation interoperability. The v1 format described in Section 4.1 is a starting point; a production standard should additionally specify: a controlled vocabulary for purpose identifiers (or a registration mechanism for ad-hoc identifiers); the canonicalisation algorithm for plaintext-policy hashing; the binding between the on-chain DID and the off-chain controller legal entity; and the cross-jurisdictional considerations for multi-region controllers. The BRC track is the appropriate venue because the format is intrinsically BSV Blockchain-specific; harmonisation with non-BSV blockchain standards can follow.

---

## 7. Limitations and open questions

The architecture proposed here is a substantial improvement on the current state of the practice but it is not a finished product. The following limitations and open questions are explicit.

### 7.1 Is the token itself personal data?

The position taken in Section 4.1 is that the on-chain inscription is not personal data within the meaning of Article 4(1), because the pseudonym is engineered to be not re-identifiable except by the controller, who is the only party in possession of the salt and the off-chain mapping. This position rests on the standard interpretation of GDPR Recital 26 on pseudonymous data and on the construction of the pseudonym as a one-way hash. A counter-argument can be made that the inscription is *indirectly identifying* because the controller themselves can re-identify; under the more conservative interpretation of the Court of Justice of the European Union's case law on indirect identifiability (notably C-582/14, *Breyer*), this would render the inscription personal data. The conservative interpretation does not invalidate the architecture but it does shift the analysis of Article 5(1)(c) and Article 17 obligations — under the conservative interpretation, Article 17 would in principle apply to the on-chain inscription itself, which is by construction non-erasable. The honest answer is that this is a live legal question that requires definitive guidance from the EDPB.

### 7.2 Pseudonym re-identification risk across controllers

The pseudonym construction `sha256(subject_id || controller_id || salt)` is engineered to differ across controllers, but two controllers cooperating with knowledge of the salt and the subject identifier could collude to re-identify a single subject across both their on-chain records. Mitigation requires either (i) per-controller salts that controllers are obliged not to share, or (ii) zero-knowledge constructions that allow the controller to verify the binding without revealing the underlying pseudonym derivation. Both are tractable; the zero-knowledge option is more robust and is the recommended path for a production system.

### 7.3 Wallet UX for non-technical subjects

A precondition for the architecture's adoption is that operating a BSV Blockchain wallet must be no harder, for a typical European internet user, than maintaining a password manager or a banking app. The current state of wallet UX in the BSV ecosystem is improving but is not yet at this level. Mainstream adoption requires custodial-or-hybrid wallet options with the same security profile as consumer banking — a non-trivial engineering and product programme. We do not consider this a refutation of the architecture; we consider it a precondition for deployment that is being worked on in parallel.

### 7.4 Lost-wallet recovery

If a subject loses access to their wallet, they lose access to the live state of their consents. The on-chain record remains, but the subject can no longer revoke. This is a real risk and any production deployment must include a recovery mechanism — most plausibly a guardian-based or multi-signature recovery scheme — that does not compromise the custody-inversion property described in 4.2.

### 7.5 Cross-jurisdictional considerations

GDPR is the focus of this paper; non-EU jurisdictions with their own consent regimes (CCPA/CPRA, LGPD, PIPL) impose related but non-identical requirements. The architecture is in principle adaptable to these regimes — the metadata schema is extensible and the custody model is jurisdiction-neutral — but the per-jurisdiction analysis is outside the scope of this draft.

---

## 8. Conclusion

The current architecture of consent management under the GDPR — private records held by the party that benefits from the processing — is at the root of recurring failures across three regulatory dimensions: auditability, withdrawal symmetry, and subject-facing portability and transparency. These failures are structural, not the consequence of any individual implementation's quality, and they will not be remedied by better engineering within the current architectural envelope.

The architecture proposed here — off-chain personal data, on-chain commitments, data-subject-held tokens, signed on-chain revocations — moves the custody of the live consent record from the controller to the data subject and makes the surrounding events publicly verifiable on the BSV Blockchain. The shift is consistent with the GDPR's accountability framework and its burden-of-proof allocation; the off-chain plaintext / on-chain commitment separation addresses the Article 5(1)(c) and Article 17 tensions that have historically blocked blockchain applications in personal-data domains.

A working reference implementation accompanies this paper. The remaining work is policy clarification by European supervisory authorities on the questions identified in Sections 6 and 7, standardisation through the Bitcoin Request for Comments process, and the engineering of mainstream-grade wallet UX. Each of these is tractable. None is blocked on a technical impossibility. The architecture is ready to be discussed seriously as a candidate for the next generation of consent infrastructure under European data-protection law.

---

*End of draft v0.*
