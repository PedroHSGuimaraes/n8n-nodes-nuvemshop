# node-cli-campos-v2 checks

Build: `npm run build --silent`; `npx tsc --noEmit`
Run unit: `npm run build --silent && node --test --test-reporter=spec test/*.test.cjs`
Plan: `.specs/features/node-cli-campos-v2/plan.md`

32 checks in 5 slices · 4 one-way doors · 0 open, of which 0 block

## Checks

### S1 - toolchain do node-cli 0.55.5 e publicação segura

**C1** - `n8n-node lint` sai com código 0, 0 erros e 0 avisos (AC 1)
Proof: `rm -rf /tmp/ns-lint && mkdir /tmp/ns-lint && git archive HEAD | tar -x -C /tmp/ns-lint && ln -s "$PWD/node_modules" /tmp/ns-lint/node_modules && cd /tmp/ns-lint && npx n8n-node lint`
Proof: run unit | ✔ NuvemShop.node.json usa uma categoria aceita pelo lint
Proof: run unit | ✔ o trigger não carrega eslint-disable sem efeito

**C2** - package.json tem node-cli 0.55.5, n8n-workflow ^2.46.5, strict, peer "*", sem dependencies, sem gulp e o funding do dono (AC 2)
Proof: run unit | ✔ package.json segue o template do node-cli 0.55.5

**C3** - O lock resolve n8n-workflow em 2.46.x ou mais nova e o audit de produção lista 0 vulnerabilidades (AC 3)
Proof: run unit | ✔ o lock resolve n8n-workflow em 2.46.x ou mais nova
Proof: `npm audit --omit=dev`

**C4** - Toda requisição da loja e da partner leva timeout 30000 (AC 4)
Proof: run unit | ✔ rota de loja usa httpRequestWithAuthentication com timeout de 30000
Proof: run unit | ✔ rota de parceiro (httpRequest direto) também leva timeout de 30000

**C5** - Chamada que estoura o tempo vira NodeApiError (AC 5)
Proof: run unit | ✔ uma chamada que estoura o tempo vira NodeApiError

**C6** - O ci roda npm ci, lint, test e build em Pull Request, com a mesma node-version do publish (AC 6)
Proof: run unit | ✔ o ci roda npm ci, lint, test e build em Pull Request
Proof: run unit | ✔ o publish usa a mesma node-version do ci

**C7** - O publish roda stage publish do npm 12.2.2 com provenance, RELEASE_MODE, NODE_AUTH_TOKEN e workflow_dispatch (AC 7)
Proof: run unit | ✔ o publish envia o pacote para a fila stage com provenance

**C8** - npm test compila e roda a suíte com 0 falhas (AC 8)
Proof: `npm test`

### S2 - versão 1 continua igual

**C9** - Na v1, order/get com orderId '871254203' chama GET /orders/871254203 na base 2025-03 (AC 1)
Proof: run unit | ✔ v1: order get chama GET /orders/871254203 na base 2025-03

**C10** - Na v1, o filtro created_at_min segue como texto, sem mudança (AC 2)
Proof: run unit | ✔ v1: created_at_min segue como texto sem mudança

**C11** - Para @version 1, todo parâmetro da 1.1.3 tem o mesmo name e type (AC 3)
Proof: run unit | ✔ v1: todo parâmetro da 1.1.3 mantém name e type

**C12** - O node declara version [1, 2] e defaultVersion 2, então node novo nasce na typeVersion 2 (AC 4)
Proof: run unit | ✔ o node declara version [1, 2] e defaultVersion 2

### S3 - IDs principais com lista pesquisável e paginada

**C13** - Na v2, os IDs de produto, categoria, pedido, cliente e cupom são resourceLocator com modos list (searchable) e id (AC 1)
Proof: run unit | ✔ v2: IDs principais são resourceLocator com list pesquisável e id

**C14** - Na v2, orderId em modo list chama GET /orders/871254203 (AC 2)
Proof: run unit | ✔ v2: orderId em modo list chama GET /orders/871254203

**C15** - Na v2, orderId em modo id com espaços chama GET /orders/871254203 (AC 3)
Proof: run unit | ✔ v2: orderId em modo id remove espaço nas pontas

**C16** - Na v2, Resource Locator vazio lança NodeOperationError com a mensagem e a descrição do plano (AC 4)
Proof: run unit | ✔ v2: Resource Locator vazio lança NodeOperationError com descrição

**C17** - listSearch de pedidos chama GET /orders com q, page 1 e per_page 50 e devolve nome com número e cliente (AC 5)
Proof: run unit | ✔ listSearch de pedidos chama GET /orders com q, page e per_page

**C18** - listSearch de produtos e de clientes busca no máximo uma página por chamada (AC 6)
Proof: run unit | ✔ listSearch de produtos e clientes busca uma página por chamada

