const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { NuvemShopApi } = require('../dist/credentials/NuvemShopApi.credentials');
const { executeCustomApiCall } = require('../dist/nodes/NuvemShop/actions/execute');
const { buildNuvemShopBaseUrl } = require('../dist/nodes/NuvemShop/transport');

const context = {
	getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion: 1 }),
};

function credentials(overrides = {}) {
	return {
		region: 'br',
		apiVersion: '2025-03',
		storeId: '123456',
		appId: '9876',
		...overrides,
	};
}

describe('Nuvem Shop base URL resolution', () => {
	it('builds Brazilian store URLs', () => {
		assert.equal(
			buildNuvemShopBaseUrl(context, credentials(), 'store'),
			'https://api.nuvemshop.com.br/2025-03/123456',
		);
	});

	it('builds international partner URLs', () => {
		assert.equal(
			buildNuvemShopBaseUrl(
				context,
				credentials({ region: 'international', apiVersion: 'v1' }),
				'partner',
			),
			'https://api.tiendanube.com/v1/apps/9876',
		);
	});

	it('uses explicit version overrides', () => {
		assert.equal(
			buildNuvemShopBaseUrl(context, credentials(), 'store', 'v1'),
			'https://api.nuvemshop.com.br/v1/123456',
		);
	});

	it('builds unversioned store URLs for the Discount API', () => {
		assert.equal(
			buildNuvemShopBaseUrl(context, credentials(), 'unversionedStore'),
			'https://api.nuvemshop.com.br/123456',
		);
	});

	it('uses the regional web origin for authorization', () => {
		assert.equal(
			buildNuvemShopBaseUrl(context, credentials({ region: 'international' }), 'authorization'),
			'https://www.tiendanube.com',
		);
	});
});

describe('Nuvem Shop request security', () => {
	it('uses the project support URL instead of a personal email in the default User-Agent', () => {
		const userAgent = new NuvemShopApi().properties.find(({ name }) => name === 'userAgent');
		const expected =
			'n8n-nodes-nuvemshop (https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop)';

		assert.ok(userAgent);
		assert.equal(userAgent.required, true);
		assert.equal(userAgent.default, expected);
		assert.equal(new URL(userAgent.default.slice(22, -1)).hostname, 'github.com');
		assert.doesNotMatch(userAgent.default, /@/);
	});

	it('rejects unsafe custom endpoints before making an HTTP request', async () => {
		const unsafeEndpoints = [
			'https://evil.example/products',
			'//evil.example/products',
			'/\\evil.example/products',
			'/../products',
			'/%2e%2e/products',
			'/%252e%252e/products',
			'/%2525252e%2525252e/products',
			'/products/%2f..%2fadmin',
			'/products/%5cadmin',
			'/products/%00admin',
			'/products/%250d%250aadmin',
			'/products\u0000',
		];

		for (const endpoint of unsafeEndpoints) {
			let requestCalled = false;
			const requestContext = customApiContext(endpoint, () => {
				requestCalled = true;
			});

			await assert.rejects(
				executeCustomApiCall.call(requestContext, 0),
				/safe relative Nuvemshop API path/,
				endpoint,
			);
			assert.equal(requestCalled, false, endpoint);
		}
	});

	it('allows normal relative custom endpoints containing dotted names', async () => {
		let receivedOptions;
		const requestContext = customApiContext('/products/sku.v2', (_credentialType, options) => {
			receivedOptions = options;
			return { ok: true };
		});

		assert.deepEqual(await executeCustomApiCall.call(requestContext, 0), { ok: true });
		assert.equal(receivedOptions.url, '/products/sku.v2');
	});
});

function customApiContext(endpoint, request) {
	const parameters = {
		endpoint,
		requestMethod: 'GET',
		requestScope: 'store',
		bodyType: 'json',
		responseType: 'json',
		query: '{}',
	};

	return {
		getNode: context.getNode,
		getNodeParameter: (name, _itemIndex, defaultValue) => parameters[name] ?? defaultValue,
		getCredentials: async () => ({
			region: 'br',
			apiVersion: '2025-03',
			storeId: '123456',
			accessToken: 'token',
			userAgent: 'test-agent (https://example.com)',
		}),
		helpers: {
			httpRequestWithAuthentication: request,
		},
	};
}
