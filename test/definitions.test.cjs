const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
	findOperation,
	resourceDefinitions,
	resourceProperties,
} = require('../dist/nodes/NuvemShop/actions');
const { NuvemShop } = require('../dist/nodes/NuvemShop/NuvemShop.node');

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

function activeProperties(resource, operationValue) {
	return resourceProperties.filter((property) => {
		const show = property.displayOptions?.show;
		return (
			show?.resource?.includes(resource) &&
			(!show.operation || show.operation.includes(operationValue))
		);
	});
}

describe('Nuvem Shop guided UX and AI tool schema', () => {
	it('keeps regular actions visible while exposing the node as an AI tool', () => {
		const metadata = JSON.parse(
			fs.readFileSync(
				path.join(__dirname, '..', 'dist', 'nodes', 'NuvemShop', 'NuvemShop.node.json'),
				'utf8',
			),
		);

		assert.equal(new NuvemShop().description.usableAsTool, true);
		assert.equal(metadata.categories.includes('AI'), false);
		assert.equal(metadata.subcategories?.AI?.includes('Tools') ?? false, false);
	});

	it('defaults to a read operation whenever the resource supports one', () => {
		for (const resource of resourceDefinitions) {
			const selector = resourceProperties.find(
				(property) =>
					property.name === 'operation' &&
					property.displayOptions?.show?.resource?.includes(resource.value),
			);
			assert.ok(selector, resource.value);
			const selected = operation(resource.value, selector.default);
			if (resource.operations.some(({ method }) => method === 'GET')) {
				assert.equal(selected.method, 'GET', `${resource.value}/${selected.value}`);
			}
		}
	});

	it('exposes required guided fields for common create operations', () => {
		const required = {
			category: ['name'],
			coupon: ['code', 'type', 'value'],
			customer: ['name', 'email'],
			draftOrder: ['contactName', 'contactLastname', 'contactEmail', 'paymentStatus', 'products'],
			product: ['name'],
		};

		for (const [resource, names] of Object.entries(required)) {
			const properties = activeProperties(resource, 'create');
			for (const name of names) {
				const property = properties.find((candidate) => candidate.name === name);
				assert.ok(property, `${resource}/create/${name}`);
				assert.match(property.displayName, /\(Required\)$/);
				assert.ok(property.description?.length > 30, `${resource}/create/${name} description`);
			}
			assert.ok(
				properties.some(({ name }) => name === 'body'),
				`${resource}/advanced body`,
			);
		}
	});

	it('makes abandoned-checkout coupon assignment fully guided', () => {
		const properties = activeProperties('abandonedCheckout', 'applyCoupon');
		const coupon = properties.find(({ name }) => name === 'couponId');

		assert.ok(coupon);
		assert.equal(coupon.displayName, 'Coupon Name or ID (Required)');
		assert.equal(coupon.type, 'options');
		assert.equal(coupon.typeOptions.loadOptionsMethod, 'getCoupons');
		assert.equal(coupon.required, true);
		assert.equal(
			properties.some(({ name }) => name === 'bodyFields'),
			false,
		);
		assert.equal(
			properties.some(({ name }) => name === 'body'),
			false,
		);
	});

	it('scopes enum options to the API operation that defines them', () => {
		const draftPayment = activeProperties('draftOrder', 'create').find(
			({ name }) => name === 'paymentStatus',
		);
		assert.equal(draftPayment.type, 'options');
		assert.deepEqual(
			draftPayment.options
				.map(({ value }) => value)
				.filter(Boolean)
				.sort(),
			['paid', 'pending_confirmation', 'unpaid'],
		);

		const orderFields = activeProperties('order', 'create').find(
			({ name }) => name === 'bodyFields',
		);
		const orderPayment = orderFields.options.find(({ name }) => name === 'paymentStatus');
		assert.equal(orderPayment.type, 'options');
		assert.deepEqual(orderPayment.options.map(({ value }) => value).sort(), [
			'authorized',
			'paid',
			'pending',
		]);
	});

	it('uses easy selectors for finite values and comma-separated lists', () => {
		const orderFilters = activeProperties('order', 'getMany').find(
			({ name }) => name === 'filters',
		);
		const aggregates = orderFilters.options.find(({ name }) => name === 'aggregates');
		const fields = orderFilters.options.find(({ name }) => name === 'fields');

		assert.equal(aggregates.type, 'multiOptions');
		assert.deepEqual(aggregates.options.map(({ value }) => value).sort(), [
			'custom_fields',
			'fulfillment_orders',
		]);
		assert.equal(fields.type, 'multiOptions');

		const productFields = activeProperties('product', 'create').find(
			({ name }) => name === 'bodyFields',
		);
		const categories = productFields.options.find(({ name }) => name === 'categories');
		assert.equal(categories.type, 'multiOptions');
		assert.equal(categories.typeOptions.loadOptionsMethod, 'getCategories');

		const locationFields = activeProperties('location', 'create').find(
			({ name }) => name === 'bodyFields',
		);
		assert.equal(locationFields.options.find(({ name }) => name === 'tags').type, 'multiOptions');
	});

	it('uses selectors for finite path values', () => {
		const domain = activeProperties('businessRule', 'setIntegrationCallback').find(
			({ name }) => name === 'domain',
		);
		assert.equal(domain.type, 'options');
		assert.deepEqual(domain.options.map(({ value }) => value).sort(), [
			'cart',
			'location',
			'payments',
			'shipping',
		]);

		const owner = activeProperties('metafield', 'getMany').find(
			({ name }) => name === 'owner_resource',
		);
		assert.equal(owner.type, 'options');
		assert.equal(owner.options.length, 6);
	});

	it('offers guided fields for every object-shaped body and query example', () => {
		for (const resource of resourceDefinitions) {
			for (const operationDefinition of resource.operations) {
				const properties = activeProperties(resource.value, operationDefinition.value);
				if (operationDefinition.body && operationDefinition.scope !== 'authorization') {
					const parsed = JSON.parse(operationDefinition.body.example);
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						const firstGuidedName = Object.keys(parsed)[0].replace(
							/_([a-z0-9])/g,
							(_match, character) => character.toUpperCase(),
						);
						assert.ok(
							properties.some(({ name }) => name === 'bodyFields' || name === firstGuidedName),
							`${resource.value}/${operationDefinition.value} guided body`,
						);
					}
				}
				if (
					operationDefinition.query &&
					Object.keys(JSON.parse(operationDefinition.query.example)).length
				) {
					assert.ok(
						properties.some(({ name }) => name === 'filters'),
						`${resource.value}/${operationDefinition.value} filters`,
					);
				}
			}
		}
	});

	it('marks array-shaped request bodies as required JSON arrays', () => {
		for (const resource of resourceDefinitions) {
			for (const operationDefinition of resource.operations) {
				if (
					!operationDefinition.body ||
					!Array.isArray(JSON.parse(operationDefinition.body.example))
				) {
					continue;
				}
				const body = activeProperties(resource.value, operationDefinition.value).find(
					({ name }) => name === 'body',
				);
				assert.ok(body, `${resource.value}/${operationDefinition.value}`);
				assert.equal(body.required, true);
				assert.equal(body.default, '[]');
				assert.match(body.displayName, /\(Required\)$/);
				assert.match(body.description, /Required JSON array/);
			}
		}
	});

	it('uses dynamic Name or ID selectors where loaders exist', () => {
		const cases = [
			['abandonedCheckout', 'applyCoupon', 'couponId', 'getCoupons'],
			['category', 'get', 'id', 'getCategories'],
			['location', 'get', 'id', 'getLocations'],
			['product', 'get', 'id', 'getProducts'],
			['productVariant', 'get', 'product_id', 'getProducts'],
			['webhook', 'get', 'webhookId', 'getWebhooks'],
		];

		for (const [resource, operationValue, name, loader] of cases) {
			const property = activeProperties(resource, operationValue).find(
				(candidate) => candidate.name === name,
			);
			assert.ok(property, `${resource}/${operationValue}/${name}`);
			assert.equal(property.type, 'options');
			assert.equal(property.typeOptions.loadOptionsMethod, loader);
			assert.match(property.displayName, /Name or ID(?: \(Required\))?$/);
		}
	});
});

describe('README documentation contract', () => {
	it('contains the complete pt-BR onboarding and support structure', () => {
		const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
		for (const heading of [
			'Funcionalidades',
			'Instalação',
			'Credenciais',
			'Nós e operações',
			'Preenchimento guiado',
			'Exemplos',
			'Tool de IA',
			'Webhook Trigger',
			'Solução de problemas',
			'Compatibilidade',
			'Recursos',
			'Versões',
			'Suporte',
			'Licença',
		]) {
			assert.match(readme, new RegExp(`^## .*${heading}`, 'm'), heading);
		}
		assert.match(readme, /N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true/);
		assert.match(readme, /\$fromAI\(key, description\?, type\?, defaultValue\?\)/);
		assert.match(readme, /198 operações/);
	});
});