**C19** - paginationToken "2" só com página cheia de 50; sem token com 49; lista vazia com 0 (AC 7)
Proof: run unit | ✔ listSearch devolve paginationToken só com página cheia

**C20** - listSearch de categorias filtra por contém sem acento, para com 20 resultados ou 5 páginas e devolve o token (AC 8)
Proof: run unit | ✔ listSearch de categorias filtra por contém sem acento até 5 páginas

**C21** - listSearch de cupons usa q e mantém só o código que contém o texto (AC 9)
Proof: run unit | ✔ listSearch de cupons usa q e mantém só código que contém o texto

**C22** - Na v2, getProductVariants lê o product_id do Resource Locator e chama GET /products/123/variants (AC 10)
Proof: run unit | ✔ v2: getProductVariants lê o product_id do Resource Locator

**C23** - listSearch repassa 401 da API como NodeApiError com código 401 (AC 11)
Proof: run unit | ✔ listSearch repassa 401 como NodeApiError

### S4 - datas e variantes guiadas

**C24** - Na v2, os filtros created/updated_at_min/max e as 4 datas de cupom são dateTime (AC 1)
Proof: run unit | ✔ v2: filtros de data são dateTime

**C25** - Na v2, data sem fuso segue como veio, sem acrescentar fuso (AC 2)
Proof: run unit | ✔ v2: data sem fuso segue como veio

**C26** - Na v2, data com fuso -03:00 segue igual (AC 3)
Proof: run unit | ✔ v2: data com fuso segue igual

**C27** - Na v2, min_start_date 2026-01-01T00:00:00 vira 2026-01-01 (AC 4)
Proof: run unit | ✔ v2: datas de cupom viram AAAA-MM-DD

**C28** - Na v2, data fora do ISO 8601 lança NodeOperationError com a descrição do plano (AC 5)
Proof: run unit | ✔ v2: data fora do ISO 8601 lança NodeOperationError

**C29** - Na v2, o Values de criação e atualização de variante é fixedCollection com idioma e texto (AC 6)
Proof: run unit | ✔ v2: Values de variante é fixedCollection

**C30** - Na v2, duas linhas pt viram values [{"pt":"Tamanho G"},{"pt":"Azul"}] (AC 7)
Proof: run unit | ✔ v2: Values de variante vira array de objetos por idioma

### S5 - documentação e lançamento 1.2.0

**C31** - O README tem as seções do padrão do RD Station CRM (AC 1)
Proof: run unit | ✔ README tem as seções do padrão completo

**C32** - package.json está em 1.2.0 e o CHANGELOG tem a seção 1.2.0 com os itens do plano (AC 2)
Proof: run unit | ✔ versão 1.2.0 e CHANGELOG com a seção 1.2.0

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| IDs principais com Resource Locator (5) | produto C13 · categoria C13 · pedido C13 C14 C15 · cliente C13 · cupom C13 | - |
| listSearch por recurso (5) | produtos C18 · categorias C20 · pedidos C17 · clientes C18 · cupons C21 | - |
| paginationToken (3 exemplos) | 50 itens C19 · 49 itens C19 · 0 itens C19 | - |
| datas dateTime (8) | created_at_min C24 · created_at_max C24 · updated_at_min C24 · updated_at_max C24 · min_start_date C24 C27 · min_end_date C24 · max_start_date C24 · max_end_date C24 | - |
| exemplos de data (3) | sem fuso C25 · com fuso C26 · inválida C28 | - |
| statuses do node v2 (3) | 200 C14 · 401 C23 · 4xx e 5xx C5 | - |
| statuses do node v1 (2) | 200 C9 · 4xx e 5xx C5 | - |
| statuses do listSearch (2) | 200 C17 · 401 C23 | - |
| portas de mão única (4) | versão do node C12 · nome do parâmetro C11 C13 · paginationToken C19 · versão do pacote C32 | - |

## Swept

- validation: C16 · C28
- failure modes: C5 · C23
- idempotency: n/a - o node só lê listas e repassa chamadas; a Nuvemshop decide a repetição
- authorization: existing - a credencial da loja autentica toda chamada e a API devolve 401 (C23)
- concurrency: n/a - cada chamada do editor é independente e o node não guarda estado
- data lifecycle: n/a - o node não guarda dado
- dependency failure: C4 · C5
- state transitions: n/a - o node não tem estados
- observability: n/a - nenhum requisito de log neste plano

## Handoff

- **Settled mid-build:** none
- **Dispatched:** none
- **Boundary:** nenhum check fechado ainda
- **Abandoned:** none
- **Pós-merge (fora desta entrega):** a tag `v1.2.0`, a aprovação 2FA do dono na aba Staged Packages e o `npm view n8n-nodes-nuvemshop version` devolver 1.2.0 dependem do dono (AC S5.3); C7 prova o workflow
- **Walked:** n/a - o node não tem tela própria; o editor do n8n renderiza as propriedades
