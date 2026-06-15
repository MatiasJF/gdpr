# On-chain consent management under the GDPR

## A blockchain-enabled architecture for verifiable consent

**Status:** Internal draft v0.1 · BSV Association · Co-author placeholders intentionally not filled.
**Classification:** Internal. Not for external distribution without sign-off from the accountable role.
**Companion artifact:** Reference implementation at `github.com/MatiasJF/gdpr`.

> **v0.1 reframing note.** This revision re-centres the legal analysis on **EDPB Guidelines 02/2025 on processing personal data through blockchain technologies**, which is the controlling EDPB instrument for this architecture and must be the spine of the analysis. The earlier draft's load-bearing claim — that an on-chain salted-hash pseudonym is simply "not personal data" — is **withdrawn**. The EDPB's position is that hashed and encrypted data remain personal data; a salted hash the controller can still link is *pseudonymous* personal data, not anonymous. The architecture's answer is therefore reframed around **crypto-shredding**: the controller destroys the off-chain salt on erasure, rendering the on-chain commitment genuinely non-re-identifiable (*anonymisation-on-erasure*), rather than asserting the commitment was never personal data. Sections still flagged **[PARTNER WORKSTREAM]** — controller/processor allocation, the necessity/proportionality defence of a public permissionless ledger, Chapter V transfers, and the DPIA — are framed but deliberately not settled here; they are the substantive contributions sought from the research co-author.

---

## 1. Executive summary

The General Data Protection Regulation (GDPR) assigns to data controllers the burden of proving that every act of personal-data processing is backed by a valid lawful basis. Where that basis is consent, Article 7(1) requires the controller to be able to demonstrate that the data subject consented; Article 7(3) requires that withdrawing consent be as easy as giving it; and Articles 13 and 14 require that data subjects be kept transparently informed about how their data is being used. In current practice, the evidence for all three obligations sits in the controller's own customer-relationship and consent-management systems — mutable, controller-controlled, and opaque to both the data subject and the supervisory authority.

This paper proposes an alternative architecture in which the live record of consent is a non-fungible token held by the data subject in their own wallet, the issuance and revocation of which are publicly verifiable events on the BSV Blockchain. The token's inscription metadata commits to *what* was consented to — controller identifier, purpose IDs, hash of the off-chain plaintext policy, pseudonymous subject identifier, scope expiry — and is deliberately minimised to carry no plaintext personal data on the chain. Consistent with EDPB Guidelines 02/2025, we treat the on-chain salted-hash identifier as *pseudonymous personal data* for as long as the controller retains the salt, not as anonymous data. The right to erasure under Article 17 is honoured through **crypto-shredding**: the controller destroys the off-chain salt (and the plaintext it protects), after which the on-chain commitment is no longer re-identifiable by the controller or any third party. Withdrawal is a signed on-chain transaction that any party can observe.

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

### 2.7 EDPB Guidelines 02/2025 on blockchain — the controlling instrument

Any GDPR analysis of a blockchain-based architecture must now engage directly with **EDPB Guidelines 02/2025 on processing of personal data through blockchain technologies**. This is the single most important interpretive document for the present proposal, and the analysis in Sections 4–7 is structured around it. The Guidelines establish several positions that bear directly — and in places adversely — on the architecture, and which this paper must meet head-on rather than around:

1. **Hashed and encrypted data remain personal data.** The EDPB's position is that hashing and encryption are *pseudonymisation* techniques, not anonymisation; encrypted or hashed personal data remains personal data and the GDPR continues to apply. A salted hash that the controller can still re-link to a subject is pseudonymous personal data. This directly refutes any claim that an on-chain salted-hash identifier is simply non-personal — see Section 4.1.
2. **Strong preference for avoiding personal data on-chain, and for permissioned over permissionless networks.** The Guidelines counsel that personal data should where possible not be stored on the ledger at all, and express a preference for private/permissioned architectures, in which the set of participants — and therefore the controllers, the processors, and the recipients of any transfer — is known and governable. A public permissionless design must therefore carry an explicit necessity-and-proportionality justification (Section 4.7).
3. **Global accessibility and international transfers.** A public permissionless ledger replicated across nodes worldwide raises Chapter V international-transfer questions that a permissioned network does not (Section 4.8).
4. **Controller and processor roles must be identified.** The Guidelines devote sustained attention to allocating controllership in decentralised settings — including the status of nodes/miners — which a credible paper cannot leave undefined (Section 4.6).
5. **A DPIA is effectively imperative, and is a living process.** Given the risks, the Guidelines treat a data protection impact assessment as a practical necessity, conducted before processing and maintained thereafter (Section 4.9 and the companion DPIA artifact).
6. **Data subject rights, including erasure, must be deliverable.** The Guidelines acknowledge the tension with immutability and point toward techniques — off-chain storage, and rendering data inaccessible by destroying keys — that make rights deliverable in practice. Our crypto-shredding construction (Section 4.1) is an instance of exactly this approach.

