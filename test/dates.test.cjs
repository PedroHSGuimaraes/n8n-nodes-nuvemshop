/**
 * Prova a slice S4 do plano node-cli-campos-v2: na versão 2 os filtros de data viram seletor
 * de data (dateTime) e o `Values` de variante vira uma lista de campos (fixedCollection).
 * A versão 1 não muda: o plano exige que os mesmos campos continuem texto lá.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { findOperation, resourceDefinitions } = require('../dist/nodes/NuvemShop/actions');
const { executeDefinedOperation } = require('../dist/nodes/NuvemShop/actions/execute');
const { NuvemShop } = require('../dist/nodes/NuvemShop/NuvemShop.node');

const credentials = {
	region: 'br',
	apiVersion: '2025-03',
	storeId: '123456',
	accessToken: 'token',
	userAgent: 'test-agent (https://example.com)',
};

function executeContext(typeVersion, parameters, responder = async () => ({})) {
	return {
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion }),
		getNodeParameter: (name, _itemIndex, defaultValue) => parameters[name] ?? defaultValue,
		getCredentials: async () => credentials,
		helpers: { httpRequestWithAuthentication: async (_type, options) => responder(options) },
	};
}

// Mesma regra de visibilidade por `@version` usada no teste do Resource Locator.
function visibleIn(property, version) {
	const conditions = property.displayOptions?.show?.['@version'];
	if (!conditions) return true;
	return conditions.some((condition) =>
		typeof condition === 'number' ? condition === version : version >= condition._cnd.gte,
	);
}

const properties = new NuvemShop().description.properties;
const forOperation = (resource, operation, version, name) =>
	properties.filter(
		(property) =>
			property.name === name &&
			visibleIn(property, version) &&
			property.displayOptions?.show?.resource?.includes(resource) &&
			property.displayOptions?.show?.operation?.includes(operation),
	);

const COUPON_DATES = ['min_start_date', 'min_end_date', 'max_start_date', 'max_end_date'];
const camel = (text) => text.replace(/_([a-z0-9])/g, (_match, char) => char.toUpperCase());

// Chaves de data que o exemplo de consulta de uma operação declara.
function dateKeys(operation) {
	if (!operation.query) return [];
	return Object.keys(JSON.parse(operation.query.example)).filter(
		(key) => /_at_(min|max)$/.test(key) || COUPON_DATES.includes(key),
	);
}

describe('S4 datas dos filtros', () => {
	it('v2: filtros de data são dateTime', () => {
		let operations = 0;
		let fields = 0;
		for (const resource of resourceDefinitions) {
			for (const operation of resource.operations) {
				const keys = dateKeys(operation);
				if (!keys.length) continue;
				const [v1] = forOperation(resource.value, operation.value, 1, 'filters');
				const [v2] = forOperation(resource.value, operation.value, 2, 'filters');
				assert.ok(v1 && v2, `${resource.value}/${operation.value}: filters nas duas versões`);
				for (const key of keys) {
					const type = (collection) =>
						collection.options.find((option) => option.name === camel(key))?.type;
					assert.equal(type(v1), 'string', `v1 ${resource.value}/${operation.value}/${key}`);
					assert.equal(type(v2), 'dateTime', `v2 ${resource.value}/${operation.value}/${key}`);
					fields += 1;
				}
				operations += 1;
			}
		}
		// Os quatro filtros de data de cada listagem e as quatro datas de cupom existem de fato.
		assert.ok(operations >= 6, `poucas operações com data: ${operations}`);
		assert.ok(fields >= 24, `poucos campos de data: ${fields}`);
		const coupons = dateKeys(findOperation('coupon', 'getMany'));
		for (const key of COUPON_DATES) assert.ok(coupons.includes(key), key);
	});

	it('v2: data sem fuso segue como veio', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(
				2,
				{ filters: { createdAtMin: '2026-07-01T00:00:00' }, returnAll: false, limit: 5 },
				async (options) => {
					request = options;
					return [];
				},
			),
			findOperation('product', 'getMany'),
			0,
		);
		assert.equal(request.qs.created_at_min, '2026-07-01T00:00:00');
	});

	it('v2: data com fuso segue igual', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(
				2,
				{ filters: { createdAtMin: '2026-07-01T00:00:00-03:00' }, returnAll: false, limit: 5 },
				async (options) => {
					request = options;
					return [];
				},
			),
			findOperation('product', 'getMany'),
			0,
		);
		assert.equal(request.qs.created_at_min, '2026-07-01T00:00:00-03:00');
	});

	it('v2: datas de cupom viram AAAA-MM-DD', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(
				2,
				{ filters: { minStartDate: '2026-01-01T00:00:00' }, returnAll: false, limit: 5 },
				async (options) => {
					request = options;
					return [];
				},
			),
			findOperation('coupon', 'getMany'),
			0,
		);
		assert.equal(request.qs.min_start_date, '2026-01-01');
	});

	it('v2: data fora do ISO 8601 lança NodeOperationError', async () => {
		let called = false;
		await assert.rejects(
			executeDefinedOperation.call(
				executeContext(
					2,
					{ filters: { createdAtMin: 'ontem' }, returnAll: false, limit: 5 },
					async () => {
						called = true;
						return [];
					},
				),
				findOperation('product', 'getMany'),
				0,
			),
			(error) => {
				assert.equal(error.name, 'NodeOperationError');
				assert.equal(
					error.description,
					'Pick a date from the calendar or use the format 2026-07-01T00:00:00Z',
				);
				return true;
			},
		);
		assert.equal(called, false, 'nenhuma requisição deve sair com data inválida');
	});
});

describe('S4 Values de variante', () => {
	const operations = ['create', 'update'];

	it('v2: Values de variante é fixedCollection', () => {
		for (const operation of operations) {
			const [v2Collection] = forOperation('productVariant', operation, 2, 'variantValues');
			assert.ok(v2Collection, `productVariant/${operation}: variantValues na v2`);
			assert.equal(v2Collection.type, 'fixedCollection');
			assert.equal(v2Collection.typeOptions.multipleValues, true);
			const row = v2Collection.options[0];
			assert.deepEqual(
				row.values.map((value) => value.name),
				['language', 'text'],
			);
			assert.deepEqual(
				row.values[0].options.map((option) => option.value),
				['pt', 'pt_BR', 'es', 'es_AR', 'en'],
			);
			// Na v2 o JSON cru `values` sai do bodyFields; na v1 ele continua onde já existia
			// (só o exemplo de criação trazia `values`; a atualização ganha o campo apenas na v2).
			const names = (version) =>
				forOperation('productVariant', operation, version, 'bodyFields')[0].options.map(
					(option) => option.name,
				);
			assert.equal(names(2).includes('values'), false, `${operation} v2 ainda tem values`);
			if (operation === 'create') {
				assert.equal(names(1).includes('values'), true, 'create v1 perdeu values');
			}
			assert.equal(forOperation('productVariant', operation, 1, 'variantValues').length, 0);
		}
	});

	it('v2: Values de variante vira array de objetos por idioma', async () => {
		let request;
		await executeDefinedOperation.call(
			executeContext(
				2,
				{
					product_id: { mode: 'list', value: '123' },
					variantValues: {
						values: [
							{ language: 'pt', text: 'Tamanho G' },
							{ language: 'pt', text: 'Azul' },
						],
					},
					bodyFields: { sku: 'CAM-G' },
				},
				async (options) => {
					request = options;
					return {};
				},
			),
			findOperation('productVariant', 'create'),
			0,
		);
		assert.equal(request.method, 'POST');
		assert.equal(request.url, '/products/123/variants');
		assert.deepEqual(request.body.values, [{ pt: 'Tamanho G' }, { pt: 'Azul' }]);
		assert.equal(request.body.sku, 'CAM-G');
	});
});
