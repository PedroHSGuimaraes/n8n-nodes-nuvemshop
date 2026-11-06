# node-cli-campos-v2 proofs

**HEAD**: ad35990
**Tree**: clean
**Shell**: /bin/sh
**Result**: 41 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD / tar -x -C /tmp/ns-lint && ln -s "$PWD/node_mod` | pass |
| C1 | `run unit / ✔ NuvemShop.node.json usa uma categoria aceita pelo lint` | pass |
| C1 | `run unit / ✔ o trigger não carrega eslint-disable sem efeito` | pass |
| C2 | `run unit / ✔ package.json segue o template do node-cli 0.55.5` | pass |
| C3 | `run unit / ✔ o lock resolve n8n-workflow em 2.46.x ou mais nova` | pass |
| C3 | `npm audit --omit=dev` | pass |
| C4 | `run unit / ✔ rota de loja usa httpRequestWithAuthentication com timeout de 30000` | pass |
| C4 | `run unit / ✔ rota de parceiro (httpRequest direto) também leva timeout de 30000` | pass |
| C5 | `run unit / ✔ uma chamada que estoura o tempo vira NodeApiError` | pass |
| C6 | `run unit / ✔ o ci roda npm ci, lint, test e build em Pull Request` | pass |
| C6 | `run unit / ✔ o publish usa a mesma node-version do ci` | pass |
| C7 | `run unit / ✔ o publish envia o pacote para a fila stage com provenance` | pass |
| C8 | `npm test` | pass |
| C9 | `run unit / ✔ v1: order get chama GET /orders/871254203 na base 2025-03` | pass |
| C10 | `run unit / ✔ v1: created_at_min segue como texto sem mudança` | pass |
| C11 | `run unit / ✔ v1: todo parâmetro da 1.1.3 mantém name e type` | pass |
| C12 | `run unit / ✔ o node declara version [1, 2] e defaultVersion 2` | pass |
| C13 | `run unit / ✔ v2: IDs principais são resourceLocator com list pesquisável e id` | pass |
| C14 | `run unit / ✔ v2: orderId em modo list chama GET /orders/871254203` | pass |
| C15 | `run unit / ✔ v2: orderId em modo id remove espaço nas pontas` | pass |
| C16 | `run unit / ✔ v2: Resource Locator vazio lança NodeOperationError com descrição` | pass |
| C17 | `run unit / ✔ listSearch de pedidos chama GET /orders com q, page e per_page` | pass |
| C18 | `run unit / ✔ listSearch de produtos e clientes busca uma página por chamada` | pass |
| C19 | `run unit / ✔ listSearch devolve paginationToken só com página cheia` | pass |
| C20 | `run unit / ✔ listSearch de categorias filtra por contém sem acento até 5 páginas` | pass |
| C21 | `run unit / ✔ listSearch de cupons usa q e mantém só código que contém o texto` | pass |
| C22 | `run unit / ✔ v2: getProductVariants lê o product_id do Resource Locator` | pass |
| C23 | `run unit / ✔ listSearch repassa 401 como NodeApiError` | pass |
| C24 | `run unit / ✔ v2: filtros de data são dateTime` | pass |
| C25 | `run unit / ✔ v2: data sem fuso segue como veio` | pass |
| C26 | `run unit / ✔ v2: data com fuso segue igual` | pass |
| C27 | `run unit / ✔ v2: datas de cupom viram AAAA-MM-DD` | pass |
| C28 | `run unit / ✔ v2: data fora do ISO 8601 lança NodeOperationError` | pass |
| C29 | `run unit / ✔ v2: Values de variante é fixedCollection` | pass |
| C30 | `run unit / ✔ v2: Values de variante vira array de objetos por idioma` | pass |
| C33 | `run unit / ✔ v2: data impossível lança NodeOperationError sem chamar a API` | pass |
| C34 | `run unit / ✔ v2: linha de Values sem texto lança NodeOperationError` | pass |
| C31 | `run unit / ✔ README tem as seções do padrão completo` | pass |
| C32 | `run unit / ✔ versão 1.2.0 e CHANGELOG com a seção 1.2.0` | pass |
| Build | `npm run build --silent` | pass |
| Build | `npx tsc --noEmit` | pass |

## Output

`Run unit` - exit 0

```
  ✔ preserves non-empty legacy array bodies and rejects the wrong body shape (0.215882ms)
  ✔ rejects an empty required body before making the API request (0.189159ms)
✔ Nuvem Shop guided request fields (3.843437ms)
▶ Nuvem Shop dynamic selectors
  ✔ does not request variants while the parent product is an unresolved expression (0.191907ms)
  ✔ adds IDs to dynamic option labels so duplicate names stay distinguishable (0.286547ms)
✔ Nuvem Shop dynamic selectors (0.561374ms)
ℹ tests 76
ℹ suites 16
ℹ pass 76
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 770.712629
```

`rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD / tar -x -C /tmp/ns-lint && ln -s "$PWD/node_mod` - exit 0

```
┌   n8n-node lint  v0.55.5
```

`npm audit --omit=dev` - exit 0

```
found 0 vulnerabilities
```

`npm test` - exit 0

```
  ✔ preserves non-empty legacy array bodies and rejects the wrong body shape (0.271526ms)
  ✔ rejects an empty required body before making the API request (0.244335ms)
✔ Nuvem Shop guided request fields (6.499047ms)
▶ Nuvem Shop dynamic selectors
  ✔ does not request variants while the parent product is an unresolved expression (0.198662ms)
  ✔ adds IDs to dynamic option labels so duplicate names stay distinguishable (0.473685ms)
✔ Nuvem Shop dynamic selectors (0.789345ms)
ℹ tests 76
ℹ suites 16
ℹ pass 76
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 706.346274
```
