const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { NuvemShopApi } = require('../dist/credentials/NuvemShopApi.credentials');
const { findOperation } = require('../dist/nodes/NuvemShop/actions');
const {
	executeCustomApiCall,
	executeDefinedOperation,
} = require('../dist/nodes/NuvemShop/actions/execute');
const { loadOptions } = require('../dist/nodes/NuvemShop/methods/loadOptions');
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

describe('Nuvem Shop guided request fields', () => {
	it('serializes multi-select query filters as comma-separated API values', async () => {
		let receivedOptions;
		const getManyOrders = findOperation('order', 'getMany');
		await executeDefinedOperation.call(
			definedApiContext(
				{
					filters: {
						aggregates: ['fulfillment_orders', 'custom_fields'],
						fields: ['id', 'number', 'total'],
					},
					returnAll: false,
					limit: 10,
				},
				(_credentialType, options) => {
					receivedOptions = options;
					return [];
				},
			),
			getManyOrders,
			0,
		);

		assert.equal(receivedOptions.qs.aggregates, 'fulfillment_orders,custom_fields');
		assert.equal(receivedOptions.qs.fields, 'id,number,total');
	});

	it('preserves API arrays selected through multi-select fields', async () => {
		let receivedOptions;
		const createProduct = findOperation('product', 'create');
		await executeDefinedOperation.call(
			definedApiContext(
				{
					name: 'Camiseta',
					bodyFields: { categories: ['4567', '5678'] },
				},
				(_credentialType, options) => {
					receivedOptions = options;
					return { id: 1234 };
				},
			),
			createProduct,
			0,
		);

		assert.deepEqual(receivedOptions.body.categories, [4567, 5678]);
	});

	it('applies a selected coupon without requiring Advanced Body JSON', async () => {
		let receivedOptions;
		const applyCoupon = findOperation('abandonedCheckout', 'applyCoupon');
		assert.ok(applyCoupon);

		await executeDefinedOperation.call(
			definedApiContext({ cartId: '397256730', couponId: '32967' }, (_credentialType, options) => {
				receivedOptions = options;
				return { id: 397256730 };
			}),
			applyCoupon,
			0,
		);

		assert.equal(receivedOptions.url, '/checkouts/397256730/coupon');
		assert.deepEqual(receivedOptions.body, { coupon_id: 32967 });
	});

	it('merges guided product fields over advanced JSON and converts API shapes', async () => {
		let receivedOptions;
		const parameters = {
			name: 'Camiseta guiada',
			bodyFields: {
				published: true,
				categories: '4567, 5678',
				variants: '[{"sku":"CAM-M","price":"79.90"}]',
			},
			body: '{"brand":"Acme","published":false}',
		};
		const requestContext = {
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
				httpRequestWithAuthentication: async (_credentialType, options) => {
					receivedOptions = options;
					return { id: 1234 };
				},
			},
		};

		const productCreate = findOperation('product', 'create');
		assert.ok(productCreate);
		assert.deepEqual(await executeDefinedOperation.call(requestContext, productCreate, 0), {
			id: 1234,
		});
		assert.deepEqual(receivedOptions.body, {
			brand: 'Acme',
			published: true,
			name: { pt: 'Camiseta guiada' },
			categories: [4567, 5678],
			variants: [{ sku: 'CAM-M', price: '79.90' }],
		});
	});

	it('rejects invalid JSON inside a guided complex field before the request', async () => {
		const productCreate = findOperation('product', 'create');
		assert.ok(productCreate);
		const requestContext = {
			getNode: context.getNode,
			getNodeParameter: (name, _itemIndex, defaultValue) => {
				if (name === 'name') return 'Camiseta';
				if (name === 'bodyFields') return { variants: '[invalid' };
				return defaultValue;
			},
		};

		await assert.rejects(
			executeDefinedOperation.call(requestContext, productCreate, 0),
			/field "Variants" must contain valid JSON/,
		);
	});

	it('rejects null and primitive values when a guided field requires a JSON object', async () => {
		const orderCreate = findOperation('order', 'create');
		for (const customer of ['null', '42', '"customer"']) {
			await assert.rejects(
				executeDefinedOperation.call(
					definedApiContext({ bodyFields: { customer } }),
					orderCreate,
					0,
				),
				/field "Customer" must contain a JSON object/,
			);
		}
	});

	it('preserves a multilingual name supplied only through legacy Advanced Body JSON', async () => {
		let receivedOptions;
		const productCreate = findOperation('product', 'create');
		const requestContext = definedApiContext(
			{
				body: '{"name":{"pt":"Camiseta","es":"Remera","en":"T-Shirt"}}',
				bodyFields: {},
			},
			(_credentialType, options) => {
				receivedOptions = options;
				return { id: 1234 };
			},
		);

		await executeDefinedOperation.call(requestContext, productCreate, 0);
		assert.deepEqual(receivedOptions.body.name, {
			pt: 'Camiseta',
			es: 'Remera',
			en: 'T-Shirt',
		});
	});

	it('uses the selected content language for guided multilingual fields', async () => {
		let receivedOptions;
		const productCreate = findOperation('product', 'create');
		const requestContext = definedApiContext(
			{ name: 'Remera', contentLanguage: 'es' },
			(_credentialType, options) => {
				receivedOptions = options;
				return { id: 1234 };
			},
		);

		await executeDefinedOperation.call(requestContext, productCreate, 0);
		assert.deepEqual(receivedOptions.body.name, { es: 'Remera' });
	});

	it('does not let empty guided defaults overwrite a complete legacy draft-order body', async () => {
		let receivedOptions;
		const draftCreate = findOperation('draftOrder', 'create');
		const legacyBody = {
			contact_name: 'Maria',
			contact_lastname: 'Silva',
			contact_email: 'maria@example.com',
			payment_status: 'unpaid',
			products: [{ variant_id: 123, quantity: 1 }],
		};
		const requestContext = definedApiContext(
			{ body: JSON.stringify(legacyBody), products: '[]', paymentStatus: '' },
			(_credentialType, options) => {
				receivedOptions = options;
				return { id: 999 };
			},
		);

		await executeDefinedOperation.call(requestContext, draftCreate, 0);
		assert.deepEqual(receivedOptions.body, legacyBody);
	});

	it('preserves non-empty legacy array bodies and rejects the wrong body shape', async () => {
		let receivedOptions;
		const updateStockPrice = findOperation('product', 'updateStockPrice');
		const requestContext = definedApiContext(
			{ body: '[{"id":53786462,"variants":[]}]' },
			(_credentialType, options) => {
				receivedOptions = options;
				return [];
			},
		);

		await executeDefinedOperation.call(requestContext, updateStockPrice, 0);
		assert.deepEqual(receivedOptions.body, [{ id: 53786462, variants: [] }]);
		await assert.rejects(
			executeDefinedOperation.call(
				definedApiContext({ body: '{"id":53786462}' }),
				updateStockPrice,
				0,
			),
			/requires a JSON array/,
		);
	});

	it('rejects an empty required body before making the API request', async () => {
		const productUpdate = findOperation('product', 'update');
		let requestCalled = false;
		const requestContext = definedApiContext({ id: '1234' }, () => {
			requestCalled = true;
		});

		await assert.rejects(
			executeDefinedOperation.call(requestContext, productUpdate, 0),
			/requires a request body/,
		);
		assert.equal(requestCalled, false);
	});
});

describe('Nuvem Shop dynamic selectors', () => {
	it('does not request variants while the parent product is an unresolved expression', async () => {
		let requestCalled = false;
		const options = await loadOptions.getProductVariants.call({
			getCurrentNodeParameter: () => '={{ $json.product_id }}',
			helpers: {
				httpRequestWithAuthentication: async () => {
					requestCalled = true;
				},
			},
		});

		assert.deepEqual(options, []);
		assert.equal(requestCalled, false);
	});

	it('adds IDs to dynamic option labels so duplicate names stay distinguishable', async () => {
		const options = await loadOptions.getProducts.call({
			getNode: context.getNode,
			getCredentials: async () => credentials({ accessToken: 'token', userAgent: 'test' }),
			helpers: {
				httpRequestWithAuthentication: async () => [
					{ id: 123, name: { pt: 'Camiseta' } },
					{ id: 456, name: { pt: 'Camiseta' } },
				],
			},
		});

		assert.deepEqual(options, [
			{ name: 'Camiseta — 123', value: '123' },
			{ name: 'Camiseta — 456', value: '456' },
		]);
	});
});

function definedApiContext(parameters, request = async () => ({})) {
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
		helpers: { httpRequestWithAuthentication: request },
	};
}

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
