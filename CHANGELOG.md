# Changelog

All notable changes to this project are documented here.

## 1.3.0 - 2026-11-06

- Added the Price Table resource with 17 operations: price tables, category and variant exceptions, customers, approval, and the price tables of a customer. The table and the customer are searchable lists in node version 2.
- Added 13 webhook events to the Trigger and to Webhook > Create: `app_subscription/updated`, `charge/created`, `charge/failed`, `charge/paid`, `checkout/created`, `checkout/updated`, `coupon/deleted`, `fulfillment_order/label_created`, `fulfillment_order/label_deleted`, `navigation/updated`, `order/in_fraud_analysis`, `order/in_preparation`, and `theme/updated`.
- Added Discount > Delete All Promotions and Business Rule > Delete Integration. Each one has a confirmation switch that is off by default and fails before any request when it is off.
- Added the `inventory_behaviour` field (`bypass` or `claim`) to Order > Create and documented the 422 stock error.
- Added the `IN_PREPARATION` status to Fulfillment Order > Update.
- Fixed Payment Option > Get Many, which called `/payment-options`; it now calls `/payment_providers/options` (scope `read_payments`).
- Limited `per_page` to what each Price Table route accepts (10 or 50) through a per-operation page size.

## 1.2.0 - 2026-11-06

- Added node version 2 (`version: [1, 2]`, default 2). Saved workflows keep node version 1 with the same parameters.
- Turned the product, category, order, customer, and coupon IDs into searchable, paginated Resource Locator fields (From List and By ID) in node version 2.
- Replaced the first-200-rows dropdown limit with a list that loads one page per request and keeps going while scrolling.
- Turned the created/updated date filters and the coupon date filters into date pickers validated as ISO 8601 in node version 2.
- Turned the product variant Values JSON into language and text rows in node version 2.
- Added an explicit 30 second timeout to every API request.
- Migrated to `@n8n/node-cli` 0.55.5 and `n8n-workflow` ^2.46.5, fixed the codex category, and removed the unused lint directive from the trigger.
- Switched the publish workflow to `npm stage publish` with provenance, so each version waits for the owner's approval.
- Completed the README and added the funding link.

## 1.1.2 - 2026-07-13

- Replaced the abandoned-checkout coupon JSON input with a required Coupon Name-or-ID selector.
- Loaded existing store coupons dynamically and converted the selected ID to the numeric API value.
- Removed unnecessary Additional Fields and Advanced Body JSON from this single-field operation.

## 1.1.1 - 2026-07-13

- Fixed the n8n node creator incorrectly opening only Nuvem Shop Trigger after a trigger node.
- Restored all 198 regular Nuvem Shop actions while preserving automatic AI Tool support.
- Added a metadata regression test for regular-action and AI Tool compatibility.

## 1.1.0 - 2026-07-13

- Added guided, typed body fields and common query filters while preserving Advanced JSON compatibility.
- Added explicit required-field guidance and final request-body validation for clearer local errors.
- Added selectable content language for multilingual guided fields in Nuvemshop and Tiendanube stores.
- Connected dynamic Name-or-ID selectors for products, variants, categories, locations, and webhooks.
- Changed resource defaults to prefer safe read operations over mutations.
- Improved dropdown labels with record IDs and protected dependent variant loaders from unresolved expressions.
- Reworked the README in pt-BR with onboarding, examples, AI Tool setup, Trigger guidance, troubleshooting, compatibility, and support.
- Expanded schema, legacy compatibility, guided input, loader, documentation, and security tests.

## 1.0.0 - 2026-07-10

- Initial release of the complete Nuvem Shop action node.
- Added stable 2025-03, legacy v1, partner-action, and authorization support.
- Added AI Agent tool compatibility with detailed operation and parameter descriptions.
- Added automatic and Partner Portal webhook trigger support with HMAC validation.
- Added pagination, multipart uploads, binary response support, custom API calls, tests, CI, and npm provenance publishing.
