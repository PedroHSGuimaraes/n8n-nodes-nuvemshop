const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { findOperation, resourceDefinitions } = require('../dist/nodes/NuvemShop/actions');

function placeholders(path) {
	return [...path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function operation(resourceValue, operationValue) {
	const result = findOperation(resourceValue, operationValue);
	assert.ok(result, `${resourceValue}/${operationValue}`);
	return result;
}

function example(resourceValue, operationValue) {
	const body = operation(resourceValue, operationValue).body;
	assert.ok(body, `${resourceValue}/${operationValue} body`);
	return JSON.parse(body.example);
}

describe('Nuvem Shop endpoint definitions', () => {
	it('covers every documented resource family', () => {
		const requiredResources = [
			'abandonedCheckout',
			'authorization',
			'billing',
			'blog',
			'businessRule',
			'cart',
			'category',
			'categoryCustomField',
			'coupon',
			'customer',
			'customerCustomField',
			'discount',
			'dispute',
			'draftOrder',
			'emailTemplate',
			'fulfillmentOrder',
			'kit',
			'legacyFulfillmentEvent',
			'location',
			'metafield',
			'order',
			'orderCustomField',
			'page',
			'paymentOption',
			'paymentProvider',
			'product',
			'productCustomField',
			'productImage',
			'productVariant',
			'productVariantCustomField',
			'script',
			'shippingCarrier',
			'shippingCarrierOption',
			'store',
			'transaction',
			'webhook',
		];
		const actual = resourceDefinitions.map((resource) => resource.value);
		for (const required of requiredResources) assert.ok(actual.includes(required), required);
	});

	it('has unique resources and at least 198 explicit operations', () => {
		const resourceValues = resourceDefinitions.map((resource) => resource.value);
		assert.equal(new Set(resourceValues).size, resourceValues.length);
		const operationCount = resourceDefinitions.reduce(
			(total, resource) => total + resource.operations.length,
			0,
		);
		assert.ok(operationCount >= 198, `operation count: ${operationCount}`);
	});

	it('has unambiguous AI actions and operation values', () => {
		for (const resource of resourceDefinitions) {
			assert.ok(resource.description.length > 20, resource.value);
			const operationValues = resource.operations.map((operation) => operation.value);
			assert.equal(new Set(operationValues).size, operationValues.length, resource.value);

			for (const operation of resource.operations) {
				const key = `${resource.value}/${operation.value}`;
				assert.ok(operation.action.length > 8, key);
				assert.ok(operation.description.length > 40, key);
				assert.equal(findOperation(resource.value, operation.value), operation);
			}
		}
	});

	it('declares every path placeholder exactly once', () => {
		for (const resource of resourceDefinitions) {
			for (const operation of resource.operations) {
				const actual = (operation.pathParameters ?? []).map((parameter) => parameter.name).sort();
				assert.deepEqual(
					actual,
					placeholders(operation.path),
					`${resource.value}/${operation.value}`,
				);
			}
		}
	});

	it('contains valid JSON examples for every body and query', () => {
		for (const resource of resourceDefinitions) {
			for (const operation of resource.operations) {
				if (operation.body) JSON.parse(operation.body.example);
				if (operation.query) JSON.parse(operation.query.example);
			}
		}
	});

	it('preserves special API base URL and version contracts', () => {
		const discount = resourceDefinitions.find((resource) => resource.value === 'discount');
		assert.ok(discount);
		assert.ok(discount.operations.every(({ scope }) => scope === 'unversionedStore'));
		assert.equal(operation('kit', 'get').apiVersion, '2025-03');
		assert.equal(operation('order', 'editUnstable').apiVersion, 'unstable');
	});

	it('preserves documented custom-field body shapes', () => {
		for (const resource of ['customerCustomField', 'orderCustomField']) {
			assert.ok(Array.isArray(example(resource, 'create').values));
			assert.deepEqual(Object.keys(example(resource, 'update')), ['values']);
			assert.ok(Array.isArray(example(resource, 'setValues')));
			assert.equal(operation(resource, 'getOwners').paginated, undefined);
		}
	});

	it('preserves documented commerce and content write contracts', () => {
		assert.deepEqual(Object.keys(example('order', 'update')).sort(), ['owner_note', 'status']);
		assert.ok(example('draftOrder', 'create').contact_email);
		assert.ok(example('draftOrder', 'create').payment_status);
		assert.equal(typeof example('transaction', 'create').first_event.amount, 'object');
		assert.equal(typeof example('transaction', 'createEvent').amount, 'object');
		assert.equal(example('dispute', 'create').reason_code, 'fraudulent_activity');
		assert.equal(typeof example('dispute', 'update').retained_total, 'object');
		assert.equal(typeof example('blog', 'createPost').thumbnail, 'string');
		assert.ok(example('blog', 'uploadThumbnail').image.$binary);
		assert.deepEqual(Object.keys(example('page', 'update')).sort(), ['content', 'title']);
	});
});
