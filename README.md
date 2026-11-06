# n8n-nodes-nuvemshop

Node comunitário do n8n para integrar **Nuvemshop** e **Tiendanube**. Inclui um node de ações com campos guiados, uso como Tool de Agente de IA e um Trigger real para webhooks da API oficial.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-nuvemshop.svg)](https://www.npmjs.com/package/n8n-nodes-nuvemshop)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-nuvemshop.svg)](https://www.npmjs.com/package/n8n-nodes-nuvemshop)
[![CI](https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop/actions/workflows/ci.yml/badge.svg)](https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/n8n-nodes-nuvemshop.svg)](LICENSE.md)
[![Apoie no Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Apoie_o_projeto-FFDD00?logo=buy-me-a-coffee&logoColor=000000)](https://buymeacoffee.com/qTny0AzFXS)

## 🧭 Navegação

- [Funcionalidades](#-funcionalidades)
- [Instalação](#-instalação)
- [Credenciais](#-credenciais)
- [Nós e Operações](#-nós-e-operações)
- [Preenchimento guiado](#-preenchimento-guiado)
- [Exemplos](#-exemplos)
- [Usar como Tool de Agente de IA](#-usar-como-tool-de-agente-de-ia)
- [Trigger](#-trigger-webhook)
- [Paginação e limites](#-paginação-e-limites)
- [Custom API Call](#-custom-api-call)
- [Solução de problemas](#-solução-de-problemas)
- [Desenvolvimento](#-desenvolvimento)
- [Compatibilidade](#-compatibilidade)
- [Recursos](#-recursos)
- [Publicação](#-publicação)
- [Versões](#-versões)
- [Suporte](#-suporte)
- [Apoie o projeto](#-apoie-o-projeto)
- [Licença](#-licença)

## ✨ Funcionalidades

- 217 operações explícitas organizadas em 37 recursos, incluindo Price Table (tabelas de preço B2B).
- Campos guiados e tipados para payloads e filtros comuns.
- Campos obrigatórios visíveis nas operações principais.
- JSON avançado opcional para contratos completos e recursos novos.
- **Lista pesquisável e paginada** (node versão 2) para produto, categoria, pedido, cliente e cupom, com a opção de colar o ID.
- Dropdowns dinâmicos para variantes, locais e webhooks.
- Seletor de data nos filtros e lista de idioma e texto nos valores de variante (node versão 2).
- Defaults seguros: operações de leitura são selecionadas antes de mutações.
- API estável `2025-03`, rotas legadas `v1` e operações `unstable` documentadas.
- Regiões Brasil/Nuvemshop e internacional/Tiendanube.
- OAuth, Store API, Partner Actions, paginação, multipart e respostas binárias.
- Compatibilidade com AI Agent por `usableAsTool: true`.
- Registro e remoção automática de webhooks com validação HMAC SHA-256.
- Sem dependências de runtime.

## 📦 Instalação

### Pela interface do n8n

1. Abra **Settings → Community Nodes**.
2. Clique em **Install a community node**.
3. Informe `n8n-nodes-nuvemshop`.
4. Confirme a instalação e reinicie o n8n quando solicitado.

### Instalação npm self-hosted

```bash
cd ~/.n8n
npm install n8n-nodes-nuvemshop
```

Reinicie o processo ou container do n8n após instalar.

## 🔐 Credenciais

Crie uma credencial **Nuvem Shop API** e escolha o tipo conforme o fluxo:

| Tipo                                 | Quando usar                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| **Store API**                        | Produtos, pedidos, clientes e demais operações de uma loja já autorizada               |
| **App OAuth and Partner Actions**    | Trocar o authorization code ou executar Partner Actions antes de existir token da loja |
| **Store and App (Full Integration)** | Store API, Partner Actions e Trigger com HMAC na mesma integração                      |

### Configuração passo a passo

1. No Portal de Parceiros da Nuvemshop, crie ou abra seu aplicativo.
2. Configure uma URL de redirecionamento HTTPS para receber o `code` do OAuth.
3. Copie **App ID** e **Client Secret** para uma credencial do tipo App ou Full Integration.
4. Envie o lojista para a URL de autorização do aplicativo.
5. Capture o `code` retornado. Ele expira em cinco minutos.
6. No node, use **Authorization → Exchange Authorization Code**.
7. Copie `access_token` e `user_id` da resposta.
8. Salve `access_token` como **Access Token** e `user_id` como **Store ID**.
9. Escolha a região correta e mantenha `2025-03` para operações atuais.
10. Informe um User-Agent com nome e URL de contato do aplicativo.
11. Teste a credencial no editor do n8n.

| Campo           | Obrigatório | Como preencher                                                     |
| --------------- | ----------- | ------------------------------------------------------------------ |
| Credential Type | Sim         | Store, App ou Full Integration                                     |
| Access Token    | Store/Full  | Token OAuth permanente da loja                                     |
| Store ID        | Store/Full  | Valor `user_id` retornado pelo OAuth                               |
| Region          | Sim         | Brazil para Nuvemshop; International para Tiendanube               |
| API Version     | Sim         | `2025-03` recomendado; `v1` ou `unstable` quando a operação exigir |
| User Agent      | Sim         | Nome do app e e-mail ou URL pública de contato                     |
| App ID          | App/Full    | ID do aplicativo no Portal de Parceiros                            |
| Client Secret   | App/Full    | Segredo OAuth, Partner Actions e assinatura do Trigger             |

Solicite apenas os escopos usados pelo workflow. Tokens, IDs da loja e segredos ficam na credencial criptografada e nunca devem ser colocados em Body, Query ou `$fromAI()`.

## 🧩 Nós e Operações

O pacote instala:

- **Nuvem Shop** — ações da API, paginação, upload e uso como Tool.
- **Nuvem Shop Trigger** — recebimento de eventos via webhook.

### Cobertura de recursos

| Domínio    | Recursos e operações                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| Catálogo   | Category, Product, Product Variant, Product Image, Price Table, custom fields e Metafield |
| Comércio   | Customer, Coupon, Cart, Abandoned Checkout, Order e Draft Order                           |
| Pagamentos | Transaction, Dispute, Payment Option, Payment Provider e Billing                          |
| Logística  | Location, Fulfillment Order, Fulfillment Event, Shipping Carrier e opções                 |
| Conteúdo   | Blog, Page, Email Template e Script                                                       |
| Plataforma | Store, Webhook, Discount, Business Rule, Kit e Authorization                              |
| Avançado   | Custom API Call com GET, POST, PUT, PATCH, DELETE e HEAD                                  |

Cada recurso mostra somente operações compatíveis. Operações de leitura são o default sempre que existem. Use **Get Many** para localizar IDs antes de Update/Delete; não invente ou reutilize IDs de outro tipo de recurso.

### Price Table (tabelas de preço B2B)

O recurso **Price Table** gerencia as tabelas de preço da API `2025-03`: um desconto padrão para a loja inteira, exceções por categoria e exceções por variante (com preço fixo opcional) e os clientes que usam a tabela. A regra mais específica vence: variante, depois categoria, depois o desconto padrão.

| Operação                       | Rota                                                              |
| ------------------------------ | ----------------------------------------------------------------- |
| Create                         | `POST /products/price-tables`                                     |
| Get                            | `GET /products/price-tables/{id}`                                 |
| Get Many                       | `GET /products/price-tables`                                      |
| Update                         | `PUT /products/price-tables/{id}`                                 |
| Set Categories                 | `PUT /products/price-tables/{id}/categories`                      |
| Get Category                   | `GET /products/price-tables/{id}/categories/{categoryId}`         |
| Get Categories                 | `GET /products/price-tables/{id}/categories`                      |
| Delete Category                | `DELETE /products/price-tables/{id}/categories/{categoryId}`      |
| Set Variants                   | `PUT /products/price-tables/{id}/product-variants`                |
| Get Variant                    | `GET /products/price-tables/{id}/product-variants/{variantId}`    |
| Get Variants                   | `GET /products/price-tables/{id}/product-variants`                |
| Delete Variant                 | `DELETE /products/price-tables/{id}/product-variants/{variantId}` |
| Add Customers                  | `PUT /products/price-tables/{id}/customers`                       |
| Approve Customers              | `POST /products/price-tables/{id}/approve-customers`              |
| Get Customers                  | `GET /products/price-tables/{id}/customers`                       |
| Delete Customer                | `DELETE /products/price-tables/{id}/customers/{customerId}`       |
| Get Price Tables of a Customer | `GET /products/price-tables/customers/{customerId}`               |

Na versão 2 do node, a tabela e o cliente são **lista pesquisável** com a opção de colar o ID. A API devolve no máximo 10 itens por página nas tabelas e 50 nas sublistas; **Return All** respeita esses limites. Um cliente só pode estar em uma tabela: se algum cliente do lote já tem tabela, **Add Customers** falha inteiro com `409` e a resposta lista os clientes em conflito. Para mudar um cliente de tabela, use antes **Delete Customer**.

#### Exemplo: criar uma tabela e ligar clientes

1. Em **Price Table → Create**, preencha `Name` (por exemplo `Atacado`) e `Default Discount` (por exemplo `7.00`).
2. Em **Price Table → Set Categories**, escolha a tabela e envie `[{"id":"1238746858","discount":"20.00"}]`.
3. Em **Price Table → Add Customers**, escolha a tabela e envie `["123456789","654987321"]`.

### Remoções em massa com confirmação

Duas operações apagam vários itens de uma vez e por isso trazem um interruptor **desligado por padrão**. Sem ele ligado, a operação falha antes de qualquer requisição.

| Operação                           | Rota                                                      | Interruptor                     |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------- |
| Discount → Delete All Promotions   | `DELETE /promotions` (todas as promoções do app)          | `Confirm Delete All Promotions` |
| Business Rule → Delete Integration | `DELETE /business_rules/integrations/{domain}?events=...` | `Confirm Delete Integration`    |

Em **Delete Integration**, informe `events` em **Filters** (por exemplo `payments/before-filter`, separados por vírgula) ou `all` para apagar todos os callbacks do app.

## 📝 Preenchimento guiado

Operações com Body ou filtros apresentam três níveis:

1. **Campos obrigatórios** — aparecem diretamente e precisam ser preenchidos.
2. **Additional Fields / Update Fields / Filters** — clique em **Add Field** e escolha somente os dados necessários.
3. **Advanced Body (JSON) / Additional Query Parameters (JSON)** — fallback opcional para campos raros ou recém-publicados pela API.

Campos guiados são convertidos automaticamente para os nomes `snake_case` exigidos pela API. Quando o mesmo campo existir no JSON avançado e na interface guiada, o valor guiado vence.

Valores multilíngues simples usam o idioma escolhido em **Content Language** (`pt`, `pt_BR`, `es`, `es_AR` ou `en`). Para enviar vários idiomas no mesmo campo, use o JSON avançado:

```json
{
	"name": {
		"pt": "Camiseta",
		"es": "Remera",
		"en": "T-Shirt"
	}
}
```

Arrays simples, como IDs de categorias, podem ser informados separados por vírgula. Objetos complexos, variantes, imagens e produtos de um pedido usam um campo JSON dedicado com exemplo visível.

### Node versão 2: listas e datas

Em node novo (versão 2), o node mostra no editor:

- **Produto, categoria, pedido, cliente e cupom** como lista pesquisável. Digite parte do nome, do número do pedido, do e-mail ou do código do cupom; a lista busca uma página por vez e carrega mais ao rolar. Troque para **By ID** para colar um ID de outra etapa do workflow.
- **Filtros de data** (`created_at_min`, `updated_at_max` e os demais, mais as datas de cupom) como seletor de data. O valor segue em ISO 8601; datas de cupom seguem como `AAAA-MM-DD`.
- **Values de variante** como linhas de idioma e texto.

Workflows salvos continuam na versão 1, com os mesmos campos de antes. Local, variante e webhook seguem como dropdown nas duas versões.

## 🚀 Exemplos

### Criar um produto

1. Selecione **Product → Create**.
2. Preencha **Name**.
3. Em **Additional Fields**, adicione Published, Brand, Categories, Variants ou Images.
4. Use **Category → Get Many** para obter IDs de categorias.
5. Execute e guarde o ID do produto retornado.

Exemplo do campo Variants:

```json
[
	{
		"values": [{ "pt": "M" }],
		"price": "79.90",
		"stock_management": true,
		"stock": 25,
		"sku": "CAM-M"
	}
]
```

### Criar e confirmar um pedido rascunho

1. Use **Product → Get by SKU** ou **Get Many** para localizar a variante.
2. Use **Draft Order → Create** e preencha contato, pagamento e Products.
3. Revise totais e itens com **Draft Order → Get**.
4. Confirme somente após revisão humana com **Draft Order → Confirm**.

### Atualizar pedido com segurança

1. Use **Order → Get Many** com filtros de status/data.
2. Escolha o pedido pelo dropdown ou passe o ID retornado por expressão.
3. Consulte **Order → Get** antes da alteração.
4. Use Update, Cancel, Close ou Edit somente com validação do estado atual.

## 🤖 Usar como Tool de Agente de IA

O node de ações define `usableAsTool: true`. Não existe um node Tool separado.

### Habilitar community nodes como tools

Em instalações self-hosted, defina:

```bash
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

| Instalação              | Onde definir                                              |
| ----------------------- | --------------------------------------------------------- |
| Docker / docker-compose | Em `environment:` ou no `.env`; depois recrie o container |
| npm / npx               | Exporte a variável antes de executar `n8n start`          |
| n8n Cloud               | Disponível nos planos que suportam community nodes        |

Sem essa variável, o Nuvem Shop pode não aparecer no conector **Tool** do AI Agent.

Operações novas para agentes: **Price Table** (as 17 operações; use as de leitura com `$fromAI()` apenas para filtros), **Delete All Promotions** e **Delete Integration**. As duas remoções só rodam com o interruptor de confirmação ligado; deixe-o fixo e desligado, e ligue-o só após revisão humana.

### Configuração recomendada

1. Adicione um **AI Agent** e conecte um Chat Model.
2. No conector **Tool**, adicione **Nuvem Shop**.
3. Escolha um único Resource e Operation por node.
4. Dê um nome estreito, como `NuvemShop_Get_Product`.
5. Fixe campos de segurança e deixe para a IA apenas parâmetros operacionais.

Use o botão **Let the model define this** ou uma expressão `$fromAI()`:

```text
{{ $fromAI('sku', 'SKU exato da variante, por exemplo CAM-M', 'string') }}
```

Assinatura: `$fromAI(key, description?, type?, defaultValue?)`. Tipos aceitos: `string`, `number`, `boolean` e `json`.

Boas práticas:

- Exponha somente operações necessárias ao agente.
- Use credencial dedicada com menor privilégio.
- Nunca permita que o modelo invente IDs.
- Este node não impõe aprovação automaticamente. Adicione uma etapa externa de revisão humana antes de Delete, Cancel, pagamentos, disputas, estoque, preço, fulfillment e publicação.
- O **Nuvem Shop Trigger** não é uma Tool; triggers não podem ser conectados ao AI Agent.

## 🪝 Trigger (Webhook)

O **Nuvem Shop Trigger** registra webhooks ao ativar o workflow e remove os registros ao desativá-lo.

1. Crie uma credencial Full Integration com Client Secret.
2. Adicione o Trigger e selecione os eventos.
3. Ative **Verify HMAC Signature**.
4. Use uma URL de produção HTTPS; localhost não é aceito.
5. Ative o workflow para registrar os webhooks.

Famílias suportadas: app, app subscription, category, charge, checkout, coupon, customer, order, product, product variant, custom field, domain, theme, navigation, subscription, fulfillment, fulfillment order, label, tracking event e location. Os eventos `charge/*` e `app_subscription/updated` só chegam a apps com cobrança (billing).

Eventos de privacidade são configurados no Portal de Parceiros:

- `store/redact`
- `customers/redact`
- `customers/data_request`

Copie a Production URL do Trigger para o evento correspondente. A assinatura usa o header `x-linkedstore-hmac-sha256` e o Client Secret. Eventos podem chegar repetidos ou fora de ordem; faça workflows idempotentes.

## 📚 Paginação e limites

- **Return All** percorre as páginas automaticamente.
- **Limit** restringe o total de itens retornados.
- O node usa páginas de até 200 itens e intervalo de 500 ms.
- Consultas de pedidos podem ser limitadas a 10.000 resultados; use datas incrementais.
- Para `429`, respeite o tempo de retry e evite repetir escritas não idempotentes.

## 🔧 Custom API Call

Use quando a Nuvemshop publicar uma rota antes da atualização deste pacote ou quando uma API restrita for liberada para seu aplicativo.

- Endpoint sempre relativo, por exemplo `/products`.
- Domínios externos, traversal, barras invertidas e caracteres de controle são bloqueados.
- Store scope usa Store ID e Access Token.
- Partner App scope usa App ID e Client Secret.
- Suporta JSON, multipart e arquivo binário.

## 🧯 Solução de problemas

| Sintoma                            | Verificação                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Node não aparece como Tool         | Configure `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` e reinicie o n8n |
| 401 Unauthorized                   | Confira Access Token, região e tipo da credencial                         |
| 403 Forbidden                      | Confirme os escopos concedidos ao aplicativo                              |
| 400 Bad Request                    | Revise campos obrigatórios, User-Agent e formato do Body                  |
| 404 Not Found                      | Confira Store ID, versão da API e ID do recurso                           |
| 429 Too Many Requests              | Aguarde o retry e reduza concorrência/paginação                           |
| Dropdown vazio                     | Preencha primeiro o recurso pai ou use uma expressão com ID confiável     |
| Trigger não ativa                  | Use URL HTTPS pública e credencial Full Integration                       |
| Assinatura HMAC falha              | Confira Client Secret e se o proxy preserva body/header originais         |
| Evento de privacidade não registra | Configure o evento diretamente no Portal de Parceiros                     |

## 🛠️ Desenvolvimento

Requer Node.js 24 para o toolchain do repositório.

```bash
npm ci
npm run lint
npm test
npm run build
npm pack --dry-run
```

Use `npm run dev` para carregar o node em uma instância local do n8n.

## ✅ Compatibilidade

- `n8nNodesApiVersion` 1.
- Node.js 24 no desenvolvimento e publicação.
- API `2025-03` como padrão.
- Rotas `v1` e `unstable` selecionadas por operação quando necessário.
- Nuvemshop Brasil e Tiendanube internacional.

## 📚 Recursos

- [Nuvemshop API — introdução](https://tiendanube.github.io/api-documentation/intro)
- [Autenticação](https://tiendanube.github.io/api-documentation/authentication)
- [Partner Actions](https://tiendanube.github.io/api-documentation/guides/authentication-for-partner-actions)
- [Webhooks](https://tiendanube.github.io/api-documentation/resources/webhook)
- [Community nodes do n8n](https://docs.n8n.io/integrations/community-nodes/)
- [Tools Agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)
- [`$fromAI()`](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/)

## 🚀 Publicação

A tag `vX.Y.Z` (ou o `workflow_dispatch`) dispara o workflow `publish.yml`, que roda lint, testes e build e envia a versão com `npx -y npm@12.2.2 stage publish --provenance --access public`. A versão **fica em espera**: ela só vai ao ar depois que o dono a aprova, com 2FA, na aba **Staged Packages** do npmjs.com. Sem a aprovação, nada muda no registro.

## 📈 Versões

- **1.3.0** — **Price Table e eventos novos.** Recurso Price Table com 17 operações; 13 eventos novos no Trigger (`checkout/*`, `order/in_preparation`, `order/in_fraud_analysis`, `fulfillment_order/label_created` e `label_deleted`, `charge/*`, `app_subscription/updated`, `coupon/deleted`, `theme/updated` e `navigation/updated`); Delete All Promotions e Delete Integration com confirmação; campo `inventory_behaviour` na criação de pedido; status `IN_PREPARATION` na ordem de envio. Corrige o Payment Option, que chamava uma rota inexistente. Workflows salvos não mudam.
- **1.2.0** — **Listas pesquisáveis e datas guiadas.** Em node novo (versão 2), produto, categoria, pedido, cliente e cupom viram lista pesquisável e paginada com a opção de colar o ID; os filtros de data viram seletor; os valores de variante viram linhas de idioma e texto. Toda chamada passa a ter timeout de 30 s. Migração para o `@n8n/node-cli` 0.55.5, `n8n-workflow` 2.46 e publicação por fila de aprovação. Workflows salvos continuam na versão 1 e não mudam.
- **1.1.0** — campos guiados, filtros, dropdowns ampliados, defaults seguros e documentação pt-BR otimizada para AI Tools.
- **1.0.0** — primeira versão pública com 198 operações, paginação, Partner Actions, Custom API Call e Trigger HMAC.

Consulte o [CHANGELOG](CHANGELOG.md) para detalhes técnicos.

## 🆘 Suporte

1. Confira credencial, região, API Version e escopos.
2. Execute a operação Get antes de mutações para validar IDs e estado.
3. Consulte os logs do n8n e a mensagem retornada pela API.
4. Abra uma [issue no GitHub](https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop/issues) com versão do n8n, operação e erro sem incluir tokens.

## ☕ Apoie o projeto

Este node é mantido de forma independente. Se ele ajuda suas automações, você pode apoiar o desenvolvimento, a manutenção e as novas integrações pelo [Buy Me a Coffee](https://buymeacoffee.com/qTny0AzFXS).

## 📄 Licença

[MIT](LICENSE.md)

Nuvemshop e sua marca pertencem aos respectivos titulares. Este pacote comunitário não é um produto oficial da Nuvemshop.
