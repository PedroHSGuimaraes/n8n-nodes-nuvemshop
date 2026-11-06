/**
 * Prova o `listSearch` da slice S3: a lista pesquisável e paginada dos cinco IDs principais.
 * O contexto falso grava cada requisição e devolve a página que o teste quer simular.
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { listSearch } = require('../dist/nodes/NuvemShop/methods/listSearch');

// Contexto do editor: grava todas as requisições e responde com a função do teste.
function editorContext(responder) {
	const requests = [];
	return {
		requests,
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion: 2 }),
		getCredentials: async () => ({
			region: 'br',
			apiVersion: '2025-03',
			storeId: '123456',
			accessToken: 'token',
			userAgent: 'test-agent (https://example.com)',
		}),
		helpers: {
			httpRequestWithAuthentication: async (_type, options) => {
				requests.push(options);
				return responder(options, requests.length);
			},
		},
	};
}

// Gera uma página de N itens com ids sequenciais a partir de `start`.
const page = (count, make, start = 1) =>
	Array.from({ length: count }, (_unused, index) => make(start + index));

describe('S3 listSearch', () => {
	it('listSearch de pedidos chama GET /orders com q, page e per_page', async () => {
		const context = editorContext(() => [
			{ id: 11, number: 100, contact_name: 'Maria Silva' },
			{ id: 12, number: 101, contact_name: 'Maria Souza' },
		]);
		const result = await listSearch.searchOrders.call(context, 'maria');
		const request = context.requests[0];
		assert.equal(request.method, 'GET');
		assert.equal(request.url, '/orders');
		assert.equal(request.qs.q, 'maria');
		assert.equal(request.qs.page, 1);
		assert.equal(request.qs.per_page, 50);
		assert.equal(request.qs.fields, 'id,number,contact_name');
		assert.deepEqual(result, {
			results: [
				{ name: '#100 — Maria Silva', value: '11' },
				{ name: '#101 — Maria Souza', value: '12' },
			],
		});
	});

	it('listSearch de produtos e clientes busca uma página por chamada', async () => {
		const products = editorContext(() =>
			page(50, (id) => ({ id, name: { pt: `Camiseta ${id}` } })),
		);
		const productResult = await listSearch.searchProducts.call(products, 'camiseta');
		assert.equal(products.requests.length, 1);
		assert.equal(products.requests[0].url, '/products');
		assert.equal(products.requests[0].qs.q, 'camiseta');
		assert.equal(products.requests[0].qs.per_page, 50);
		assert.deepEqual(productResult.results[0], { name: 'Camiseta 1 — 1', value: '1' });

		const customers = editorContext(() =>
			page(50, (id) => ({ id, name: `Cliente ${id}`, email: `c${id}@example.com` })),
		);
		const customerResult = await listSearch.searchCustomers.call(customers, 'cliente');
		assert.equal(customers.requests.length, 1);
		assert.equal(customers.requests[0].url, '/customers');
		assert.equal(customers.requests[0].qs.q, 'cliente');
		assert.equal(customerResult.results.length, 50);
	});

	it('listSearch devolve paginationToken só com página cheia', async () => {
		const full = editorContext(() => page(50, (id) => ({ id, number: id, contact_name: 'A' })));
		const first = await listSearch.searchOrders.call(full, undefined, undefined);
		assert.equal(first.paginationToken, '2');

		// O token vira o número da página seguinte na próxima chamada.
		await listSearch.searchOrders.call(full, undefined, '2');
		assert.equal(full.requests[1].qs.page, 2);

		const almost = editorContext(() => page(49, (id) => ({ id, number: id, contact_name: 'A' })));
		const last = await listSearch.searchOrders.call(almost);
		assert.equal(last.paginationToken, undefined);
		assert.equal(last.results.length, 49);

		const empty = editorContext(() => []);
		assert.deepEqual(await listSearch.searchOrders.call(empty), { results: [] });
	});

	it('listSearch de categorias filtra por contém sem acento até 5 páginas', async () => {
		const category = (id, name) => ({ id, name: { pt: name } });

		// Com 20 acertos já na página 2, a busca para sem pedir a página 3.
		const stops = editorContext((_options, call) =>
			page(
				200,
				(id) => category(id, call === 2 && id <= 220 ? `Camisêtas ${id}` : `Calça ${id}`),
				(call - 1) * 200 + 1,
			),
		);
		const found = await listSearch.searchCategories.call(stops, 'camise');
		assert.equal(stops.requests.length, 2);
		assert.equal(found.results.length, 20);
		// Parou na página 2 (cheia), então a próxima chamada recomeça na página 3.
		assert.equal(found.paginationToken, '3');
		assert.equal(stops.requests[0].qs.q, undefined, 'a rota de categorias não tem q');
		assert.equal(stops.requests[0].qs.per_page, 200);
		assert.deepEqual(found.results[0], { name: 'Camisêtas 201 — 201', value: '201' });

		// Sem nenhum acerto, para depois de 5 páginas e devolve o token da sexta.
		const none = editorContext((_options, call) =>
			page(200, (id) => category(id, `Calça ${id}`), (call - 1) * 200 + 1),
		);
		const empty = await listSearch.searchCategories.call(none, 'camise');
		assert.equal(none.requests.length, 5);
		assert.deepEqual(empty, { results: [], paginationToken: '6' });
	});

	it('listSearch de cupons usa q e mantém só código que contém o texto', async () => {
		const context = editorContext(() => [
			{ id: 1, code: 'WELCOME10' },
			{ id: 2, code: 'OUTRO' },
		]);
		const result = await listSearch.searchCoupons.call(context, 'welcome');
		assert.equal(context.requests[0].url, '/coupons');
		assert.equal(context.requests[0].qs.q, 'welcome');
		assert.deepEqual(result, { results: [{ name: 'WELCOME10 — 1', value: '1' }] });
	});

	it('listSearch repassa 401 como NodeApiError', async () => {
		// Os cinco buscadores usam o mesmo transporte; todos precisam repassar o 401.
		for (const method of [
			'searchProducts',
			'searchCategories',
			'searchOrders',
			'searchCustomers',
			'searchCoupons',
		]) {
			const context = editorContext(() => {
				throw Object.assign(new Error('Unauthorized'), { httpCode: '401' });
			});
			await assert.rejects(listSearch[method].call(context, 'x'), (error) => {
				assert.equal(error.name, 'NodeApiError', method);
				assert.equal(error.httpCode, '401', method);
				return true;
			});
		}
	});
});
