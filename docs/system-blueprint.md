# Aneks Parcel Services — implementation boundary and platform blueprint

This repository currently contains a **browser-local operational preview**, not a production parcel service. The attached comprehensive system documentation, overall system brief, and customer-intelligence brief are the source requirements. The UI demonstrates linked workflows and exposes unresolved decisions; it must not be used for real customer information, payment collection, dispatch, or legally significant proof of delivery.

## Requirement classification

| Classification | Current understanding |
| --- | --- |
| Confirmed business requirement | Meru–Nairobi via Ishiara is the normal corridor; Chuka is conditional when a consignment needs a Chuka-highway origin, destination, or stop. Routing must remain extensible. |
| Confirmed business requirement | Customers are persistent first-class records reused for shipments; transactional sender details retain a snapshot so profile changes do not rewrite history. |
| Confirmed business requirement | Track parcels across intake, payment, sorting, transport, arrival, collection/delivery, exceptions, completion, and reconciliation with chain-of-custody history. |
| Recommended operational practice | Enforce two-person/role-specific handover and reconciliation approvals, duplicate detection, exception escalation, and periodic inventory counts. Confirm actual company policy before implementation. |
| Recommended technical capability | Server-side state-machine validation, event/audit append-only history, idempotent payment webhooks, encrypted storage, backups, and monitoring. |
| Optional/future capability | Customer self-service, booking portal, saved recipients, corporate pricing, loyalty, WhatsApp, partner APIs, and automated route optimization. |
| Regulatory review required | Kenyan data protection, tax/invoicing, consumer protection, courier/postal licensing, restricted goods, and payment processing obligations require qualified local legal review. This preview makes no legal-compliance claim. |
| Business decision requiring confirmation | Tariffs, service classes, authorized roles, branches/collection points, payment methods, verification evidence, retention periods, communications consent, returns/refunds, and exception SLAs. |

## What the current preview covers

- Responsive workspace for Overview, Parcels, Customers, Fleet & drivers, Routes & trips, Finance, Incidents, Reports, and Settings.
- Customer creation with phone duplicate warning, customer search, linked parcel history, calculated shipment count and spend.
- Shipment registration with existing-customer selection, immutable-at-registration sender name/phone snapshot, recipient, origin/destination, service, operator-entered charge, pending payment, and initial custody event.
- Browser-local fleet register with vehicle capacities, normal driver/route relationships, personnel phone actions, unavailability records, and trip-specific driver/lorry substitutions. Configurable ordered stops and corridors preserve Ishiara/Kanyuambora on the Ishiara corridor and Chuka/Chogoria on the conditional Chuka corridor. Route suggestions are **not** dispatch approvals or live routing.
- Browser-local weekly schedules, planned trips, manifest assignments/reassignments with retained prior plans, load/unload and receive events, movement history, capacity checks, and manual trip reconciliation. These events are not physical scans or signed custody records. Saturday evening Nairobi exceptions need a reason when the preview rule disallows departures.
- Parcel search/filter, limited next-state transitions, timestamped preview events, incident registration/follow-up, manual Cash/M-Pesa payment entries with references and outstanding balances, CSV export, and reporting aggregates derived from preview records. Delivery state remains separate from payment state. Payment entries are **not** provider verification or proof of settlement.
- Synthetic sample data and changes persisted in the same browser's `localStorage` only. The operational audit records actions attributed to a demo operator and can be edited or deleted by the browser user. No authentication, immutable audit, server validation, encryption, retention policy, or cross-device persistence exists. Existing browser-local records are extended with operational defaults on load; they are not migrated to an authoritative database.

## Production architecture to implement