Where this paper previously cited only Guidelines 05/2020 on consent, it now treats 05/2020 as governing the *quality of consent* and 02/2025 as governing the *blockchain processing* — and engages 02/2025 as the load-bearing authority throughout.

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

The *subject pseudonym* is a salted hash of the subject's real identifier combined with the controller identifier, where the salt is a **high-entropy, per-consent random value generated and held off-chain by the controller**. Two different controllers holding consent from the same subject see two different pseudonyms on the chain, and — because the salt is random per consent rather than a shared constant — the pseudonym cannot be recomputed by anyone who does not hold that specific salt. The *policy hash* is the SHA-256 of the plaintext consent policy that the subject was shown; the plaintext itself is retained by the controller in their own off-chain systems.

**We do not claim the on-chain inscription is non-personal data.** This is the central correction in this revision. EDPB Guidelines 02/2025 are explicit that hashed and encrypted data remain personal data — hashing is pseudonymisation, not anonymisation. For as long as the controller holds the salt and the off-chain mapping, the on-chain pseudonym is *additional-information-linkable* and is therefore **pseudonymous personal data** within the meaning of Article 4(1) and (5), read with Recital 26 and the CJEU's indirect-identifiability case law (notably C-582/14, *Breyer*). The honest characterisation is: the on-chain commitment is personal data held by the controller, minimised so that no plaintext personal data is exposed on the public ledger, but not anonymous.

The load-bearing element of the GDPR-compatibility argument is therefore **not** a definitional claim about the hash; it is an operation — **crypto-shredding** — performed at the moment of erasure. Because the salt is the *only* secret that binds the pseudonym to a real subject, destroying the salt (together with the off-chain plaintext) is a one-way operation that leaves the on-chain commitment in place but renders it non-re-identifiable by the controller and, a fortiori, by any third party. After crypto-shredding, re-identification would require inverting SHA-256 over a 256-bit random salt — i.e. it is not "reasonably likely" within the meaning of Recital 26. At that point the on-chain commitment has transitioned from pseudonymous personal data to data that is, for all parties with access to it, effectively anonymous. This is *anonymisation-on-erasure*, and it is precisely the class of technique (rendering data inaccessible by destroying the key material) that Guidelines 02/2025 point to for reconciling immutability with the right to erasure.

The reference implementation makes this concrete (Section 5): the controller generates the random salt server-side at issuance (`/api/consent/request`), stores it in an off-chain salt store keyed by the pseudonym, and exposes an erasure endpoint (`/api/consent/erase`) that destroys it. Before erasure the controller can demonstrate the binding; after erasure it provably cannot.

### 4.2 Commitment 2 — The data subject holds the token

Each granted consent is materialised as a non-fungible token issued *directly into the data subject's own wallet*, not into the controller's. The 1Sat Ordinal format treats a single satoshi as the bearer of a unique inscription; the satoshi is held at an output controlled by the subject's wallet keys; the inscription metadata travels with it.

This is the *inversion of custody*. The subject — not the controller — is the custodian of the live record of what they have consented to and with whom. The subject can enumerate their consent surface area by enumerating the consent tokens in their own wallet. The subject can present the bundle of tokens to a third party (a regulator, a successor controller in a merger, an auditor) without going through any current controller. The subject can — in principle, subject to further engineering on cross-wallet portability — port the bundle between wallet providers without loss.

The custody inversion is what fundamentally addresses the withdrawal-asymmetry problem. When the subject holds the token, the act of withdrawing consent is technically symmetric with the act of granting it: both are signed transactions originating from the same wallet, observable on the same chain, mediated by the same UX. The asymmetry of incentives between the controller (who wants retention) and the subject (who wants control) is removed from the technical layer entirely; the controller can no longer make withdrawal harder than granting because the controller does not control the path.

### 4.3 Commitment 3 — Withdrawal is a signed on-chain event

A subject withdraws consent by signing and broadcasting an on-chain revocation transaction. In the reference implementation, the revocation has two components: a *revocation inscription* (a public, chain-observable JSON object) that names the original token outpoint and the revocation timestamp; and a *redeem* of the original token, which spends it out of the subject's live consent basket. The revocation inscription serves the public-record function; the redeem clears the local state.

The revocation transaction is a signed, time-stamped, on-chain fact. It is observable by the original controller, by any successor or recipient of the data, and by supervisory authorities. There is no further action required of the controller for the revocation to take effect; the controller's only obligation is to monitor the chain (directly, through an overlay indexer, or via subject notification) and to honour the revocation in their own processing systems. The controller's compliance posture under Article 7(3) is reinforced by the very fact that the revocation record exists independently of them.

