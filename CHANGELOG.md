# Changelog

All notable changes to this project are documented here.

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
