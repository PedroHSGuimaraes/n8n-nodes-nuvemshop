# Project state

## Decisions

| ID | Decision | Rationale | Status | Date |
| --- | --- | --- | --- | --- |
| AD-001 | O pacote usa o `@n8n/node-cli` 0.55.5 para build e lint (`n8n-node build`, `n8n-node lint`, `n8n.strict: true`), sem gulp, sem config própria de ESLint e sem `dependencies` de runtime | A guideline de verificação do n8n manda a ferramenta `n8n-node`. Menu: "Migrar para node-cli" (Jev 0,96). O repo já está no 0.38.8; o lint 0.55.5 acusa 1 erro e 1 aviso | active | 2026-11-06 |
| AD-002 | Mudança de formato de parâmetro entra como versão leve do node (`version: [1, 2]`, `defaultVersion: 2`, `@version` em `displayOptions`); a versão 1 mantém nome e tipo de todo parâmetro | Workflows salvos não podem quebrar. Menu: "Nova versão do node" (Jev 0,83). O node de ação hoje tem `version: 1` | active | 2026-11-06 |
| AD-003 | A entrega é branch, Pull Request, merge na `main` e tag `vX.Y.Z`, que publica no npm pelo workflow com provenance | Menu: "PR e publicar" | active | 2026-11-06 |
| AD-004 | Os testes são `node --test test/*.test.cjs` sobre o `dist`, chamando o `execute` com contexto falso que grava a requisição HTTP; o repo mantém o padrão que já tem em `test/` | O repo já tem `test/definitions.test.cjs` e `test/transport.test.cjs` nesse padrão | active | 2026-11-06 |
| AD-005 | Toda chamada HTTP do pacote leva `timeout` explícito | Regra do dono para código que chama serviço externo. Hoje `nuvemShopApiRequest` não passa `timeout` | active | 2026-11-06 |
| AD-006 | A devDependency `n8n-workflow` sobe para `^2.46.5` com o lock em 2.46.x ou mais nova; `peerDependencies` continua `"*"` | A tag `latest` do npm está parada em 2.16.0; a `stable` é a 2.46.5, usada pelo n8n 2.46.6. Decisão do dono, 06/11/2026 | active | 2026-11-06 |
| AD-007 | A publicação usa `npx -y npm@12.2.2 stage publish --provenance --access public` com token npm "stage only"; o dono aprova cada versão com 2FA na aba Staged Packages | Decisão do dono, 06/11/2026. `npm stage` só existe no npm 12 | active | 2026-11-06 |
| AD-008 | O nome do pacote continua `n8n-nodes-nuvemshop` | `npm view` mostra o pacote já publicado em 1.1.3 por este repo; `n8nnodesnuvemshop` e `n8n-nodes-nuvem-shop` dão 404, então nenhum nome parecido colide (o npm recusa com E400 no stage se colidir) | active | 2026-11-06 |
| AD-009 | Na versão 2, todo campo de ID que aponta para uma lista confirmada na doc da Nuvemshop vira Resource Locator (`From List` padrão, pesquisável, mais `By ID`), com o mesmo `name` da versão 1; isso inclui os dropdowns que já existem e carregam só as 200 primeiras linhas | Menu: "Na versão 2, o que fazer com os campos de ID que já são dropdown..." → Resource Locator (Jev 0,97; descartados: manter dropdown 0,02, só aumentar o limite 0,01) | active | 2026-11-06 |
| AD-010 | README completo no padrão do RD Station CRM e `funding` `{"type":"individual","url":"https://buymeacoffee.com/qTny0AzFXS"}` no `package.json` | Decisão do dono, 06/11/2026 | active | 2026-11-06 |
| AD-011 | O seletor de data da versão 2 envia o texto como veio, sem acrescentar fuso; só as 4 datas de cupom (`min_start_date` e afins) viram `YYYY-MM-DD` | Jev 0,57 para manter sem fuso (descartados: UTC com `Z` 0,28, recusar sem fuso 0,15). O node não tem o fuso do workflow sem dependência de runtime | active | 2026-11-06 |