**The relationship between withdrawal and erasure — a deliberate design choice.** Withdrawal of consent (Article 7(3)) and erasure (Article 17) are distinct rights, and the architecture keeps them as distinct events rather than conflating them. An on-chain revocation is a *withdrawal signal*: it stops the lawful basis for future processing and is the publicly-verifiable record that consent was withdrawn. It does not, by itself, anonymise the original on-chain commitment — and, consistent with the EDPB's position, a revocation flag alone neither deletes nor irreversibly anonymises that commitment. Erasure of the commitment is the separate crypto-shredding operation of Section 4.1. The two are deliberately decoupled because not every withdrawal entails erasure: a controller may have a residual retention obligation (for example, retaining proof that consent existed and was later withdrawn, to discharge its own Article 7(1) accountability for the period the processing was lawful). However, where consent was the *sole* lawful basis, **Article 17(1)(b) makes withdrawal a trigger for erasure**, and the architecture supports exactly this: a withdrawal can be coupled to a crypto-shred so that revoking consent also destroys the salt and renders the on-chain commitment anonymous. The reference implementation demonstrates both paths — revocation alone, and revocation followed by crypto-shredding (Section 5.4, 5.8) — leaving the choice of coupling to the controller's lawful-basis and retention analysis rather than hard-wiring it. Whether withdrawal *must* trigger erasure in a given deployment is a controller-specific legal determination flagged for the DPIA.

### 4.4 Audit flow

Audit, in this architecture, is replay. The party performing the audit — typically a data controller responding to a supervisory authority inquiry, or a supervisory authority directly — proceeds as follows:

1. The subject supplies a *proof bundle*: a list of `(outpoint, claimed-inscription)` pairs covering the consents at issue.
2. The auditor checks each outpoint against the chain: the transaction must exist, the inscription bytes must match the claimed-inscription, and the spent-state of the output is read off.
3. The auditor partitions the result into *live* (output exists and is unspent), *revoked* (output exists and is spent, with the spending transaction identifying when), and *missing* (output does not exist on the chain — which indicates an unbroadcast or falsified claim).
4. For each *live* consent, the auditor cross-checks the on-chain policy hash against the off-chain plaintext policy still held by the original controller. If the hashes match, the consent is verifiably bound to a specific policy text. If the controller has subsequently erased the plaintext under Article 17, the audit can confirm "a consent existed at time T against a policy with hash H" but cannot reconstruct H.

The reference implementation provides an HTTP audit endpoint (`POST /api/consent/audit`) implementing steps 2 and 3 above against the WhatsOnChain block-explorer API. The v0 endpoint trusts the caller-supplied inscription bundle for the metadata content; a production implementation would parse inscription bytes directly from each transaction, eliminating that trust requirement.

### 4.5 GDPR compatibility analysis

Seven GDPR provisions deserve direct analysis against the proposed architecture. Each is read against EDPB Guidelines 02/2025.

**Article 5(1)(c) — minimization.** The on-chain inscription is the minimum information necessary to discharge the controller's burden of proof under Article 7(1): the existence of the consent, the controller and pseudonymous subject, the purposes, the policy hash, the timestamps. No plaintext personal data is on the chain. The minimization principle is satisfied at the on-chain layer; the off-chain plaintext retained by the controller is subject to the same minimization requirements as in any standard architecture. We do *not* rely on the pseudonym being non-personal — only on it being the minimum commitment needed, and on the plaintext being off-chain.

**Article 5(1)(e) — storage limitation.** This is the provision the earlier draft overlooked, and it is in genuine tension with an immutable ledger: storage limitation requires that data be kept in identifiable form no longer than necessary, whereas an on-chain commitment is, by design, permanent. Our answer is again crypto-shredding: the *identifiable* form of the on-chain identifier exists only while the off-chain salt exists. When the retention purpose ends — consent withdrawn, scope expired, or an Article 17 request honoured — destroying the salt ends the *identifiable* lifetime of the on-chain identifier even though the bytes persist. Storage limitation is satisfied with respect to identifiability, not with respect to the immutable record itself. Whether a supervisory authority accepts "the bytes persist but are no longer identifiable" as satisfying Article 5(1)(e) is a live question and is flagged for the partner analysis and the DPIA.

**Article 7(1) — burden of proof.** The controller can demonstrate consent by exhibiting (i) the on-chain inscription, which is independently verifiable, (ii) the off-chain plaintext policy whose hash matches the on-chain commitment, and (iii) the controller's internal mapping from the on-chain pseudonym to the real subject (under the controller's own access controls). This evidence chain is materially stronger than the current state-of-the-practice CRM-log evidence because each link is independently verifiable by the audit counterparty. Note the deliberate asymmetry with Article 17: the same salt that enables this demonstration is what is destroyed on erasure, after which the controller can no longer demonstrate the binding — which is the correct outcome, because after erasure there is no longer a person to demonstrate consent *about*.

