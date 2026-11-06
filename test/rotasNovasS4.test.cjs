/**
 * Prova a slice S4 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
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

describe('S4 Remoções em massa com confirmação', () => {
	const casos = [
		['discount', 'deleteAllPromotions', '/promotions', 'confirmDeleteAllPromotions'],
		[
			'businessRule',
			'deleteIntegration',
			'/business_rules/integrations/{domain}',
			'confirmDeleteIntegration',
		],
	];

	it('as duas remoções têm método, caminho e confirmação desligada', () => {
		for (const [recurso, operacao, caminho, campo] of casos) {
			const definicao = findOperation(recurso, operacao);
			assert.equal(definicao.method, 'DELETE', operacao);
			assert.equal(definicao.path, caminho, operacao);
			const confirmacao = propertiesOf(recurso, operacao).find(
				(property) => property.name === campo,
			);
			assert.equal(confirmacao.type, 'boolean', campo);
			assert.equal(confirmacao.default, false, campo);
			assert.match(confirmacao.description, /^Warning:/, campo);
		}
	});

	it('remoção com confirmação desligada falha sem requisição', async () => {
		for (const [recurso, operacao] of casos) {
			const context = executeContext(2, { domain: 'payments', filters: { events: 'all' } });
			await assert.rejects(
				executeDefinedOperation.call(context, findOperation(recurso, operacao), 0),
				(error) => error.name === 'NodeOperationError',
				operacao,
			);
			assert.equal(context.requests.length, 0, operacao);
		}
	});

	it('deleteIntegration envia events na query', async () => {
		const { context } = await run(
			'businessRule',
			'deleteIntegration',
			{
				domain: 'payments',
				filters: { events: 'payments/before-filter' },
				confirmDeleteIntegration: true,
			},
			async () => ({}),
		);
		assert.equal(context.requests.length, 1);
		assert.equal(context.requests[0].method, 'DELETE');
		assert.equal(context.requests[0].url, '/business_rules/integrations/payments');
		assert.equal(context.requests[0].qs.events, 'payments/before-filter');
	});

	it('deleteIntegration sem events falha antes da requisição', async () => {
		const context = executeContext(2, {
			domain: 'payments',
			confirmDeleteIntegration: true,
		});
		await assert.rejects(
			executeDefinedOperation.call(context, findOperation('businessRule', 'deleteIntegration'), 0),
			(error) => error.name === 'NodeOperationError',
		);
		assert.equal(context.requests.length, 0);
	});

	it('deleteAllPromotions ligada envia DELETE /promotions sem corpo', async () => {
		const { context } = await run(
			'discount',
			'deleteAllPromotions',
			{ confirmDeleteAllPromotions: true },
			async () => ({}),
		);
		assert.equal(context.requests.length, 1);
		assert.equal(context.requests[0].method, 'DELETE');
		assert.equal(context.requests[0].url, '/promotions');
		assert.equal(context.requests[0].body, undefined);
	});

	it('deleteIntegration com events só de vírgulas e espaços falha antes da requisição', async () => {
		for (const events of [' , ', ',', ' ,  , ']) {
			const context = executeContext(2, {
				domain: 'payments',
				filters: { events },
				confirmDeleteIntegration: true,
			});
			await assert.rejects(
				executeDefinedOperation.call(
					context,
					findOperation('businessRule', 'deleteIntegration'),
					0,
				),
				(error) => error.name === 'NodeOperationError',
				JSON.stringify(events),
			);
			assert.equal(context.requests.length, 0, JSON.stringify(events));
		}
	});

	it('só o booleano verdadeiro libera a remoção em massa', async () => {
		for (const valor of ['true', 1, 'false', null, undefined]) {
			const context = executeContext(2, { confirmDeleteAllPromotions: valor });
			await assert.rejects(
				executeDefinedOperation.call(context, findOperation('discount', 'deleteAllPromotions'), 0),
				(error) => error.name === 'NodeOperationError',
				String(valor),
			);
			assert.equal(context.requests.length, 0, String(valor));
		}
	});
});
