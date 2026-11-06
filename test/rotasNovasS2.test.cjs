/**
 * Prova a slice S2 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
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

describe('S2 Trigger e Webhook aceitam os 13 eventos novos', () => {
	const novos = [
		'app_subscription/updated',
		'charge/created',
		'charge/failed',
		'charge/paid',
		'checkout/created',
		'checkout/updated',
		'coupon/deleted',
		'fulfillment_order/label_created',
		'fulfillment_order/label_deleted',
		'navigation/updated',
		'order/in_fraud_analysis',
		'order/in_preparation',
		'theme/updated',
	];

	it('os 13 eventos novos estão em NUVEMSHOP_WEBHOOK_EVENTS', () => {
		for (const evento of novos) assert.ok(NUVEMSHOP_WEBHOOK_EVENTS.includes(evento), evento);
	});

	it('a lista tem 57 eventos únicos em ordem alfabética', () => {
		assert.equal(NUVEMSHOP_WEBHOOK_EVENTS.length, 57);
		assert.equal(new Set(NUVEMSHOP_WEBHOOK_EVENTS).size, 57);
		assert.deepEqual([...NUVEMSHOP_WEBHOOK_EVENTS], [...NUVEMSHOP_WEBHOOK_EVENTS].sort());
	});

	it('o trigger mostra os 57 eventos no dropdown', () => {
		const eventos = new NuvemShopTrigger().description.properties.find(
			(property) => property.name === 'events',
		);
		assert.deepEqual(
			eventos.options.map((option) => option.value),
			[...NUVEMSHOP_WEBHOOK_EVENTS],
		);
		assert.equal(eventos.options.length, 57);
	});

	it('webhook create envia checkout/updated', async () => {
		const { context } = await run(
			'webhook',
			'create',
			{ bodyFields: { event: 'checkout/updated', url: 'https://example.com/hook' } },
			async () => ({ id: 1 }),
		);
		assert.equal(context.requests[0].method, 'POST');
		assert.equal(context.requests[0].url, '/webhooks');
		assert.equal(context.requests[0].body.event, 'checkout/updated');
	});

	it('eventos de privacidade seguem na lista e como só do Portal', () => {
		const eventos = new NuvemShopTrigger().description.properties.find(
			(property) => property.name === 'events',
		).options;
		for (const evento of ['store/redact', 'customers/redact', 'customers/data_request']) {
			assert.ok(NUVEMSHOP_WEBHOOK_EVENTS.includes(evento), evento);
			assert.match(
				eventos.find((option) => option.value === evento).description,
				/Partners portal/,
			);
		}
	});
});
