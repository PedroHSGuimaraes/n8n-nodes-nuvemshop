const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

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
