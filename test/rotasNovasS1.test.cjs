/**
 * Prova a slice S1 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
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

describe('S1 Payment Option aponta para a rota da doc', () => {
	it('payment option getMany chama GET /payment_providers/options', async () => {
		const { context } = await run('paymentOption', 'getMany', {}, async () => []);
		assert.equal(context.requests.length, 1);
		assert.equal(context.requests[0].method, 'GET');
		assert.equal(context.requests[0].url, '/payment_providers/options');
		assert.notEqual(context.requests[0].url, '/payment-options');
	});

	it('a descrição de payment option cita o escopo read_payments', () => {
		assert.match(findOperation('paymentOption', 'getMany').description, /read_payments/);
	});

	it('businessRule getPaymentOptions segue em /payment_providers/options', () => {
		const operation = findOperation('businessRule', 'getPaymentOptions');
		assert.equal(operation.method, 'GET');
		assert.equal(operation.path, '/payment_providers/options');
	});
});
