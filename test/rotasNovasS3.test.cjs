/**
 * Prova a slice S3 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
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

describe('S3 Recurso Price Table', () => {
	const operacoes = {
		create: ['POST', '/products/price-tables'],
		get: ['GET', '/products/price-tables/{priceTableId}'],
		getMany: ['GET', '/products/price-tables'],
		update: ['PUT', '/products/price-tables/{priceTableId}'],
		setCategories: ['PUT', '/products/price-tables/{priceTableId}/categories'],
		getCategory: ['GET', '/products/price-tables/{priceTableId}/categories/{categoryId}'],
		getCategories: ['GET', '/products/price-tables/{priceTableId}/categories'],
		deleteCategory: ['DELETE', '/products/price-tables/{priceTableId}/categories/{categoryId}'],
		setVariants: ['PUT', '/products/price-tables/{priceTableId}/product-variants'],
		getVariant: ['GET', '/products/price-tables/{priceTableId}/product-variants/{variantId}'],
		getVariants: ['GET', '/products/price-tables/{priceTableId}/product-variants'],
		deleteVariant: ['DELETE', '/products/price-tables/{priceTableId}/product-variants/{variantId}'],
		addCustomers: ['PUT', '/products/price-tables/{priceTableId}/customers'],
		approveCustomers: ['POST', '/products/price-tables/{priceTableId}/approve-customers'],
		getCustomers: ['GET', '/products/price-tables/{priceTableId}/customers'],
		deleteCustomer: ['DELETE', '/products/price-tables/{priceTableId}/customers/{customerId}'],
		getByCustomer: ['GET', '/products/price-tables/customers/{customerId}'],
	};

	it('priceTable expõe as 17 operações com método e caminho', () => {
		const recurso = resourceDefinitions.find((resource) => resource.value === 'priceTable');
		assert.ok(recurso, 'recurso priceTable');
		assert.equal(recurso.operations.length, 17);
		for (const [valor, [metodo, caminho]] of Object.entries(operacoes)) {
			const operacao = findOperation('priceTable', valor);
			assert.ok(operacao, valor);
			assert.equal(operacao.method, metodo, valor);
			assert.equal(operacao.path, caminho, valor);
		}
	});

	it('priceTable create envia o corpo da tabela', async () => {
		const { context } = await run(
			'priceTable',
			'create',
			{ name: 'Atacado', defaultDiscount: '7.00' },
			async () => ({ id: '1' }),
		);
		assert.equal(context.requests[0].method, 'POST');
		assert.equal(context.requests[0].url, '/products/price-tables');
		assert.deepEqual(context.requests[0].body, { name: 'Atacado', default_discount: '7.00' });
	});

	it('priceTable addCustomers envia o array de clientes', async () => {
		const { context } = await run(
			'priceTable',
			'addCustomers',
			{ priceTableId: { mode: 'list', value: '1' }, body: '["123","456"]' },
			async () => ({}),
		);
		assert.equal(context.requests[0].method, 'PUT');
		assert.equal(context.requests[0].url, '/products/price-tables/1/customers');
		assert.deepEqual(context.requests[0].body, ['123', '456']);
	});

	it('paginação usa per_page 10, 50 e 200 conforme a operação', async () => {
		const tamanhos = {};
		for (const [recurso, operacao, esperado] of [
			['priceTable', 'getMany', 10],
			['priceTable', 'getCategories', 50],
			['priceTable', 'getVariants', 50],
			['priceTable', 'getCustomers', 50],
			['product', 'getMany', 200],
		]) {
			const { context } = await run(
				recurso,
				operacao,
				{ priceTableId: '1', returnAll: true },
				async () => [],
			);
			tamanhos[`${recurso}.${operacao}`] = context.requests[0].qs.per_page;
			assert.equal(context.requests[0].qs.per_page, esperado, `${recurso}.${operacao}`);
		}
		assert.equal(Object.keys(tamanhos).length, 5);
	});

	it('priceTable usa Resource Locator na v2 e texto na v1', () => {
		for (const [operacao, nome] of [
			['get', 'priceTableId'],
			['deleteCustomer', 'priceTableId'],
			['deleteCustomer', 'customerId'],
			['getByCustomer', 'customerId'],
		]) {
			const v2 = propertiesOf('priceTable', operacao, 2).find((property) => property.name === nome);
			assert.equal(v2.type, 'resourceLocator', `${operacao}.${nome} v2`);
			assert.deepEqual(
				v2.modes.map((mode) => mode.name),
				['list', 'id'],
			);
			assert.equal(v2.default.mode, 'list');
			const v1 = propertiesOf('priceTable', operacao, 1).find((property) => property.name === nome);
			assert.equal(v1.type, 'string', `${operacao}.${nome} v1`);
		}
	});

	it('listSearch de tabelas de preço pede uma página de 10 e devolve o token', async () => {
		const cheia = editorContext(() =>
			Array.from({ length: 10 }, (_unused, index) => ({
				id: String(index + 1),
				name: `Tabela ${index + 1}`,
			})),
		);
		const resultado = await listSearch.searchPriceTables.call(cheia);
		assert.equal(cheia.requests[0].url, '/products/price-tables');
		assert.equal(cheia.requests[0].qs.page, 1);
		assert.equal(cheia.requests[0].qs.per_page, 10);
		assert.equal(resultado.results.length, 10);
		assert.deepEqual(resultado.results[0], { name: 'Tabela 1 — 1', value: '1' });
		assert.equal(resultado.paginationToken, '2');

		const incompleta = editorContext(() => [{ id: '7', name: 'Única' }]);
		const ultima = await listSearch.searchPriceTables.call(incompleta, undefined, '2');
		assert.equal(incompleta.requests[0].qs.page, 2);
		assert.equal(ultima.paginationToken, undefined);
	});

	it('addCustomers com 409 lança NodeApiError', async () => {
		await assert.rejects(
			run('priceTable', 'addCustomers', { priceTableId: '1', body: '["123"]' }, async () => {
				throw Object.assign(new Error('Conflict'), {
					httpCode: '409',
					response: { body: { code: 409, errors: [{ customers: ['123'] }] } },
				});
			}),
			(error) => error.name === 'NodeApiError',
		);
	});

	it('priceTable deleteVariant chama o DELETE da variante', async () => {
		const { context } = await run(
			'priceTable',
			'deleteVariant',
			{ priceTableId: { mode: 'id', value: '5' }, variantId: '136548285' },
			async () => ({}),
		);
		assert.equal(context.requests[0].method, 'DELETE');
		assert.equal(context.requests[0].url, '/products/price-tables/5/product-variants/136548285');
	});
});