**Article 7(3) — right to withdraw.** Withdrawal is technically symmetric with grant by construction (Commitment 2): both are a signed action from the same wallet. We should be candid, however, about what "as easy" means in practice. EDPB Guidelines 05/2020 frame the test against a single click/swipe/keystroke. Signing and broadcasting a blockchain transaction is *architecturally* symmetric with granting (the grant is also a signed transaction), but it is not self-evidently *as easy* as un-checking a box, and it carries a (small) network fee and a confirmation latency that a click does not. The honest position is: this architecture makes withdrawal symmetric *with how consent was granted in this system*, and removes the controller's incentive and ability to make withdrawal harder than grant — which is the mischief Article 7(3) targets — but it does not by itself make withdrawal as frictionless as a one-click banner, and a production deployment must invest in wallet UX (Section 7.3) to close that gap. We do not claim Article 7(3) is fully discharged by the cryptography alone.

**Article 13/14 — transparency.** The subject can enumerate their consent surface area directly from their own wallet. The transparency obligations are discharged at the subject-side layer in addition to the controller-side privacy-notice layer.

**Article 17 — right to erasure.** This is the provision the architecture must satisfy most carefully, because the earlier draft's answer ("the on-chain record is not personal data, so Article 17 does not reach it") is withdrawn. Under the EDPB's position the on-chain pseudonym *is* personal data while the salt exists, so Article 17 *does* reach it. The architecture honours Article 17 by crypto-shredding: on a valid erasure request the controller destroys (i) the off-chain plaintext and (ii) the salt that binds the pseudonym to the subject. The on-chain bytes are not (and cannot be) deleted, but after the salt is destroyed they are no longer personal data in the hands of any party, which is the substantive result Article 17 seeks. This is an *anonymisation-equivalent* discharge of the erasure right, of exactly the kind Guidelines 02/2025 contemplate. Its sufficiency turns on whether destroying the salt makes re-identification no longer "reasonably likely" (Recital 26) — we argue it does, over a 256-bit random salt — and that argument is the heart of the legal analysis the partner paper must defend.

**Article 22 — automated decision-making.** The on-chain consent/revocation state is intended to be machine-readable, and a natural deployment is for controllers (or smart-contract / overlay logic) to gate processing automatically on that state. Where revocation automatically and without human involvement switches off a processing activity, that is benign — it is the subject's own decision being enforced. Article 22 concerns become live only if the *consent-state evaluation itself* is used to take a decision producing legal or similarly significant effects on the subject (for example, automatically denying a service because a consent is absent). The architecture does not require any such use, but because it makes consent state cheaply machine-actionable it lowers the barrier to building one, so deployments must assess Article 22 (and the Article 13(2)(f)/14(2)(g) information duties) for any automated gating they layer on top. Flagged for the DPIA.

### 4.6 Controller and processor roles in a decentralised setting · [PARTNER WORKSTREAM]

EDPB Guidelines 02/2025 dedicate sustained attention to who is controller and who is processor when personal data is processed through a blockchain, and a partner paper cannot leave this undefined. We set out the architecture's intended allocation; pinning it down against the Guidelines' reasoning is a primary task for the co-author.

