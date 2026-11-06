# rotas-novas proofs

**HEAD**: 045ea72
**Tree**: dirty - test/fixtures/v1-parameters.json, test/fixtures/v2-parameters-1.2.0.json
**Shell**: /bin/sh
**Result**: 39 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✔ payment option getMany chama GET /payment_providers/options` | pass |
| C2 | `run unit / ✔ a descrição de payment option cita o escopo read_payments` | pass |
| C3 | `run unit / ✔ businessRule getPaymentOptions segue em /payment_providers/options` | pass |
| C4 | `run unit / ✔ os 13 eventos novos estão em NUVEMSHOP_WEBHOOK_EVENTS` | pass |
| C5 | `run unit / ✔ a lista tem 57 eventos únicos em ordem alfabética` | pass |
| C6 | `run unit / ✔ o trigger mostra os 57 eventos no dropdown` | pass |
| C7 | `run unit / ✔ webhook create envia checkout/updated` | pass |
| C8 | `run unit / ✔ eventos de privacidade seguem na lista e como só do Portal` | pass |
| C9 | `run unit / ✔ priceTable expõe as 17 operações com método e caminho` | pass |
| C10 | `run unit / ✔ priceTable create envia o corpo da tabela` | pass |
| C11 | `run unit / ✔ priceTable addCustomers envia o array de clientes` | pass |
| C12 | `run unit / ✔ paginação usa per_page 10, 50 e 200 conforme a operação` | pass |
| C12 | `run unit / ✔ paginação sem Return All respeita o limite e o per_page da operação em cada página` | pass |
| C13 | `run unit / ✔ priceTable usa Resource Locator na v2 e texto na v1` | pass |
| C14 | `run unit / ✔ listSearch de tabelas de preço pede uma página de 10 e devolve o token` | pass |
| C15 | `run unit / ✔ addCustomers com 409 lança NodeApiError` | pass |
| C15 | `run unit / ✔ addCustomers com 409 preserva o corpo com os clientes em conflito` | pass |
| C16 | `run unit / ✔ priceTable deleteVariant chama o DELETE da variante` | pass |
| C30 | `run unit / ✔ create e update de priceTable exigem name e default_discount antes de pedir à API` | pass |
| C31 | `run unit / ✔ listSearch de tabelas de preço filtra o nome por contém, sem acento nem caixa` | pass |
| C17 | `run unit / ✔ as duas remoções têm método, caminho e confirmação desligada` | pass |
| C18 | `run unit / ✔ remoção com confirmação desligada falha sem requisição` | pass |
| C19 | `run unit / ✔ deleteIntegration envia events na query` | pass |
| C20 | `run unit / ✔ deleteIntegration sem events falha antes da requisição` | pass |
| C20 | `run unit / ✔ deleteIntegration com events só de vírgulas e espaços falha antes da requisição` | pass |
| C32 | `run unit / ✔ só o booleano verdadeiro libera a remoção em massa` | pass |
| C21 | `run unit / ✔ deleteAllPromotions ligada envia DELETE /promotions sem corpo` | pass |
| C22 | `run unit / ✔ order create envia inventory_behaviour claim` | pass |
| C23 | `run unit / ✔ a descrição de order create explica o claim e o 422` | pass |
| C24 | `run unit / ✔ fulfillment order update oferece e envia IN_PREPARATION` | pass |
| C25 | `run unit / ✔ v1: todo parâmetro da 1.1.3 mantém name e type` | pass |
| C25 | `run unit / ✔ v2: todo parâmetro da 1.2.0 mantém name e type` | pass |
| C26 | `run unit / ✔ a versão é 1.3.0 e o CHANGELOG registra as rotas novas` | pass |
| C27 | `run unit / ✔ o README documenta Price Table, as remoções e a Tool de IA` | pass |
| C28 | `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD / tar -x -C /tmp/ns-lint && ln -s "$PWD/node_mod` | pass |
| C29 | `run unit / ✔ o node continua usableAsTool e inclui priceTable` | pass |
| Build | `npm run build --silent` | pass |
| Build | `npx tsc --noEmit` | pass |
| Build | `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD / tar -x -C /tmp/ns-lint && ln -s "$PWD/node_mod` | pass |

## Output

`Run unit` - exit 0

```
  ✔ preserves non-empty legacy array bodies and rejects the wrong body shape (0.418532ms)
  ✔ rejects an empty required body before making the API request (0.317661ms)
✔ Nuvem Shop guided request fields (6.375019ms)
▶ Nuvem Shop dynamic selectors
  ✔ does not request variants while the parent product is an unresolved expression (0.270119ms)
  ✔ adds IDs to dynamic option labels so duplicate names stay distinguishable (0.468815ms)
✔ Nuvem Shop dynamic selectors (0.883627ms)
ℹ tests 110
ℹ suites 22
ℹ pass 110
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5417.382848
```

`rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD / tar -x -C /tmp/ns-lint && ln -s "$PWD/node_mod` - exit 0

```
┌   n8n-node lint  v0.55.5
```
