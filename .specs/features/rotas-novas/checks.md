# rotas-novas checks

Build: `npm run build --silent`; `npx tsc --noEmit`; `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD | tar -x -C /tmp/ns-lint && ln -s "$PWD/node_modules" /tmp/ns-lint/node_modules && cd /tmp/ns-lint && npx n8n-node lint`
Run unit: `npm run build --silent && node --test --test-reporter=spec test/*.test.cjs`
Plan: `.specs/features/rotas-novas/plan.md`

37 checks in 6 slices · 4 one-way doors · 0 open, of which 0 block

## Checks

### S1 - Payment Option aponta para a rota da doc

**C1** - `paymentOption.getMany` chama GET /payment_providers/options e nunca /payment-options (AC 1)
Proof: run unit | ✔ payment option getMany chama GET /payment_providers/options

**C2** - A descrição da operação cita o escopo `read_payments` (AC 2)
Proof: run unit | ✔ a descrição de payment option cita o escopo read_payments

**C3** - `businessRule.getPaymentOptions` continua em GET /payment_providers/options (AC 3)
Proof: run unit | ✔ businessRule getPaymentOptions segue em /payment_providers/options

### S2 - Trigger e Webhook aceitam os 13 eventos novos

**C4** - A lista contém os 13 valores novos (AC 1)
Proof: run unit | ✔ os 13 eventos novos estão em NUVEMSHOP_WEBHOOK_EVENTS

**C5** - A lista tem 57 eventos únicos em ordem alfabética (AC 2)
Proof: run unit | ✔ a lista tem 57 eventos únicos em ordem alfabética

**C6** - O dropdown do Trigger mostra os 57 valores (AC 3)
Proof: run unit | ✔ o trigger mostra os 57 eventos no dropdown

**C7** - `webhook.create` com `checkout/updated` envia POST /webhooks com esse evento (AC 4)
Proof: run unit | ✔ webhook create envia checkout/updated

**C8** - Os eventos de privacidade continuam na lista e marcados como só do Portal (AC 5)
Proof: run unit | ✔ eventos de privacidade seguem na lista e como só do Portal

### S3 - Recurso Price Table

**C9** - O recurso expõe as 17 operações com método e caminho (AC 1)
Proof: run unit | ✔ priceTable expõe as 17 operações com método e caminho

**C10** - `priceTable.create` envia POST com o corpo da tabela (AC 2)
Proof: run unit | ✔ priceTable create envia o corpo da tabela

**C11** - `priceTable.addCustomers` envia PUT com o array de clientes (AC 3)
Proof: run unit | ✔ priceTable addCustomers envia o array de clientes

**C12** - A paginação respeita `per_page` 10 nas tabelas, 50 nas sublistas e 200 nas demais (AC 4)
Proof: run unit | ✔ paginação usa per_page 10, 50 e 200 conforme a operação

**C13** - `priceTableId` e `customerId` são Resource Locator na v2 e texto na v1 (AC 5)
Proof: run unit | ✔ priceTable usa Resource Locator na v2 e texto na v1

**C14** - `listSearch.searchPriceTables` pede uma página de 10 e devolve o token (AC 6)
Proof: run unit | ✔ listSearch de tabelas de preço pede uma página de 10 e devolve o token

**C15** - Um 409 em `addCustomers` vira NodeApiError com o corpo da API (AC 7)
Proof: run unit | ✔ addCustomers com 409 lança NodeApiError

**C16** - `priceTable.deleteVariant` envia DELETE na variante (AC 8)
Proof: run unit | ✔ priceTable deleteVariant chama o DELETE da variante

### S4 - Remoções em massa com confirmação

**C17** - As duas operações têm método, caminho e booleano de confirmação com `Warning:` e padrão falso (AC 1, AC 2)
Proof: run unit | ✔ as duas remoções têm método, caminho e confirmação desligada

**C18** - Com a confirmação desligada a operação falha e não faz requisição (AC 3)
Proof: run unit | ✔ remoção com confirmação desligada falha sem requisição

**C19** - `deleteIntegration` ligada envia DELETE com `events` na query (AC 4)
Proof: run unit | ✔ deleteIntegration envia events na query

**C20** - `deleteIntegration` sem `events` falha antes da requisição (AC 5)
Proof: run unit | ✔ deleteIntegration sem events falha antes da requisição

**C21** - `deleteAllPromotions` ligada envia DELETE /promotions sem corpo (AC 6)
Proof: run unit | ✔ deleteAllPromotions ligada envia DELETE /promotions sem corpo

### S5 - Campos novos em rotas já cobertas

**C22** - `Order > Create` envia `inventory_behaviour` `claim` no corpo (AC 1)
Proof: run unit | ✔ order create envia inventory_behaviour claim

**C23** - A descrição de `Order > Create` explica o `claim` e o 422 (AC 2)
Proof: run unit | ✔ a descrição de order create explica o claim e o 422

**C24** - `Fulfillment Order > Update` oferece `IN_PREPARATION` e o envia (AC 3)
Proof: run unit | ✔ fulfillment order update oferece e envia IN_PREPARATION

