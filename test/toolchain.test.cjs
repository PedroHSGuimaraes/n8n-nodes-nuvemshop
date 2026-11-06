/**
 * Prova a slice S1 do plano node-cli-campos-v2: o pacote segue o toolchain do
 * @n8n/node-cli 0.55.5, os workflows do GitHub estão certos e toda chamada HTTP leva timeout.
 * Cada teste protege uma regra do plano; se ela voltar a quebrar, o teste correspondente falha.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const { findOperation } = require('../dist/nodes/NuvemShop/actions');
const { executeDefinedOperation } = require('../dist/nodes/NuvemShop/actions/execute');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));

// Contexto falso mínimo: grava as opções da requisição HTTP e devolve uma resposta pronta.
function context(parameters, handlers) {
	return {
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion: 1 }),
		getNodeParameter: (name, _itemIndex, defaultValue) => parameters[name] ?? defaultValue,
		getCredentials: async () => ({
			region: 'br',
			apiVersion: '2025-03',
			storeId: '123456',
			appId: '9876',
			accessToken: 'token',
			clientSecret: 'secret',
			userAgent: 'test-agent (https://example.com)',
		}),
		helpers: handlers,
	};
}

describe('S1 toolchain do node-cli', () => {
	it('package.json segue o template do node-cli 0.55.5', () => {
		assert.equal(pkg.devDependencies['@n8n/node-cli'], '0.55.5');
		assert.equal(pkg.devDependencies['n8n-workflow'], '^2.46.5');
		assert.equal(pkg.n8n.strict, true);
		assert.deepEqual(pkg.peerDependencies, { 'n8n-workflow': '*' });
		assert.equal('dependencies' in pkg, false, 'sem dependencies de runtime');
		assert.equal(JSON.stringify(pkg).includes('gulp'), false, 'sem gulp');
		assert.deepEqual(pkg.funding, {
			type: 'individual',
			url: 'https://buymeacoffee.com/qTny0AzFXS',
		});
	});

	it('o lock resolve n8n-workflow em 2.46.x ou mais nova', () => {
		const lock = JSON.parse(read('package-lock.json'));
		const [major, minor] = lock.packages['node_modules/n8n-workflow'].version
			.split('.')
			.map(Number);
		assert.ok(major > 2 || (major === 2 && minor >= 46), 'n8n-workflow abaixo de 2.46');
	});

	it('NuvemShop.node.json usa uma categoria aceita pelo lint', () => {
		const codex = JSON.parse(read('nodes/NuvemShop/NuvemShop.node.json'));
		assert.deepEqual(codex.categories, ['Sales', 'Marketing & Content']);
	});

	it('o trigger não carrega eslint-disable sem efeito', () => {
		assert.equal(
			read('nodes/NuvemShopTrigger/NuvemShopTrigger.node.ts').includes(
				'eslint-disable @n8n/community-nodes/node-usable-as-tool',
			),
			false,
		);
	});

	it('o ci roda npm ci, lint, test e build em Pull Request', () => {
		const ci = read('.github/workflows/ci.yml');
		assert.match(ci, /pull_request:/);
		for (const step of ['npm ci', 'npm run lint', 'npm test', 'npm run build']) {
			// Só vale passo `run:` de verdade; comentário que cita o comando não conta.
			assert.match(ci, new RegExp(`^\\s*run: ${step}\\b`, 'm'), `ci.yml precisa rodar "${step}"`);
		}
	});

	// Lição do PR do RD Station: o publish com Node diferente do ci quebrou o `npm ci` do lock.
	it('o publish usa a mesma node-version do ci', () => {
		const version = (file) =>
			read(`.github/workflows/${file}`).match(/^\s*node-version:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1];
		assert.ok(version('ci.yml'));
		assert.equal(version('publish.yml'), version('ci.yml'));
	});

	// Token npm "stage only": `npm publish` falha com E_STAGE_REQUIRED; só `stage publish` entra.
	it('o publish envia o pacote para a fila stage com provenance', () => {
		const publish = read('.github/workflows/publish.yml');
		const runs = publish.split('\n').filter((line) => /^\s*(-\s+)?run:/.test(line));
		assert.ok(
			runs.some(
				(line) =>
					line.includes('npx -y npm@12.2.2 stage publish') &&
					line.includes('--provenance') &&
					line.includes('--access public'),
			),
		);
		assert.equal(
			runs.some((line) => /\bnpm (publish|run release)\b/.test(line)),
			false,
		);
		assert.match(publish, /RELEASE_MODE: 'true'/);
		assert.match(publish, /NODE_AUTH_TOKEN: \$\{\{ secrets\.NPM_TOKEN \}\}/);
		assert.match(publish, /workflow_dispatch:/);
		assert.match(publish, /tags:\s*\n\s*- 'v\*\.\*\.\*'/);
	});
});

describe('S1 timeout das chamadas HTTP', () => {
	it('rota de loja usa httpRequestWithAuthentication com timeout de 30000', async () => {
		let options;
		await executeDefinedOperation.call(
			context(
				{ orderId: '871254203' },
				{
					httpRequestWithAuthentication: async (_type, requestOptions) => {
						options = requestOptions;
						return {};
					},
				},
			),
			findOperation('order', 'get'),
			0,
		);
		assert.equal(options.timeout, 30000);
	});

	it('rota de parceiro (httpRequest direto) também leva timeout de 30000', async () => {
		let options;
		const operation = findOperation('authorization', 'exchangeAuthorizationCode');
		assert.ok(operation, 'operação de partner/authorization existe');
		await executeDefinedOperation.call(
			context(
				{ authorizationCode: 'abc' },
				{
					httpRequest: async (requestOptions) => {
						options = requestOptions;
						return {};
					},
				},
			),
			operation,
			0,
		);
		assert.equal(options.timeout, 30000);
	});

	it('uma chamada que estoura o tempo vira NodeApiError', async () => {
		await assert.rejects(
			executeDefinedOperation.call(
				context(
					{ orderId: '1' },
					{
						httpRequestWithAuthentication: async () => {
							throw new Error('timeout of 30000ms exceeded');
						},
					},
				),
				findOperation('order', 'get'),
				0,
			),
			(error) => error.name === 'NodeApiError',
		);
	});
});
