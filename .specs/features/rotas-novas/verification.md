# Rotas novas verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at HEAD (ver a linha HEAD do proofs.md)
**Verifier**: independent sub-agent (author != verifier)

O `HEAD` atual é 3b4a8bb. Entre 71aba40 e 3b4a8bb só mudaram `checks.md` e `proofs.md`, então o código provado é o mesmo.

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `rotasNovasS1.test.cjs` `payment option getMany chama GET /payment_providers/options` | yes - assere método, URL exata e que não é `/payment-options`; não toca em 401/403 (ver F7) |
| C2 | `rotasNovasS1.test.cjs` `a descrição de payment option cita o escopo read_payments` | yes |
| C3 | `rotasNovasS1.test.cjs` `businessRule getPaymentOptions segue em /payment_providers/options` | yes |
| C4 | `rotasNovasS2.test.cjs` `os 13 eventos novos estão em NUVEMSHOP_WEBHOOK_EVENTS` | yes - os 13 nomes literais; o total 57 do C5 fecha o "exatamente" |
| C5 | `rotasNovasS2.test.cjs` `a lista tem 57 eventos únicos em ordem alfabética` | yes |
| C6 | `rotasNovasS2.test.cjs` `o trigger mostra os 57 eventos no dropdown` | yes |
| C7 | `rotasNovasS2.test.cjs` `webhook create envia checkout/updated` | yes - o dropdown do Webhook > Create também tem 57 opções (conferido na sonda) |
| C8 | `rotasNovasS2.test.cjs` `eventos de privacidade seguem na lista e como só do Portal` | yes |
| C9 | `rotasNovasS3.test.cjs` `priceTable expõe as 17 operações com método e caminho` | yes - 17 operações, método e caminho exatos; conferi os caminhos contra a doc |
| C10 | `rotasNovasS3.test.cjs` `priceTable create envia o corpo da tabela` | yes - `deepEqual` do corpo; só cobre `name` e `default_discount` |
| C11 | `rotasNovasS3.test.cjs` `priceTable addCustomers envia o array de clientes` | yes |
| C12 | `rotasNovasS3.test.cjs` `paginação usa per_page 10, 50 e 200 conforme a operação` | no - o responder devolve `[]`, então só a 1ª página é vista; "em toda página" e o caminho com Return All desligado não são provados (F2) |
| C13 | `rotasNovasS3.test.cjs` `priceTable usa Resource Locator na v2 e texto na v1` | yes - amostra de 3 operações (`get`, `deleteCustomer`, `getByCustomer`) com modos `list` e `id`; a sonda confirmou que todas as ocorrências de `priceTableId` e `customerId` na v2 são Resource Locator |
| C14 | `rotasNovasS3.test.cjs` `listSearch de tabelas de preço pede uma página de 10 e devolve o token` | yes - página 1 com 10 itens devolve token `"2"`; página incompleta não devolve token |
| C15 | `rotasNovasS3.test.cjs` `addCustomers com 409 lança NodeApiError` | no - assere só `error.name`; o corpo da API com os clientes em conflito não é verificado (F1) |
| C16 | `rotasNovasS3.test.cjs` `priceTable deleteVariant chama o DELETE da variante` | yes |
| C17 | `rotasNovasS4.test.cjs` `as duas remoções têm método, caminho e confirmação desligada` | yes |
| C18 | `rotasNovasS4.test.cjs` `remoção com confirmação desligada falha sem requisição` | yes - `NodeOperationError` e 0 requisições nas duas operações |
| C19 | `rotasNovasS4.test.cjs` `deleteIntegration envia events na query` | yes |
| C20 | `rotasNovasS4.test.cjs` `deleteIntegration sem events falha antes da requisição` | yes - ausente falha; vazio e só espaços também falham (sonda); `" , "` passa (F4) |
| C21 | `rotasNovasS4.test.cjs` `deleteAllPromotions ligada envia DELETE /promotions sem corpo` | yes |
| C22 | `rotasNovasS5.test.cjs` `order create envia inventory_behaviour claim` | yes - corpo e opções `bypass`/`claim` |
| C23 | `rotasNovasS5.test.cjs` `a descrição de order create explica o claim e o 422` | yes |
| C24 | `rotasNovasS5.test.cjs` `fulfillment order update oferece e envia IN_PREPARATION` | yes |
| C25 | `resourceLocator.test.cjs` `v1: todo parâmetro da 1.1.3 mantém name e type` e `rotasNovasS5.test.cjs` `v2: todo parâmetro da 1.2.0 mantém name e type` | yes - snapshots em `test/fixtures`; comparam name, type, recurso e operação |
| C26 | `rotasNovasS6.test.cjs` `a versão é 1.3.0 e o CHANGELOG registra as rotas novas` | yes |
| C27 | `rotasNovasS6.test.cjs` `o README documenta Price Table, as remoções e a Tool de IA` | no - o laço sobre `operationNames` passa com "Create", "Get", "Get Many" e "Update", que existem em qualquer parte do README (F3) |
| C28 | `n8n-node lint` (comando do proof, sem arquivo de teste) | yes - o proof é o lint em cópia de `git archive HEAD`; sai 0 |
| C29 | `rotasNovasS6.test.cjs` `o node continua usableAsTool e inclui priceTable` | yes |
| C30 | `rotasNovasS3.test.cjs` `create e update de priceTable exigem name e default_discount antes de pedir à API` | yes - check acrescentado pelo builder ao fechar F5; o Verifier não releu este teste (não há segundo Verifier) |
| C31 | `rotasNovasS3.test.cjs` `listSearch de tabelas de preço filtra o nome por contém, sem acento nem caixa` | yes - check acrescentado pelo builder ao fechar F5; o Verifier não releu este teste |
| C32 | `rotasNovasS4.test.cjs` `só o booleano verdadeiro libera a remoção em massa` | yes - check acrescentado pelo builder a partir da sonda do Verifier; o Verifier não releu este teste |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1: o C15 não prova que o erro 409 carrega o corpo com os clientes em conflito, e na sonda o `message` e o `description` do `NodeApiError` não trazem os IDs | `rotasNovasS3.test.cjs` `addCustomers com 409 lança NodeApiError` assere só `error.name === 'NodeApiError'`; na sonda com o corpo da doc (`errors: [{customers: ['123456789']}]`) `message` é "Your request is invalid or could not be processed by the service", `description` é "Request failed with status code 409", e o ID só aparece em `error.cause.response.body` | assertar o corpo (`error.cause.response.body.errors` ou o texto que o usuário vê) e decidir se o node deve pôr os IDs em conflito na `description` do erro | `7a188c7` - C15 (teste `addCustomers com 409 preserva o corpo com os clientes em conflito`); plano AC 7 passa a dizer `cause.response.body` |
| F2: o C12 só vê a primeira página e não cobre o limite com Return All desligado | o responder devolve `[]`, então há 1 requisição e `requests[0].qs.per_page` é a única leitura; sonda minha: `getMany` com `limit` 3 pede `per_page` 3 e com `limit` 25 pede 10, 10 e 5 (correto hoje, sem teste); o objeto `qs` é mutado entre páginas, então um teste de página 2 precisa copiar o `qs` no responder | responder com páginas cheias, copiar `qs` a cada requisição e assertar a sequência `[10, 10, 5]` com `limit` 25 e `[3]` com `limit` 3; incluir `getByCustomer` (10) | `7a188c7` - C12 (sequência `[10, 10, 5]`, `[3]`, `[10, 5]` e `[50, 25]`) |
| F3: o C27 passa sem a tabela das 17 operações | `operationNames('priceTable')` devolve "Create", "Get", "Get Many", "Update" etc.; `readme.includes('Create')` é verdadeiro em qualquer parte; "Tool de Agente de IA" só precisa de "Price Table" depois do último título | assertar a linha da tabela com a rota (por exemplo `Get Price Tables of a Customer` com `GET /products/price-tables/customers/{customerId}`) para as 17, ou o par nome e rota | `7a188c7` - C27 (cada uma das 17 rotas na linha do README com o nome) |
| F4: `events` com `" , "` passa em `deleteIntegration` e vai à API como `events= , ` | sonda: `NodeOperationError` para `"   "`, mas `ok requests=1 qs={"events":" , "}` para `" , "`; `assertRequiredQuery` só faz `trim()` | rejeitar valor sem nenhum evento depois de separar por vírgula e aparar (baixa gravidade: a API responde erro, nenhuma remoção em massa acontece) | `031cbd6` - C20 (`events` só de vírgulas e espaços falha antes da requisição) |
| F5: regras do diff sem nenhum check | (a) `REQUIRED_FIELDS` de `POST /products/price-tables` e `PUT .../{priceTableId}` (`name`, `default_discount`) só tem efeito comprovado pela sonda (`NodeOperationError` sem `name`); (b) o filtro "contém, sem acento" do `searchPriceTables` (sonda: "atacado" acha "Atacádo") fica só em Assumptions com `Confirmed? n`; (c) `getByCustomer` com `pageSize` 10 não é lido por teste; (d) o texto de `confirmation.description` é conferido só por `^Warning:` | acrescentar um check por regra, ou tirar a regra do diff | `7a188c7` - C30 e C31 (campos obrigatórios e filtro por contém); `getByCustomer` em C12; `Warning:` já em C17 |
| F6: `docs.test.cjs` foi afrouxado | `assert.equal(pkg.version, '1.2.0')` virou `Number(pkg.version.split('.')[1]) >= 2`; uma `2.0.0` falharia e uma `1.9.0` passaria | usar uma comparação de versão completa ou apagar o teste da versão antiga | `7a188c7` - docs.test.cjs exige a versão do pacote igual à da entrada mais nova do CHANGELOG |
| F7: a tabela Coverage atribui status HTTP a checks que não os exercitam | `401`/`403` em C1, `401` em C10 e C12, `403` em C19 e `204` em C16: nenhum desses testes simula esses status; `checks.md` admite que vêm do transporte comum | ajustar a coluna para citar o teste do transporte (`transport.test.cjs`) ou marcar "não provado por check" | `045ea72` - Coverage cita C15 para 401/403/409 e explica que o 2xx é a resposta repassada |