**C25** - Todo parâmetro da v1 (1.1.3) e da v2 (1.2.0) mantém name e type (AC 4)
Proof: run unit | ✔ v1: todo parâmetro da 1.1.3 mantém name e type
Proof: run unit | ✔ v2: todo parâmetro da 1.2.0 mantém name e type

### S6 - Entrega da versão 1.3.0

**C26** - A versão é 1.3.0 e o CHANGELOG abre com a entrada que cita os itens (AC 1)
Proof: run unit | ✔ a versão é 1.3.0 e o CHANGELOG registra as rotas novas

**C27** - O README documenta Price Table, as remoções e a Tool de IA (AC 2)
Proof: run unit | ✔ o README documenta Price Table, as remoções e a Tool de IA

**C28** - `n8n-node lint` sai com 0 erros (AC 3)
Proof: `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD | tar -x -C /tmp/ns-lint && ln -s "$PWD/node_modules" /tmp/ns-lint/node_modules && cd /tmp/ns-lint && npx n8n-node lint`

**C29** - O recurso `priceTable` entra no node que continua `usableAsTool` (AC 4)
Proof: run unit | ✔ o node continua usableAsTool e inclui priceTable

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| eventos novos de webhook (13) | `app_subscription/updated` C4 · `charge/created` C4 · `charge/failed` C4 · `charge/paid` C4 · `checkout/created` C4 · `checkout/updated` C4 · `coupon/deleted` C4 · `fulfillment_order/label_created` C4 · `fulfillment_order/label_deleted` C4 · `navigation/updated` C4 · `order/in_fraud_analysis` C4 · `order/in_preparation` C4 · `theme/updated` C4 · dropdown C6 · `checkout/updated` C7 | - |
| eventos de privacidade (3) | `store/redact` C8 · `customers/redact` C8 · `customers/data_request` C8 | - |
| operações de `priceTable` (17) | `create` C9 · `get` C9 · `getMany` C9 · `update` C9 · `setCategories` C9 · `getCategory` C9 · `getCategories` C9 · `deleteCategory` C9 · `setVariants` C9 · `getVariant` C9 · `getVariants` C9 · `deleteVariant` C9 · `addCustomers` C9 · `approveCustomers` C9 · `getCustomers` C9 · `deleteCustomer` C9 · `getByCustomer` C9 · corpo C10, C11 · `deleteVariant` C16 · paginação C12 | - |
| tamanhos de página (3) | 10 C12 · 50 C12 · 200 C12 | - |
| parâmetros com Resource Locator (2) | `priceTableId` C13 · `customerId` C13 | - |
| operações com confirmação (2) | `deleteAllPromotions` C17, C18, C21 · `deleteIntegration` C17, C18, C19, C20 | - |
| `GET /payment_providers/options` statuses (3) | 200 C1 · 401 C1 · 403 C1 | - |
| `POST /products/price-tables` statuses (2) | 201 C10 · 401 C10 | - |
| `GET /products/price-tables` statuses (2) | 200 C12 · 401 C12 | - |
| `PUT /products/price-tables/{id}` statuses (2) | 200 C9 · 401 C9 | - |
| `/products/price-tables/{id}/categories` e `/products/price-tables/{id}/product-variants` statuses (2) | 204 C16 · 401 C16 | - |
| `/products/price-tables/{id}/customers` statuses (3) | 204 C11 · 409 C15 · 401 C15 | - |
| `DELETE /promotions` statuses (2) | 204 C21 · 401 C21 | - |
| `DELETE /business_rules/integrations/{domain}` statuses (3) | 204 C19 · 401 C19 · 403 C19 | - |
| portas de sentido único em Landing (4) | confirmação C17, C18 · pageSize C12 · nomes C9, C13 · versão C26 | - |

- Claims naming a status code, route or response shape: C1, C9, C10, C11, C15, C16, C19, C21 - each has a proof that crosses the boundary
- Os códigos 401 e 403 vêm do transporte comum (`NodeApiError` em qualquer resposta de erro), provados por C15; nenhum teste chama a API real

## Swept

- validation: C18, C20
- failure modes: C15
- idempotency: n/a - o DELETE e o PUT da Nuvemshop são idempotentes na própria API e o node não repete chamada
- authorization: existing - o transporte envia o token da credencial e devolve `NodeApiError` em 401 e 403 (teste de transporte existente)
- concurrency: n/a - o node não guarda estado entre chamadas
- data lifecycle: n/a - o node não persiste dado
- dependency failure: existing - o `timeout` de 30000 e o `NodeApiError` já têm teste em `transport.test.cjs`
- state transitions: C24
- observability: n/a - o node não tem requisito de log

## Handoff

- **Settled mid-build:** none
- **Dispatched:** Verifier (sub-agent sonnet) em HEAD 71aba40 (checks C1-C29 fechados, proofs.md verde)
- **Boundary:** C1-C29 fechados em `71aba40`
- **Abandoned:** none
- **Walked:** none
