# n8n-nodes-nuvemshop

Complete n8n community integration for **Nuvem Shop** (Nuvemshop). It provides a regular action node, an automatically generated AI Agent tool, and a real webhook trigger for the official Nuvemshop API.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-nuvemshop.svg)](https://www.npmjs.com/package/n8n-nodes-nuvemshop)
[![CI](https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop/actions/workflows/ci.yml/badge.svg)](https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop/actions/workflows/ci.yml)

## Features

- 198 explicit operations organized into 36 intuitive resource groups.
- Complete explicit coverage of the stable `2025-03` API resources.
- Legacy `v1` order pack and fulfill operations with automatic version routing.
- Explicit unstable Order Edit support, with Custom API Call for other preview routes.
- Brazil (`api.nuvemshop.com.br`) and international (`api.tiendanube.com`) regions.
- Store access-token requests and Partner-Action requests with separate secure tokens.
- OAuth authorization-code exchange without exposing the app secret in workflow parameters.
- Controlled pagination with `Return All`, `Limit`, 200-item pages, and 2 requests/second pacing.
- JSON and multipart form-data writes, including n8n binary attachments for Blog media.
- AI Agent compatibility through `usableAsTool`, with detailed actions, prerequisites, formats, effects, and ID guidance.
- Automatic webhook registration/removal, Partner Portal privacy webhooks, store validation, and HMAC SHA-256 verification.
- Authenticated Custom API Call for preview, legacy, restricted, and future documented endpoints.
- No runtime dependencies.

## Installation

Install `n8n-nodes-nuvemshop` from **Settings > Community Nodes** in n8n.

For a self-hosted npm installation:

```bash
cd ~/.n8n
npm install n8n-nodes-nuvemshop
```

Restart n8n after installation.

## Credentials

Create a **Nuvem Shop API** credential and choose the type that matches the operation:

- **Store API** for normal merchant operations.
- **App OAuth and Partner Actions** to exchange an authorization code before a store token exists, or to manage app-scoped billing plans.
- **Store and App (Full Integration)** when the same connection needs store operations plus verified webhook signatures or Partner Actions.

| Field           | Required    | Purpose                                                            |
| --------------- | ----------- | ------------------------------------------------------------------ |
| Credential Type | Yes         | Store, app-only, or full store-and-app connection                  |
| Access Token    | Store types | Permanent merchant OAuth token sent as Bearer authentication       |
| Store ID        | Store types | OAuth `user_id`; inserted into every store-scoped URL              |
| Region          | Yes         | Brazil/Nuvemshop or international/Tienda Nube API domains          |
| API Version     | Yes         | Stable `2025-03`, legacy `v1`, or `unstable` preview               |
| User Agent      | Yes         | App name plus contact email/URL; required by the API               |
| App ID          | App types   | App identifier from the Partners portal                            |
| Client Secret   | App types   | OAuth secret, Partner-Action Bearer token, and trigger HMAC secret |

Nuvemshop's OAuth flow returns `access_token` and `user_id` after the merchant approves the app. `user_id` is the Store ID. The authorization code expires in five minutes. Use **Authorization > Exchange Code** to exchange it; the node reads App ID and Client Secret from the encrypted credential.

Official references:

- [Authentication](https://tiendanube.github.io/api-documentation/authentication)
- [Partner Actions](https://tiendanube.github.io/api-documentation/guides/authentication-for-partner-actions)
- [API introduction](https://tiendanube.github.io/api-documentation/intro)

Request only the scopes the workflow needs. Newer resources add scopes beyond the older central list, including `read_email_templates`, `write_email_templates`, `read_locations`, `write_locations`, `read_fulfillment_orders`, `write_fulfillment_orders`, `read_payments`, `write_payments`, `read_payment_options`, and `read_shipping`.

## Resource Coverage

| Resource                     | Operations                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Abandoned Checkout           | Get, Get Many, Apply Coupon                                                                                 |
| Authorization                | Exchange Authorization Code                                                                                 |
| Billing                      | Create/Update/Delete Plan, Get/Update Subscription, Create Charge                                           |
| Blog                         | Blogs, posts CRUD, publish/unpublish, media and thumbnail upload                                            |
| Business Rule                | Register callback, get payment/shipping options                                                             |
| Cart                         | Get, remove line item, remove coupon                                                                        |
| Category                     | Create, Get, Get Many, Update, Delete                                                                       |
| Category Custom Field        | Definition CRUD, owners, values                                                                             |
| Coupon                       | Create, Get, Get Many, Update, Delete                                                                       |
| Customer                     | Create, Get, Get Many, Update, Delete                                                                       |
| Customer Custom Field        | Definition CRUD, owners, values                                                                             |
| Discount                     | Callback, promotion CRUD, cart discounts                                                                    |
| Dispute                      | Create, Get, Update                                                                                         |
| Draft Order                  | Create, Get, Get Many, Confirm, Delete                                                                      |
| Email Template               | Get, Get Many, Update                                                                                       |
| Fulfillment Order            | Get/Get Many, update/delete, tracking-event CRUD, label lifecycle                                           |
| Kit                          | Get                                                                                                         |
| Location                     | CRUD, priorities, default location, inventory levels                                                        |
| Metafield                    | CRUD and owner-resource listing                                                                             |
| Order                        | Create/Get/Get Many/Update, unstable edit, cancel/close/reopen, history, subscriptions, legacy pack/fulfill |
| Order Custom Field           | Definition CRUD, owners, values                                                                             |
| Page                         | Create, Get, Get Many, Update, Delete                                                                       |
| Payment Option               | Get Many                                                                                                    |
| Payment Provider             | Create, Get, Get Many, Update, Delete                                                                       |
| Product                      | CRUD, Get by SKU, bulk stock/price update                                                                   |
| Product Custom Field         | Definition CRUD, owners, values                                                                             |
| Product Image                | Create, Get, Get Many, Update, Delete                                                                       |
| Product Variant              | CRUD, full/partial bulk update, stock update                                                                |
| Product Variant Custom Field | Definition CRUD, owners, values                                                                             |
| Script                       | Association CRUD                                                                                            |
| Shipping Carrier             | Create, Get, Get Many, Update, Delete                                                                       |
| Shipping Carrier Option      | Create, Get, Get Many, Update, Delete                                                                       |
| Fulfillment Event (Legacy)   | Legacy fulfillment event create/get/list/delete                                                             |
| Store                        | Get                                                                                                         |
| Transaction                  | Create, Get, Get Many, Create Event                                                                         |
| Webhook                      | Create, Get, Get Many, Update, Delete                                                                       |
| Custom API Call              | Authenticated GET/POST/PUT/PATCH/DELETE/HEAD with JSON, multipart, or file response                         |

The browser-only Checkout SDK is not a server REST API and cannot execute inside n8n. Its backend integrations are represented by Payment Provider, Business Rule, Discount, Script, and Custom API Call resources.

## JSON and IDs

Write bodies use the exact API `snake_case` field names. Do not include tokens, Store ID, App ID, or Client Secret; credentials supply them securely.

Multilingual values are objects:

```json
{
	"name": {
		"pt": "Camiseta",
		"es": "Remera",
		"en": "T-Shirt"
	}
}
```

IDs are not interchangeable. Product, variant, image, order, customer, category, custom-field UUID, fulfillment ULID, transaction UUID, and location ULID identify different objects. Always obtain an ID from the matching Create, Get, or Get Many operation.

For multipart Blog operations, a top-level marker attaches incoming n8n binary data:

```json
{
	"metadata": {
		"title": "Launch notes"
	},
	"content": "<p>New collection available.</p>",
	"published": true,
	"thumbnail": {
		"$binary": "data"
	}
}
```

## AI Agent Tools

The action node sets `usableAsTool: true`. Current n8n versions automatically generate the AI Tool wrapper; there is no separate Nuvem Shop Tool node.

On self-hosted n8n, enable community-node tool usage when required by your deployment:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

Recommended pattern:

1. Add one Nuvem Shop node per intended AI operation.
2. Select one precise Resource and Operation before connecting it to the AI Agent.
3. Give the tool a narrow name such as `NuvemShop_Get_Product` or `NuvemShop_Create_Draft_Order`.
4. Use `$fromAI()` only for values the model may decide, with formats and constraints in its description.
5. Keep Store ID, tokens, App ID, and Client Secret only in credentials.
6. Require human review for delete, cancel, dispute, payment, price, inventory, fulfillment, publish, and subscription changes.

Example AI expression:

```text
{{ $fromAI('product_id', 'Exact numeric product ID returned by Product Get Many; never infer from the product name', 'number') }}
```

The node descriptions tell the model which operation supplies each ID, expected JSON formats, pagination behavior, side effects, and destructive risks.

## Webhook Trigger

**Nuvem Shop Trigger** registers one webhook for each selected standard event and removes it when the workflow is deactivated. The production URL must be HTTPS; Nuvemshop rejects localhost and Nuvemshop-owned callback domains.

Supported families include app, category, customer, order, product, product variant, custom field, domain, subscription, fulfillment, fulfillment order, label, tracking event, and location events.

Privacy events are configured in the Partners portal rather than through `POST /webhooks`:

- `store/redact`
- `customers/redact`
- `customers/data_request`

Copy the trigger's production URL into the matching app setting. Signature verification uses `x-linkedstore-hmac-sha256` and the credential Client Secret. Nuvemshop can deliver events out of order or more than once; workflows must be idempotent. The trigger intentionally emits every accepted delivery.

## Pagination and Rate Limits

Nuvemshop uses one-based `page` and up to 200 `per_page`. `Return All` follows pages at a 500 ms interval to respect the default two-request-per-second leak rate. Next/Evolution stores may receive higher limits.

Order queries are capped by the API at 10,000 matches. Use narrow date ranges and incremental `updated_at_*` filters for large stores.

The API may return `429`, `402`, or `5xx` errors. Avoid blind retries for non-idempotent writes. Configure n8n node retry settings only when the operation is safe to repeat.

## Custom API Call

Use Custom API Call when Nuvemshop adds a route before this package is updated or when support enables a restricted endpoint.

- Endpoints must be relative, such as `/products`; arbitrary domains are blocked.
- Store scope uses Store ID and Access Token.
- Partner App scope uses App ID and Client Secret.
- The credential API Version controls the URL, including `unstable`.
- JSON, multipart form-data, and binary responses are supported.

## Development

Requires Node.js 24 for the repository toolchain.

```bash
npm ci
npm run lint
npm test
npm run build
npm pack --dry-run
```

Local n8n development:

```bash
npm run dev
```

## Publishing

Releases are published only by [GitHub Actions](.github/workflows/publish.yml) with npm provenance.

1. Bump `package.json` and `CHANGELOG.md`.
2. Commit the release.
3. Create a matching tag, for example `v1.0.0`.
4. Push the commit and tag.

The workflow checks that the tag matches `package.json`, then runs lint, tests, build, and `npm publish --provenance --access public`. Configure an npm granular token as the repository secret `NPM_TOKEN`, or migrate to npm Trusted Publishing after the package exists.

## License

[MIT](LICENSE.md)

Nuvemshop and its logo are trademarks of their respective owner. This community package is not an official Nuvemshop product.