- **The data controller is the issuing entity** (the "controller" in GDPR terms and in our schema's `controller` field): the organisation that determines the purposes of the consent processing, holds the off-chain plaintext and the salt, and is the addressee of data-subject rights. This is unchanged from a conventional architecture; the blockchain does not diffuse this controllership.
- **The data subject** operates their own wallet and holds the token. Their self-directed actions over their own personal data (enumerating, presenting, revoking) are a household/own-data activity, not third-party controllership.
- **BSV Association's role is non-controller.** BSVA stewards the network and (in this proposal) may sponsor a metadata standard; it does not determine the purposes or means of any particular controller's processing and is neither controller nor processor of the consent data. This must be stated cleanly and defended.
- **The status of nodes / miners is the hard question.** Transaction processors on a public permissionless network receive and replicate the on-chain bytes. Because those bytes carry, at most, pseudonymous personal data (a salted hash) and no plaintext, our working position is that node operators are not controllers of the *consent relationship* and act, if anything, as processors performing a purely technical relaying function on instructions encoded in the protocol — but the EDPB's treatment of permissionless-network participants (including the possibility of joint controllership among participants) is unsettled and is exactly where the partner's expertise is needed. This is the single most important undefended question in the v0 draft.

### 4.7 Network model: the necessity and proportionality of a public permissionless ledger · [PARTNER WORKSTREAM]

Guidelines 02/2025 express a preference for private/permissioned networks where personal data is processed, on the grounds that the set of participants — and thus controllers, processors, and transfer recipients — is known and governable. A public permissionless design must therefore justify itself on necessity and proportionality grounds rather than assume them. The earlier draft simply assumed public BSV; this section states the defence to be developed.

The defence rests on the observation that the architecture's *entire regulatory value* derives from properties a permissioned ledger cannot provide:

1. **Independent verifiability.** The auditability gap (Section 3.1) is closed only if a supervisory authority, a court-appointed expert, the data subject, or a journalist can verify the consent record *without* the cooperation or permission of the controller or any consortium. A permissioned ledger reintroduces a gatekeeper — the consortium that admits participants — and with it the very trust dependency the architecture exists to remove. Public verifiability is not incidental; it is the necessity.
2. **No consortium capture of the subject's record.** A data-subject-held record whose validity depends on a permissioned consortium is hostage to that consortium's membership and governance. Subject sovereignty (Section 4.2) requires a permissionless substrate.
3. **Minimised on-chain footprint.** The proportionality argument is strengthened by the fact that only pseudonymous, plaintext-free commitments touch the chain, and that crypto-shredding bounds their identifiable lifetime (Sections 4.1, 4.5). The processing of personal data on the public ledger is thus the minimum compatible with the verifiability purpose.

The honest framing for the partner paper is a necessity-and-proportionality balancing test under Article 5(1)(c) and Article 25, in which the public, permissionless property is shown to be *necessary* for the legitimate aim (independent verifiability) and the on-chain personal-data footprint *proportionate* (pseudonymous, minimised, time-bounded by crypto-shredding) — not an assertion that the EDPB's preference can be ignored.

### 4.8 International transfers (Chapter V) · [PARTNER WORKSTREAM]

A public permissionless ledger is replicated across nodes that may be located anywhere in the world. Guidelines 02/2025 flag that this global accessibility raises Chapter V international-transfer questions that a permissioned, geographically-scoped network does not: each node receiving the data could, on one reading, be a transfer to a third country. The draft must address this rather than ignore it. Two lines of argument are available and should be developed with the partner: (i) that what is replicated is pseudonymous, plaintext-free data whose identifiable lifetime is controller-bounded via crypto-shredding, materially lowering the transfer risk; and (ii) the analytically harder question of whether protocol-level replication to an open set of nodes is a "transfer" to a "controller or processor" in the Chapter V sense at all, or a *sui generis* dissemination requiring a different analysis. We do not resolve this here; we flag it as a first-order legal question for the joint paper.

### 4.9 Data protection impact assessment · [PARTNER WORKSTREAM]

Guidelines 02/2025 treat a DPIA as effectively imperative for blockchain processing of personal data, conducted before processing begins and maintained as a living document. The earlier draft had an audit *endpoint* but no DPIA; this is a gap in both the paper and the programme. A DPIA is therefore established here as **both a workstream and a paper section**, and a companion living artifact is started at `docs/dpia-v0.md`. The DPIA must, at minimum: describe the processing and its purposes; assess necessity and proportionality (Section 4.7); catalogue risks to data subjects (re-identification before shredding, salt-store compromise, cross-controller collusion, lost-wallet, node-replication exposure); and record the mitigations (per-consent random salts, crypto-shredding, off-chain plaintext, access controls on the salt store) and the residual risk. It is explicitly iterative and is expected to be revised as the controller/processor and transfer analyses (Sections 4.6, 4.8) mature.

---

## 5. Proof-of-concept case study

The reference implementation accompanying this paper is a Next.js application that exercises the three core flows end-to-end against the BSV Blockchain testnet. The full source is available at `github.com/MatiasJF/gdpr`. This section walks through the implementation in enough detail to support the architectural claims of Section 4 with concrete artefacts.

### 5.1 Stack

The application is built on Next.js 16 (App Router, TypeScript, Tailwind), with BSV Blockchain primitives provided by the `@bsv/simple` package — itself a scaffolding layer over the BSV Blockchain TypeScript SDK (`@bsv/sdk`) and the `@bsv/wallet-toolbox`. The package's `simple-mcp` Model Context Protocol server was used to generate the lower-level wallet and server-route scaffolds; the consent-specific logic was written directly against the SDK.

The wallet, both the subject's browser wallet and the controller's server wallet, is bootstrapped through `createWallet()` and `createServerWalletHandler()` respectively. DID resolution is proxied through a Next.js API route to a public BSV DID resolver. The consent inscription is published to the chain through `wallet.inscribeJSON(inscription, { basket })`, which writes the JSON metadata as a plaintext data push in the output's locking script. (A note on primitive selection: the `@bsv/simple` package also exposes a `wallet.createToken(...)` primitive whose superficial API is identical, but it encrypts the data with a wallet-derived key under `counterparty: 'self'` semantics, rendering the on-chain bytes unreadable to any party other than the minting wallet. That primitive is incompatible with the public-verifiability requirement of this architecture and is deliberately not used.)

### 5.2 Issue flow

A simulated data controller at `/request` serves a consent envelope through `POST /api/consent/request`. The endpoint accepts the controller DID, the purpose IDs, the plaintext policy, an optional scope expiry, and the subject identifier. It generates a **random per-consent salt**, computes the subject pseudonym as `sha256(subject_id || controller_id || salt)` server-side, and stores `{pseudonym → salt, subject_id}` in the controller's off-chain salt store (`lib/consent/saltStore.ts`). It returns the envelope with the plaintext SHA-256 hashed and the derived pseudonym; the plaintext is returned to the subject for review, but only the hash and the pseudonym are destined for the chain. Critically, **the salt never leaves the controller** — this is what makes it shreddable later.

The subject reviews the envelope and, on confirmation, the subject's wallet constructs the `gdpr-consent-v1` inscription using the controller-derived pseudonym and broadcasts a transaction that places a 1Sat output with the inscription metadata into the subject's `gdpr-consent-v1` token basket. The transaction ID is displayed to the subject. (In the earlier draft the pseudonym was computed *client-side against a hard-coded constant salt* — which would have been trivially recomputable by anyone and thus not even sound pseudonymisation. The move to a server-held random per-consent salt is what gives the crypto-shredding argument in Section 4.1 its teeth.)

### 5.3 List flow

The subject's consent inbox at `/` enumerates tokens in the `gdpr-consent-v1` basket through `wallet.listTokenDetails(basket)`. Each row displays the outpoint, the controller, the purposes, the issuance timestamp, and the scope expiry. The "Download proof bundle" action exports a JSON file containing the outpoints and the inscription metadata for handing to an audit counterparty.

### 5.4 Revoke flow

A single button on each consent row triggers the revocation. The wallet broadcasts a revocation inscription (`type: gdpr-consent-revocation-v1`, referencing the original outpoint with the revocation timestamp) into a dedicated revocation basket. The original consent inscription's output is *not* spent — its data is the historical record that the consent existed, which the regulator needs to be able to find years later. Live state is computed by the subject's wallet (and by any auditor) as the set of consent inscriptions minus the set of revocation inscriptions whose `ref` matches. The architecture deliberately makes both grant and revocation *additive* events on the public chain rather than mutations of a token's UTXO status — this preserves the full audit history at the cost of a slightly more involved live-state calculation.

Once a consent is revoked, the PoC surfaces an explicit, separate **"Request erasure (Art. 17(1)(b))"** action that calls the controller's crypto-shred endpoint for that consent's pseudonym. This demonstrates the withdrawal→erasure path of Section 4.3 without conflating the two: revocation is the withdrawal signal; the erasure action is the distinct step that anonymises the on-chain commitment by destroying the off-chain salt. The action is offered, not automatic, mirroring the legal reality that whether withdrawal triggers erasure depends on the controller's lawful-basis and retention analysis.

### 5.5 Audit flow

A controller audits by posting outpoints to `POST /api/consent/audit`. The endpoint queries the WhatsOnChain block-explorer API for each outpoint's transaction existence and spent-state and partitions the results into `live`, `revoked`, and `missing`. Live consents come back with the unspent confirmation; revoked consents come back with the spending transaction ID, which is itself referenceable to the revocation inscription.

### 5.6 The cookie-consent specialisation

The architecture generalises directly to cookie consent under the ePrivacy Directive (2002/58/EC, Article 5(3)), which requires consent for the storage of and access to information on a user's terminal equipment. The PoC implements a "Northgate Market" demonstration site whose landing page hosts a granular cookie-consent banner. On acceptance, the subject mints a `gdpr-consent-v1` token whose `purpose_ids` are of the form `cookies:functional`, `cookies:analytics`, `cookies:advertising` — preserving the per-purpose granularity that the ePrivacy regime and the EDPB's Article 7 jurisprudence both require. Withdrawal symmetry is realised in the same way as for the general consent case: the same wallet that minted the token can revoke it from any page of the site via a single footer action.

The cookie-consent specialisation is significant because the cookie domain is operationally the most regulated and the most subject to compliance-tooling proliferation in the EU; an architecture that handles it natively is an architecture that addresses the largest single category of consent interactions on the continent.

### 5.7 Public decoder and the verifiability argument

The PoC includes a public decoder (`/decode` in the application and `GET /api/decode` programmatically) that takes only a transaction ID and a network identifier as input. It fetches the raw transaction from the public chain via WhatsOnChain, parses the locking scripts of the transaction's outputs, and identifies any `gdpr-consent-*` inscription bytes through a tolerant data-push scanner. The decoder renders the inscription's full JSON metadata, the inferred state of the output (live, revoked, or unknown), and the on-chain references — all without requiring access to any wallet, any controller-side database, or any privileged credential.

This is the operational instantiation of the Section 4.4 audit argument and of the broader public-verifiability claim. The architecture's regulatory force depends on the proposition that anyone — supervisory authority, court-appointed expert, journalist, the data subject themselves — can independently inspect the on-chain commitment. The decoder makes that proposition concrete: any reader of this paper with an internet connection and a transaction ID can reproduce the audit. The asymmetry that defines the current state of the practice, in which only the controller can produce or verify their own consent records, is dissolved by the existence of a tool that any party can run.

### 5.8 Erasure and crypto-shredding

The PoC implements the Section 4.1 / 4.5 erasure argument directly, so that the legal claim is demonstrable rather than merely asserted. The controller-side salt store is exposed at `/erasure`, which lists each consent the controller holds salt for and shows, per record, whether it is still *linkable to subject* or *anonymous (salt destroyed)*. The "Crypto-shred salt" action calls `POST /api/consent/erase`, which destroys the salt and the plaintext subject link for that pseudonym and returns the before/after re-identifiability state. The on-chain token is deliberately left untouched — a reviewer can confirm via the `/decode` tool that the inscription still exists on the chain after shredding, while the `/erasure` view shows that the controller can no longer link it to a person. This is the operational instantiation of anonymisation-on-erasure: the immutable record persists, but its identifiability does not survive the destruction of the off-chain salt.

### 5.9 Status and open work

At the time of this draft, the PoC supports the issue, list, revoke, audit, decode, and **crypto-shred** flows end-to-end against the BSV Blockchain testnet. Open items, tracked in the repository README, include: strict inscription-envelope parsing in the audit endpoint (the v0 decoder uses a tolerant data-push scanner sufficient for the PoC; production should parse the envelope structure directly); point-in-time audit (block-height-resolved state at past timestamps); BEEF-formatted proof bundles for offline / portable audits; hardening the salt store into an access-controlled, KMS/HSM-backed key store (the PoC uses a file-backed store under the OS temp directory); and a draft Bitcoin Request for Comments (BRC) standardising the consent-token metadata format.

---

## 6. Policy recommendations

The architecture described in Section 4 is technically feasible today; what would unlock its adoption is policy clarity from European supervisory authorities and standards bodies on three specific points.

### 6.1 Recognition of on-chain commitments as Article 7(1) evidence

We recommend that supervisory authorities, in the context of Article 7(1) enforcement, explicitly recognise an on-chain inscription bound to a verified off-chain policy plaintext as admissible — and indeed preferred — evidence of consent. This is consistent with the existing accountability framework in Article 5(2) and the burden-of-proof allocation in Article 7(1); it does not require any new regulatory instrument; and it materially strengthens the supervisory authority's ability to audit.

### 6.2 Recognition of subject-held records as transparency-obligation implementation

We recommend that the EDPB clarify, through an addendum to Guidelines 05/2020 or a separate guidelines document, that a subject-held cryptographic record of consent transactions — enumerated through a wallet under the subject's sole control — is a valid implementation of the transparency obligations under Articles 13 and 14, complementary to the controller-side privacy-notice obligation. This recognition would create a clear regulatory path for the architecture proposed here and for related subject-sovereignty designs.

### 6.3 Standardisation of the consent-token metadata format

We recommend that a standards-track Bitcoin Request for Comments (BRC) be developed, in collaboration with European standards bodies, specifying the consent-token metadata format at a level of precision suitable for cross-implementation interoperability. The v1 format described in Section 4.1 is a starting point; a production standard should additionally specify: a controlled vocabulary for purpose identifiers (or a registration mechanism for ad-hoc identifiers); the canonicalisation algorithm for plaintext-policy hashing; the binding between the on-chain DID and the off-chain controller legal entity; and the cross-jurisdictional considerations for multi-region controllers. The BRC track is the appropriate venue because the format is intrinsically BSV Blockchain-specific; harmonisation with non-BSV blockchain standards can follow.

### 6.4 Recognition of crypto-shredding as an erasure-equivalent measure

We recommend that the EDPB clarify — consistent with the direction of Guidelines 02/2025 — that the irreversible destruction of off-chain key material that binds an on-chain pseudonymous identifier to a data subject (crypto-shredding) is, where the residual re-identification risk is no longer reasonably likely, a valid means of discharging the Article 17 right to erasure and the Article 5(1)(e) storage-limitation obligation with respect to immutable on-chain identifiers. This recognition would resolve the single largest source of legal uncertainty for GDPR-compliant blockchain architectures generally, well beyond the consent use case, and is the recommendation on which this architecture most depends.

---

## 7. Limitations and open questions

The architecture proposed here is a substantial improvement on the current state of the practice but it is not a finished product. The following limitations and open questions are explicit.

### 7.1 Is the token itself personal data, and is crypto-shredding sufficient?

This revision takes the position — following EDPB Guidelines 02/2025 and the CJEU's indirect-identifiability case law (C-582/14, *Breyer*) — that the on-chain inscription **is** personal data for as long as the controller holds the salt that links it to a subject. We no longer argue it is non-personal. The architecture's compliance therefore does not rest on a definitional escape; it rests on the claim that **crypto-shredding produces effective anonymisation at the point of erasure**.

That claim has its own open edges, which the partner paper must engage honestly:

- **Is destroying the salt "anonymisation" in the EDPB's sense?** The Article 29 Working Party's Opinion 05/2014 on anonymisation, and the EDPB's more recent posture, assess anonymisation against the residual risk of singling-out, linkability, and inference. Our argument is that destroying a 256-bit random per-consent salt makes re-identification not "reasonably likely" (Recital 26), because recomputing the pseudonym would require either inverting SHA-256 or brute-forcing the salt. This is a strong argument but not a settled one, and it must be made against the specific anonymisation criteria rather than asserted.
- **Residual linkability the salt does not touch.** Even after shredding, the on-chain *pattern* — timestamps, the controller DID, purpose IDs, the revocation graph — persists and could in principle contribute to singling-out or inference in combination with other data. The DPIA must assess whether the surviving non-salt fields carry residual re-identification risk.
- **The subject's own retained linkability.** The data subject can always recompute their own relationship to their own records; this is not a GDPR concern (it is their own data), but the analysis should state it explicitly so it is not mistaken for a flaw.
- **Operational integrity of the shred.** The argument assumes the salt is genuinely and irrecoverably destroyed — no backups, no replicas, no KMS soft-delete. This is an organisational-measures question (Article 32) that the DPIA and any audit must verify, not assume.

The honest summary: the architecture converts an unanswerable problem ("delete data from an immutable ledger") into a tractable one ("destroy an off-chain key"), but the sufficiency of that conversion as GDPR-grade anonymisation is the central legal question on which the paper stands or falls, and it requires definitive engagement with — ideally, eventual guidance from — the EDPB.

### 7.2 Pseudonym re-identification risk across controllers

The pseudonym construction `sha256(subject_id || controller_id || salt)` now uses a **random per-consent salt held off-chain by the controller**, which differs across controllers and across consents. Two controllers cooperating with knowledge of *both* their salts and the subject identifier could still collude to re-identify a single subject across their on-chain records, but the random-salt construction removes the trivial cross-correlation that a shared or constant salt would permit, and a salt that one controller has crypto-shredded can no longer participate in any such collusion. Stronger mitigation is available via zero-knowledge constructions that allow a controller to verify the binding without holding a re-identifying salt at all; this is the recommended path for a production system and would also tighten the anonymisation argument in Section 7.1.

### 7.3 Wallet UX for non-technical subjects

A precondition for the architecture's adoption is that operating a BSV Blockchain wallet must be no harder, for a typical European internet user, than maintaining a password manager or a banking app. The current state of wallet UX in the BSV ecosystem is improving but is not yet at this level. Mainstream adoption requires custodial-or-hybrid wallet options with the same security profile as consumer banking — a non-trivial engineering and product programme. We do not consider this a refutation of the architecture; we consider it a precondition for deployment that is being worked on in parallel.

### 7.4 Lost-wallet recovery

If a subject loses access to their wallet, they lose access to the live state of their consents. The on-chain record remains, but the subject can no longer revoke. This is a real risk and any production deployment must include a recovery mechanism — most plausibly a guardian-based or multi-signature recovery scheme — that does not compromise the custody-inversion property described in 4.2.

### 7.5 Cross-jurisdictional considerations

GDPR is the focus of this paper; non-EU jurisdictions with their own consent regimes (CCPA/CPRA, LGPD, PIPL) impose related but non-identical requirements. The architecture is in principle adaptable to these regimes — the metadata schema is extensible and the custody model is jurisdiction-neutral — but the per-jurisdiction analysis is outside the scope of this draft.

---

## 8. Conclusion

The current architecture of consent management under the GDPR — private records held by the party that benefits from the processing — is at the root of recurring failures across three regulatory dimensions: auditability, withdrawal symmetry, and subject-facing portability and transparency. These failures are structural, not the consequence of any individual implementation's quality, and they will not be remedied by better engineering within the current architectural envelope.

The architecture proposed here — off-chain personal data, on-chain commitments, data-subject-held tokens, signed on-chain revocations, and crypto-shredding on erasure — moves the custody of the live consent record from the controller to the data subject and makes the surrounding events publicly verifiable on the BSV Blockchain. The shift is consistent with the GDPR's accountability framework and its burden-of-proof allocation. We do not claim the on-chain commitment is non-personal data; following EDPB Guidelines 02/2025 we treat it as pseudonymous personal data and address the Article 5(1)(c), Article 5(1)(e), and Article 17 tensions through anonymisation-on-erasure — destroying the off-chain salt so the immutable commitment is no longer re-identifiable. The remaining first-order legal questions — controller/processor allocation in a permissionless setting, the necessity/proportionality of a public ledger, Chapter V transfers, and the DPIA — are framed here and reserved as the substantive contribution of the research co-author.

A working reference implementation accompanies this paper. The remaining work is policy clarification by European supervisory authorities on the questions identified in Sections 6 and 7, standardisation through the Bitcoin Request for Comments process, and the engineering of mainstream-grade wallet UX. Each of these is tractable. None is blocked on a technical impossibility. The architecture is ready to be discussed seriously as a candidate for the next generation of consent infrastructure under European data-protection law.

---

*End of draft v0.*