1. **Identity and authorization:** authenticated staff accounts, branch scope, least-privilege roles (administrator, owner, branch manager, clerk, cashier, dispatcher, warehouse, driver, courier, support, finance, auditor), session controls, and server-side policy enforcement per action. Require stronger approval for voids, refunds, overrides, and manual payment confirmation.
2. **Authoritative persistence:** relational database with migrations, unique identifiers, referential integrity, branch-aware tenancy boundaries, encrypted backups, retention/deletion workflows, and restricted access to personal data. Put customer profiles in a first-class table; store immutable sender/recipient/contact snapshots on shipment transactions where legally and operationally necessary.
3. **Operational model:** customers, contacts, saved recipients, shipments, parcels, labels, pricing quotes, payments, receipts, locations, branches, storage bins, routes, route nodes, schedules, trips, vehicles, personnel, manifests, custody events, delivery attempts, proof artifacts, incidents, complaints, notifications, and audit records. Separate shipment (commercial order) from parcels (physical pieces) to support multi-piece consignments.
4. **Parcel workflow:** enforce validated state transitions on the server. Each transition records previous/next state, actor, role, timestamp, location, device where relevant, trip/vehicle if applicable, reason, and supporting evidence. Include holds, damage, tampering, missing/misrouted parcels, failed delivery, returns, cancellation, disputes, and refunds. Forbid unauthorized jumps and require proof for terminal handover states.
5. **Routing and transport:** configurable graph of routes, stops, service areas, and collection points; separate primary/conditional status from route availability. Explain assignment decisions and allow logged authorized overrides. Schedule trips, assign trained personnel/vehicles, enforce capacity, sign manifests at load/unload, record transfers and delays, and reconcile physical counts to manifest counts.
6. **Finance:** versioned tariff configuration and approved quotes; separate charge, payment attempt, settlement, receipt, adjustment, refund, and reconciliation records. Integrate Kenyan payment rails only after provider selection; verify payments server-side with idempotency and webhook signatures. Record cash custody and shift closeout approvals. Never use a client-side “mark paid” action as proof of settlement.
7. **Customer intelligence:** derive lifetime and date-range metrics from authoritative transactions; configurable definitions for new, returning, frequent, high-volume, active, inactive, and dormant. Add duplicate-review/merge workflows with audit trail, restricted notes, contact preferences/consent, recipient relationships, support timeline, and access-controlled exports.
8. **Communications:** configurable templates/triggers for intake, payment, dispatch, delay, arrival, collection/delivery, return, and incidents. Queue deliveries and record provider outcomes, retries, consent, and suppression. SMS, email, and WhatsApp require approved vendors and appropriate permission/consent.
9. **Reporting and controls:** consistent date-range reports for operations, routes, customers, delivery, incidents, staff, outstanding balances, and finance. Add reconciliation exports, sensitive-export authorization, immutable audit records, alerting, monitoring, disaster recovery, and periodic access reviews.

## Suggested delivery sequence

| Phase | Outcome | Release gate |
| --- | --- | --- |
| 0 — discovery | Confirm workflow maps, routes/stops, prices, branch roles, proof policy, legal assessment, and migration sources | Signed business rules and privacy assessment |
| 1 — secure foundation | Identity/RBAC, database/migrations, branches, customers, recipients, parcel intake, label/receipt, audit | Permission, privacy, restore, and acceptance tests |
| 2 — transport execution | Configurable routes, trip/vehicle/personnel allocation, manifests, custody scan/handover, arrivals | Capacity, transfer, incident, and reconciliation tests |
| 3 — financial and delivery | Verified payments, ledgers, cash closeout, proof of collection/delivery, exceptions/returns | Payment reconciliation and dispute evidence tests |
| 4 — intelligence and expansion | Notifications, dashboards, exports, customer intelligence, self-service readiness | Data-consistency, load, accessibility, and security tests |

## Validation required before go-live

Test normal and exception lifecycles end-to-end; reverse-direction and conditional Chuka routing; duplicate customers; profile edits versus historic snapshots; multi-parcel orders; concurrent scan/handover attempts; offline recovery; idempotent payments; under/over-capacity loading; refunds; unauthorized role access; privacy requests; communication consent; accessibility; backup restoration; and audit integrity. Define measurable uptime, latency, RPO/RTO, retention, and incident-response targets with Aneks management rather than inventing them in code.
