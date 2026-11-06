/**
 * Prova as slices S2 (versão 1 continua igual) e S3 (IDs principais com lista pesquisável)
 * do plano node-cli-campos-v2. Cada teste chama o `execute` ou o `listSearch` do dist com um
 * contexto falso que grava a requisição HTTP, sem rede.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const { findOperation, resourceDefinitions } = require('../dist/nodes/NuvemShop/actions');
const { executeDefinedOperation } = require('../dist/nodes/NuvemShop/actions/execute');
const { loadOptions } = require('../dist/nodes/NuvemShop/methods/loadOptions');
const { NuvemShop } = require('../dist/nodes/NuvemShop/NuvemShop.node');

const credentials = {
	region: 'br',
	apiVersion: '2025-03',
	storeId: '123456',
	accessToken: 'token',
	userAgent: 'test-agent (https://example.com)',
};

// Contexto de execução: typeVersion e parâmetros configuráveis; grava a requisição.
function executeContext(typeVersion, parameters, responder = async () => ({})) {
	return {
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion }),
		getNodeParameter: (name, _itemIndex, defaultValue) => parameters[name] ?? defaultValue,
		getCredentials: async () => credentials,
		helpers: { httpRequestWithAuthentication: async (_type, options) => responder(options) },
	};
}

// Contexto do editor (loadOptions e listSearch): sem itemIndex, com getCurrentNodeParameter.
function editorContext(responder, currentParameters = {}) {
	return {
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion: 2 }),
		getCurrentNodeParameter: (name) => currentParameters[name],
		getCredentials: async () => credentials,
		helpers: { httpRequestWithAuthentication: async (_type, options) => responder(options) },
	};
}

// Diz se uma propriedade aparece na versão do node, lendo a condição `@version` do displayOptions.
function visibleIn(property, version) {
	const conditions = property.displayOptions?.show?.['@version'];
	if (!conditions) return true;
	return conditions.some((condition) =>
		typeof condition === 'number' ? condition === version : version >= condition._cnd.gte,
	);
}

const properties = new NuvemShop().description.properties;
const v1Properties = properties.filter((property) => visibleIn(property, 1));
const v2Properties = properties.filter((property) => visibleIn(property, 2));

describe('S2 versão 1 continua igual', () => {
	it('v1: order get chama GET /orders/871254203 na base 2025-03', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(1, { orderId: '871254203' }, async (options) => {
				request = options;
				return {};
			}),
			findOperation('order', 'get'),
			0,
		);
		assert.equal(request.method, 'GET');
		assert.equal(request.url, '/orders/871254203');
		assert.equal(request.baseURL, 'https://api.nuvemshop.com.br/2025-03/123456');
	});

	it('v1: created_at_min segue como texto sem mudança', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(
				1,
				{ filters: { createdAtMin: '2026-01-01T00:00:00Z' }, returnAll: false, limit: 10 },
				async (options) => {
					request = options;
					return [];
				},
			),
			findOperation('product', 'getMany'),
			0,
		);
		assert.equal(request.qs.created_at_min, '2026-01-01T00:00:00Z');
	});

	// O snapshot foi tirado da 1.1.3 antes da migração: cada parâmetro salvo em workflow antigo
	// precisa continuar existindo na v1 com o mesmo name, type e lugar na tela.
	it('v1: todo parâmetro da 1.1.3 mantém name e type', () => {
		const snapshot = JSON.parse(
			fs.readFileSync(path.join(__dirname, 'fixtures', 'v1-parameters.json'), 'utf8'),
		);
		assert.ok(snapshot.length > 400);
		const where = (show) => JSON.stringify({ r: show?.resource, o: show?.operation });
		for (const old of snapshot) {
			const match = v1Properties.find(
				(property) =>
					property.name === old.name &&
					property.type === old.type &&
					where(property.displayOptions?.show) === where(old.show),
			);
			assert.ok(match, `parâmetro perdido na v1: ${old.name} (${old.type}) ${where(old.show)}`);
			if (old.children) {
				const names = (match.options ?? []).map((option) => `${option.name}:${option.type}`);
				for (const child of old.children) {
					assert.ok(names.includes(`${child.name}:${child.type}`), `${old.name}.${child.name}`);
				}
			}
		}
	});

	it('o node declara version [1, 2] e defaultVersion 2', () => {
		const { version, defaultVersion } = new NuvemShop().description;
		assert.deepEqual(version, [1, 2]);
		assert.equal(defaultVersion, 2);
	});
});

// Os cinco IDs principais: nome de exibição do parâmetro -> método de busca esperado.
const ID_KINDS = {
	'Product ID': 'searchProducts',
	'Category ID': 'searchCategories',
	'Order ID': 'searchOrders',
	'Customer ID': 'searchCustomers',
	'Coupon ID': 'searchCoupons',
};

describe('S3 IDs principais com lista pesquisável', () => {
	it('v2: IDs principais são resourceLocator com list pesquisável e id', () => {
		const seen = new Set();
		let checked = 0;
		for (const resource of resourceDefinitions) {
			for (const operation of resource.operations) {
				for (const parameter of operation.pathParameters ?? []) {
					const method = ID_KINDS[parameter.displayName];
					if (!method) continue;
					const property = v2Properties.find(
						(candidate) =>
							candidate.name === parameter.name &&
							candidate.displayOptions?.show?.resource?.includes(resource.value) &&
							candidate.displayOptions?.show?.operation?.includes(operation.value),
					);
					const label = `${resource.value}/${operation.value}/${parameter.name}`;
					assert.ok(property, label);
					assert.equal(property.type, 'resourceLocator', label);
					assert.deepEqual(
						property.modes.map((mode) => mode.name),
						['list', 'id'],
						label,
					);
					assert.equal(property.modes[0].typeOptions.searchable, true, label);
					assert.equal(property.modes[0].typeOptions.searchListMethod, method, label);
					assert.equal(property.default.mode, 'list', label);
					seen.add(parameter.displayName);
					checked += 1;
				}
			}
		}
		assert.deepEqual([...seen].sort(), Object.keys(ID_KINDS).sort());
		assert.ok(checked > 40, `poucas operações conferidas: ${checked}`);
	});

	it('v2: orderId em modo list chama GET /orders/871254203', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(2, { orderId: { mode: 'list', value: '871254203' } }, async (options) => {
				request = options;
				return {};
			}),
			findOperation('order', 'get'),
			0,
		);
		assert.equal(request.url, '/orders/871254203');
	});

	it('v2: orderId em modo id remove espaço nas pontas', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(2, { orderId: { mode: 'id', value: ' 871254203 ' } }, async (options) => {
				request = options;
				return {};
			}),
			findOperation('order', 'get'),
			0,
		);
		assert.equal(request.url, '/orders/871254203');
	});

	// O sufixo " [item 0]" é acrescentado pela tela do n8n a partir do itemIndex; o erro leva o índice.
	it('v2: Resource Locator vazio lança NodeOperationError com descrição', async () => {
		await assert.rejects(
			executeDefinedOperation.call(
				executeContext(2, { orderId: { mode: 'list', value: '' } }),
				findOperation('order', 'get'),
				0,
			),
			(error) => {
				assert.equal(error.name, 'NodeOperationError');
				assert.equal(error.message, "The 'Order' parameter is empty");
				assert.equal(error.description, 'Choose an order from the list or paste its ID');
				assert.equal(error.context.itemIndex, 0);
				return true;
			},
		);
	});

	it('v2: getProductVariants lê o product_id do Resource Locator', async () => {
		let request;
		await loadOptions.getProductVariants.call(
			editorContext(
				async (options) => {
					request = options;
					return [];
				},
				{ product_id: { mode: 'list', value: '123' } },
			),
		);
		assert.ok(request, 'nenhuma chamada feita');
		assert.equal(request.url, '/products/123/variants');
	});
});
