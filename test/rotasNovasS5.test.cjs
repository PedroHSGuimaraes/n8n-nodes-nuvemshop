/**
 * Prova a slice S5 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
 * teste é a linha que o checks.md espera ler.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
	NUVEMSHOP_WEBHOOK_EVENTS,
	NuvemShop,
	NuvemShopTrigger,
	editorContext,
	executeContext,
	executeDefinedOperation,
	findOperation,
	listSearch,
	operationNames,
	properties,
	propertiesOf,
	resourceDefinitions,
	root,
	run,
	visibleIn,
} = require('./helpers/rotasNovas.cjs');

describe('S5 Campos novos em rotas já cobertas', () => {
	it('order create envia inventory_behaviour claim', async () => {
		const { context } = await run(
			'order',
			'create',
			{ bodyFields: { inventoryBehaviour: 'claim' }, body: '{}' },
			async () => ({}),
		);
		assert.equal(context.requests[0].method, 'POST');
		assert.equal(context.requests[0].url, '/orders');
		assert.equal(context.requests[0].body.inventory_behaviour, 'claim');
		const campo = propertiesOf('order', 'create')
			.find((property) => property.name === 'bodyFields')
			.options.find((option) => option.name === 'inventoryBehaviour');
		assert.deepEqual(
			campo.options.map((option) => option.value),
			['bypass', 'claim'],
		);
	});

	it('a descrição de order create explica o claim e o 422', () => {
		const descricao = findOperation('order', 'create').description;
		assert.match(descricao, /claim/);
		assert.match(descricao, /422/);
		assert.match(descricao, /Not enough stock for variant/);
	});

	it('fulfillment order update oferece e envia IN_PREPARATION', async () => {
		const operacao = findOperation('fulfillmentOrder', 'update');
		const campo = propertiesOf('fulfillmentOrder', 'update')
			.find((property) => property.name === 'bodyFields')
			.options.find((option) => option.name === 'status');
		assert.ok(campo.options.some((option) => option.value === 'IN_PREPARATION'));
		assert.match(operacao.description, /IN_PREPARATION/);
		const { context } = await run(
			'fulfillmentOrder',
			'update',
			{
				order_id: '1',
				fulfillment_order_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
				bodyFields: { status: 'IN_PREPARATION' },
				body: '{}',
			},
			async () => ({}),
		);
		assert.equal(context.requests[0].method, 'PATCH');
		assert.equal(context.requests[0].body.status, 'IN_PREPARATION');
	});

	it('v2: todo parâmetro da 1.2.0 mantém name e type', () => {
		const snapshot = JSON.parse(
			fs.readFileSync(path.join(__dirname, 'fixtures', 'v2-parameters-1.2.0.json'), 'utf8'),
		);
		assert.ok(snapshot.length > 400);
		const onde = (show) => JSON.stringify({ r: show?.resource, o: show?.operation });
		const v2 = properties.filter((property) => visibleIn(property, 2));
		for (const antigo of snapshot) {
			const achou = v2.find(
				(property) =>
					property.name === antigo.name &&
					property.type === antigo.type &&
					onde(property.displayOptions?.show) === onde(antigo.show),
			);
			assert.ok(achou, `parâmetro perdido na v2: ${antigo.name} (${antigo.type})`);
		}
	});
});