## Sondas próprias

- **Limite sem Return All**: `priceTable.getMany` com `limit` 3 pede uma página de `per_page` 3; com `limit` 25 pede 10, 10 e 5; `priceTable.getCustomers` com `limit` 75 pede 50 e 25; `product.getMany` com `limit` 500 pede 200, 200 e 100. Todos corretos.
- **Confirmação com valor não booleano**: `"true"`, `1`, `"false"`, ausente e `null` recusam com `NodeOperationError` e 0 requisições; só `true` libera. É o lado seguro; uma expressão n8n que devolva a string "true" também será recusada.
- **`events` da integração**: vazio, ausente e `"   "` recusam sem requisição; `"all"` envia; `" , "` envia (F4).
- **Webhook e Trigger contra a doc**: das 57 strings de `NUVEMSHOP_WEBHOOK_EVENTS`, 55 aparecem no texto de `webhook.md` 2025-03; faltam só `store/redact` e `customers/redact`, que o plano deixa fora de escopo. Toda linha da tabela de eventos da doc está na lista.
- **Price Table contra a doc**: caminho, método e corpo das 17 operações batem com `price-tables.md` (conferi corpos de `create`, `setCategories`, `setVariants`, `addCustomers`, `approveCustomers` e os três `DELETE`); limites de `per_page` 10, 50, 50, 50 e 10 e o teto de 10.000 clientes batem.
- **Rota de pagamento**: `GET /payment_providers/options` com o escopo `read_payments` bate com `payment-option.md`; a base da requisição é `https://api.nuvemshop.com.br/2025-03/<loja>`. `DELETE /promotions` usa a base sem versão, como o `deletePromotion` existente, e `DELETE /business_rules/integrations/{domain}` usa a base `2025-03`; ambos batem com `discounts.md` e `business-rules.md`.
