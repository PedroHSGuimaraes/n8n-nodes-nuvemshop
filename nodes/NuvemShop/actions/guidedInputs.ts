import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { NUVEMSHOP_WEBHOOK_EVENTS } from '../../shared/webhookEvents';
import type { NuvemShopJsonInput, NuvemShopOperationDefinition } from './types';

type GuidedValueKind = 'direct' | 'json' | 'primitiveArray' | 'translation';

interface GuidedField {
	apiName: string;
	parameterName: string;
	property: INodeProperties;
	kind: GuidedValueKind;
	example: unknown;
	multiValueFormat?: 'array' | 'comma';
}

type FieldOption = { name: string; value: string };

interface MultiFieldOptions {
	options: FieldOption[];
	format: 'array' | 'comma';
}

const REQUIRED_FIELDS: Record<string, string[]> = {
	'POST /checkouts/{cartId}/coupon': ['coupon_id'],
	'POST /categories': ['name'],
	'POST /coupons': ['code', 'type', 'value'],
	'POST /customers': ['name', 'email'],
	'POST /draft_orders': [
		'contact_name',
		'contact_lastname',
		'contact_email',
		'payment_status',
		'products',
	],
	'POST /products': ['name'],
};

const FIELD_LOAD_OPTIONS: Record<
	string,
	{ method: string; multiple?: boolean; format?: 'array' | 'comma' }
> = {
	'POST /checkouts/{cartId}/coupon:coupon_id': { method: 'getCoupons' },
	'POST /products:categories': { method: 'getCategories', multiple: true, format: 'array' },
	'PUT /products/{id}:categories': {
		method: 'getCategories',
		multiple: true,
		format: 'array',
	},
	'GET /categories:parent_id': { method: 'getCategories' },
	'GET /products:category_id': { method: 'getCategories' },
	'GET /products:ids': { method: 'getProducts', multiple: true, format: 'comma' },
	'GET /orders:customer_ids': {
		method: 'getCustomers',
		multiple: true,
		format: 'comma',
	},
};

const FIELD_OPTIONS: Record<string, FieldOption[]> = {
	'POST /draft_orders:payment_status': [
		{ name: 'Paid', value: 'paid' },
		{ name: 'Pending Confirmation', value: 'pending_confirmation' },
		{ name: 'Unpaid', value: 'unpaid' },
	],
	'POST /categories:visibility': [
		{ name: 'Hidden', value: 'hidden' },
		{ name: 'Visible', value: 'visible' },
	],
	'PUT /categories/{id}:visibility': [
		{ name: 'Hidden', value: 'hidden' },
		{ name: 'Visible', value: 'visible' },
	],
	'POST /coupons:type': [
		{ name: 'Percentage', value: 'percentage' },
		{ name: 'Absolute', value: 'absolute' },
		{ name: 'Free Shipping', value: 'shipping' },
	],
	'PUT /coupons/{couponId}:type': [
		{ name: 'Percentage', value: 'percentage' },
		{ name: 'Absolute', value: 'absolute' },
		{ name: 'Free Shipping', value: 'shipping' },
	],
	'POST /products/{product_id}/variants:age_group': [
		{ name: 'Newborn', value: 'newborn' },
		{ name: 'Infant', value: 'infant' },
		{ name: 'Toddler', value: 'toddler' },
		{ name: 'Kids', value: 'kids' },
		{ name: 'Adult', value: 'adult' },
	],
	'POST /products/{product_id}/variants:gender': [
		{ name: 'Female', value: 'female' },
		{ name: 'Male', value: 'male' },
		{ name: 'Unisex', value: 'unisex' },
	],
	'POST /products/{product_id}/variants/stock:action': [
		{ name: 'Replace', value: 'replace' },
		{ name: 'Variation (Add/Subtract)', value: 'variation' },
	],
	'POST /metafields:owner_resource': [
		{ name: 'Product', value: 'Product' },
		{ name: 'Product Variant', value: 'Product_Variant' },
		{ name: 'Category', value: 'Category' },
		{ name: 'Page', value: 'Page' },
		{ name: 'Order', value: 'Order' },
		{ name: 'Customer', value: 'Customer' },
	],
	'PUT /business_rules/integrations/{domain}:event': [
		{ name: 'Payments: Before Filter', value: 'payments/before-filter' },
		{ name: 'Shipping: Before Filter', value: 'shipping/before-filter' },
		{ name: 'Location: Prioritization', value: 'location/prioritization' },
		{ name: 'Cart: Before Finish', value: 'cart/before-finish' },
	],
	'POST /promotions:allocation_type': [
		{ name: 'Line Item', value: 'line_item' },
		{ name: 'Cross Items', value: 'cross_items' },
	],
	'POST /orders:payment_status': [
		{ name: 'Pending', value: 'pending' },
		{ name: 'Authorized', value: 'authorized' },
		{ name: 'Paid', value: 'paid' },
	],
	'POST /orders:fulfillment': [
		{ name: 'Unpacked', value: 'unpacked' },
		{ name: 'Unfulfilled', value: 'unfulfilled' },
		{ name: 'Fulfilled', value: 'fulfilled' },
	],
	'POST /orders:shipping_pickup_type': [
		{ name: 'Ship', value: 'ship' },
		{ name: 'Pickup', value: 'pickup' },
	],
	'PUT /orders/{orderId}:status': [
		{ name: 'Open', value: 'open' },
		{ name: 'Closed', value: 'closed' },
		{ name: 'Cancelled', value: 'cancelled' },
	],
	'POST /orders/{orderId}/cancel:reason': [
		{ name: 'Customer', value: 'customer' },
		{ name: 'Inventory', value: 'inventory' },
		{ name: 'Fraud', value: 'fraud' },
		{ name: 'Other', value: 'other' },
	],
	'PATCH /orders/{order_id}/fulfillment-orders/{fulfillment_order_id}:status': [
		{ name: 'Unpacked', value: 'UNPACKED' },
		{ name: 'Packed', value: 'PACKED' },
		{ name: 'Dispatched', value: 'DISPATCHED' },
		{ name: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
		{ name: 'Delivered', value: 'DELIVERED' },
	],
	'PATCH /fulfillment-orders/{fulfillment_order_id}/labels/{label_id}:status': [
		{ name: 'Ready to Download', value: 'READY_TO_DOWNLOAD' },
		{ name: 'Ready to Use', value: 'READY_TO_USE' },
		{ name: 'Failed', value: 'FAILED' },
		{ name: 'Canceled', value: 'CANCELED' },
		{ name: 'Suspended', value: 'SUSPENDED' },
	],
	'POST /orders/{orderId}/transactions/{transactionId}/events:type': [
		{ name: 'Authorization', value: 'authorization' },
		{ name: 'Capture', value: 'capture' },
		{ name: 'Refund', value: 'refund' },
		{ name: 'Sale', value: 'sale' },
		{ name: 'Void', value: 'void' },
		{ name: 'Expiration', value: 'expiration' },
		{ name: 'Fraud Analysis', value: 'fraud_analysis' },
	],
	'POST /orders/{orderId}/transactions/{transactionId}/events:status': [
		{ name: 'Error', value: 'error' },
		{ name: 'Failure', value: 'failure' },
		{ name: 'Pending', value: 'pending' },
		{ name: 'Success', value: 'success' },
	],
	'GET /orders:payment_status': [
		{ name: 'Any', value: 'any' },
		{ name: 'Pending', value: 'pending' },
		{ name: 'Authorized', value: 'authorized' },
		{ name: 'Paid', value: 'paid' },
		{ name: 'Abandoned', value: 'abandoned' },
		{ name: 'Refunded', value: 'refunded' },
		{ name: 'Voided', value: 'voided' },
	],
	'GET /orders:status': [
		{ name: 'Any', value: 'any' },
		{ name: 'Open', value: 'open' },
		{ name: 'Closed', value: 'closed' },
		{ name: 'Cancelled', value: 'cancelled' },
	],
	'GET /orders:channels': [
		{ name: 'Draft Order (Admin/API)', value: 'form' },
		{ name: 'Storefront', value: 'store' },
		{ name: 'API', value: 'api' },
		{ name: 'Mercado Libre', value: 'meli' },
		{ name: 'Point of Sale', value: 'pos' },
	],
	'GET /orders:shipping_status': [
		{ name: 'Any', value: 'any' },
		{ name: 'Unpacked', value: 'unpacked' },
		{ name: 'Unfulfilled (Unshipped)', value: 'unfulfilled' },
		{ name: 'Fulfilled (Shipped)', value: 'fulfilled' },
	],
	'GET /products:sort_by': [
		{ name: 'User Defined', value: 'user' },
		{ name: 'Price: Low to High', value: 'price-ascending' },
		{ name: 'Price: High to Low', value: 'price-descending' },
		{ name: 'Cost: Low to High', value: 'cost-ascending' },
		{ name: 'Cost: High to Low', value: 'cost-descending' },
		{ name: 'Name: A to Z', value: 'alpha-ascending' },
		{ name: 'Name: Z to A', value: 'alpha-descending' },
		{ name: 'Name: Ascending', value: 'name-ascending' },
		{ name: 'Name: Descending', value: 'name-descending' },
		{ name: 'Created: Oldest First', value: 'created-at-ascending' },
		{ name: 'Created: Newest First', value: 'created-at-descending' },
		{ name: 'Best Selling', value: 'best-selling' },
	],
	'GET /coupons:status': [
		{ name: 'Activated', value: 'activated' },
		{ name: 'Deactivated', value: 'deactivated' },
	],
	'GET /coupons:limitation_type': [
		{ name: 'Quantity', value: 'quantity' },
		{ name: 'Cart Value', value: 'cart_value' },
		{ name: 'Categories', value: 'categories' },
	],
	'GET /coupons:term_type': [
		{ name: 'Unlimited', value: 'unlimited' },
		{ name: 'Limited', value: 'limited' },
	],
	'GET /coupons:discount_type': [
		{ name: 'Percentage', value: 'percentage' },
		{ name: 'Absolute', value: 'absolute' },
		{ name: 'Free Shipping', value: 'shipping' },
	],
	'GET /coupons:sort_by': [
		{ name: 'Created: Oldest First', value: 'created-at-ascending' },
		{ name: 'Created: Newest First', value: 'created-at-descending' },
		{ name: 'Code: A to Z', value: 'alpha-ascending' },
		{ name: 'Code: Z to A', value: 'alpha-descending' },
		{ name: 'Uses: Low to High', value: 'uses-ascending' },
		{ name: 'Uses: High to Low', value: 'uses-descending' },
	],
	'POST /fulfillment-orders/{fulfillment_order_id}/labels/{label_id}/download:format': [
		{ name: 'PDF', value: 'PDF' },
		{ name: 'TXT', value: 'TXT' },
		{ name: 'ZPL', value: 'ZPL' },
		{ name: 'HTML', value: 'HTML' },
		{ name: 'XML', value: 'XML' },
	],
};

const FIELD_MULTI_OPTIONS: Record<string, MultiFieldOptions> = {
	'GET /orders:aggregates': {
		options: [
			{ name: 'Fulfillment Orders', value: 'fulfillment_orders' },
			{ name: 'Custom Fields', value: 'custom_fields' },
		],
		format: 'comma',
	},
	'GET /orders/{orderId}:aggregates': {
		options: [{ name: 'Fulfillment Orders', value: 'fulfillment_orders' }],
		format: 'comma',
	},
	'GET /orders/{order_id}/fulfillment-orders:aggregates': {
		options: [{ name: 'Custom Fields', value: 'custom_fields' }],
		format: 'comma',
	},
	'POST /fulfillment-orders/{fulfillment_order_id}/labels/{label_id}/download:types': {
		options: [
			{ name: 'Label', value: 'LABEL' },
			{ name: 'Content Declaration', value: 'CONTENT_DECLARATION' },
		],
		format: 'comma',
	},
	'POST /locations:tags': {
		options: [
			{ name: 'Online', value: 'online' },
			{ name: 'Offline', value: 'offline' },
		],
		format: 'array',
	},
	'PUT /locations/{id}:tags': {
		options: [
			{ name: 'Online', value: 'online' },
			{ name: 'Offline', value: 'offline' },
		],
		format: 'array',
	},
	'POST /shipping_carriers:types': {
		options: [
			{ name: 'Ship', value: 'ship' },
			{ name: 'Pickup', value: 'pickup' },
		],
		format: 'comma',
	},
	'PUT /shipping_carriers/{id}:types': {
		options: [
			{ name: 'Ship', value: 'ship' },
			{ name: 'Pickup', value: 'pickup' },
		],
		format: 'comma',
	},
};

const CUSTOM_FIELD_TYPES: FieldOption[] = [
	{ name: 'Text List', value: 'text_list' },
	{ name: 'Text', value: 'text' },
	{ name: 'Numeric', value: 'numeric' },
	{ name: 'Date', value: 'date' },
];

const TRACKING_STATUSES: FieldOption[] = [
	{ name: 'Dispatched', value: 'dispatched' },
	{ name: 'Received by Post Office', value: 'received_by_post_office' },
	{ name: 'In Transit', value: 'in_transit' },
	{ name: 'Out for Delivery', value: 'out_for_delivery' },
	{ name: 'Delivery Attempt Failed', value: 'delivery_attempt_failed' },
	{ name: 'Delayed', value: 'delayed' },
	{ name: 'Ready for Pickup', value: 'ready_for_pickup' },
	{ name: 'Delivered', value: 'delivered' },
	{ name: 'Returned to Sender', value: 'returned_to_sender' },
	{ name: 'Lost', value: 'lost' },
	{ name: 'Failure', value: 'failure' },
];

const WEBHOOK_EVENTS = NUVEMSHOP_WEBHOOK_EVENTS.map((event) => ({
	name: displayName(event.replaceAll('/', '_')),
	value: event,
}));

function operationKey(operation: NuvemShopOperationDefinition): string {
	return `${operation.method} ${operation.path}`;
}

function camelCase(value: string): string {
	return value.replace(/_([a-z0-9])/g, (_match, character: string) => character.toUpperCase());
}

function displayName(value: string): string {
	return value
		.split('_')
		.map((part) => {
			if (['id', 'ids', 'seo', 'sku', 'url'].includes(part)) return part.toUpperCase();
			return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
		})
		.join(' ');
}

function queryFieldOptions(
	operation: NuvemShopOperationDefinition,
	apiName: string,
	value: unknown,
	isQuery: boolean,
): { options: FieldOption[]; multiple: boolean; format?: 'array' | 'comma' } | undefined {
	const key = `${operationKey(operation)}:${apiName}`;
	const multipleOptions = FIELD_MULTI_OPTIONS[key];
	if (multipleOptions) {
		return { options: multipleOptions.options, multiple: true, format: multipleOptions.format };
	}

	const options = FIELD_OPTIONS[key];
	if (options) return { options, multiple: false };
	if (
		apiName === 'value_type' &&
		operation.method === 'POST' &&
		operation.path.includes('custom-fields')
	) {
		return { options: CUSTOM_FIELD_TYPES, multiple: false };
	}
	if (apiName === 'status' && operation.path.includes('/tracking-events')) {
		return { options: TRACKING_STATUSES, multiple: false };
	}
	if (apiName === 'status' && operation.path === '/orders/{order_id}/fulfillments') {
		return { options: TRACKING_STATUSES, multiple: false };
	}
	if (apiName === 'event' && operation.path.includes('/webhooks')) {
		return { options: WEBHOOK_EVENTS, multiple: false };
	}
	if (isQuery && apiName === 'language') {
		return {
			options: [
				{ name: 'Português', value: 'pt' },
				{ name: 'Português (Brasil)', value: 'pt_BR' },
				{ name: 'Español', value: 'es' },
				{ name: 'Español (Argentina)', value: 'es_AR' },
				{ name: 'English', value: 'en' },
			],
			multiple: false,
		};
	}

	if (isQuery && apiName === 'fields' && typeof value === 'string') {
		const fieldNames = value
			.split(',')
			.map((field) => field.trim())
			.filter(Boolean);
		if (fieldNames.length) {
			return {
				options: fieldNames.map((field) => ({ name: displayName(field), value: field })),
				multiple: true,
				format: 'comma',
			};
		}
	}

	return undefined;
}

function parsedExample(input: NuvemShopJsonInput): unknown {
	try {
		return JSON.parse(input.example) as unknown;
	} catch {
		return undefined;
	}
}

function isTranslation(value: unknown): boolean {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
	const keys = Object.keys(value);
	return keys.length > 0 && keys.every((key) => ['en', 'es', 'es_AR', 'pt', 'pt_BR'].includes(key));
}

function shortExample(value: unknown): string {
	const serialized = typeof value === 'string' ? value : JSON.stringify(value);
	return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
}

function fieldDescription(apiName: string, value: unknown, kind: GuidedValueKind): string {
	const example = shortExample(value);
	if (kind === 'translation') {
		return `Text sent inside the multilingual API field \`${apiName}\` using Content Language. Example: ${example}. Use Advanced Body (JSON) when multiple languages are required.`;
	}
	if (kind === 'primitiveArray') {
		return `Comma-separated values sent as the API array \`${apiName}\`. Example: ${example}. IDs must come from the matching Get or Get Many operation.`;
	}
	if (kind === 'json') {
		return `JSON value sent as the API field \`${apiName}\`. Example: ${example}. Keep the documented snake_case names inside this value.`;
	}
	return `Value sent as the Nuvemshop API field \`${apiName}\`. Example: ${example}. Credentials and store scope are added automatically.`;
}

function fieldType(value: unknown): {
	type: INodeProperties['type'];
	defaultValue: INodeProperties['default'];
	kind: GuidedValueKind;
} {
	if (isTranslation(value)) return { type: 'string', defaultValue: '', kind: 'translation' };
	if (Array.isArray(value) && value.every((item) => ['number', 'string'].includes(typeof item))) {
		return { type: 'string', defaultValue: '', kind: 'primitiveArray' };
	}
	if (value !== null && typeof value === 'object') {
		return {
			type: 'json',
			defaultValue: Array.isArray(value) ? '[]' : '{}',
			kind: 'json',
		};
	}
	if (typeof value === 'boolean') return { type: 'boolean', defaultValue: false, kind: 'direct' };
	if (typeof value === 'number') return { type: 'number', defaultValue: 0, kind: 'direct' };
	return { type: 'string', defaultValue: '', kind: 'direct' };
}

// Datas de cupom que a doc descreve sem hora (ex.: start_date "2014-05-08"); só o dia é enviado.
const COUPON_DATE_FIELDS = new Set([
	'min_start_date',
	'min_end_date',
	'max_start_date',
	'max_end_date',
]);

// Campos de filtro que a versão 2 mostra como seletor de data: created/updated_at_min/max e cupom.
function isDateField(apiName: string): boolean {
	return /_at_(min|max)$/.test(apiName) || COUPON_DATE_FIELDS.has(apiName);
}

// ISO 8601 aceito: data sozinha, ou data e hora com segundos, fração e fuso opcionais.
const ISO_8601 = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

// Rotas de variante com corpo objeto: criar (POST) e atualizar (PUT) uma variante.
// O PUT/PATCH em lote recebe array e continua com o JSON.
export function hasVariantValues(operation: NuvemShopOperationDefinition): boolean {
	return (
		/^\/products\/\{product_id\}\/variants(\/\{id\})?$/.test(operation.path) &&
		['POST', 'PUT'].includes(operation.method) &&
		!!operation.body &&
		!Array.isArray(parsedExample(operation.body))
	);
}

// Idiomas aceitos nas linhas de Values, os mesmos do Content Language do node.
const VARIANT_LANGUAGES: FieldOption[] = [
	{ name: 'Português', value: 'pt' },
	{ name: 'Português (Brasil)', value: 'pt_BR' },
	{ name: 'Español', value: 'es' },
	{ name: 'Español (Argentina)', value: 'es_AR' },
	{ name: 'English', value: 'en' },
];

// Propriedade da versão 2 que substitui o JSON cru `values` da variante por linhas de idioma e texto.
export function variantValuesProperty(
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties {
	return {
		displayName: 'Values',
		name: 'variantValues',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Value',
		default: {},
		options: [
			{
				name: 'values',
				displayName: 'Value',
				values: [
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: VARIANT_LANGUAGES,
						default: 'pt',
						description: 'Language key of this attribute value',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						description:
							'Attribute value of the variant in the chosen language, for example Large. Add one row per product attribute, in the same order as the attributes.',
					},
				],
			},
		],
		displayOptions,
		description:
			'One value for each product attribute, in the same order. The combination must be unique among the product variants.',
	};
}

function guidedFields(
	operation: NuvemShopOperationDefinition,
	input: NuvemShopJsonInput,
	version = 1,
): GuidedField[] {
	const example = parsedExample(input);
	if (example === null || typeof example !== 'object' || Array.isArray(example)) return [];

	const fields = Object.entries(example).map(([apiName, value]) => {
		const inferred = fieldType(value);
		const selection = queryFieldOptions(operation, apiName, value, input === operation.query);
		const options = selection?.options;
		const loadedOptions = FIELD_LOAD_OPTIONS[`${operationKey(operation)}:${apiName}`];
		const loadOptionsMethod = loadedOptions?.method;
		const multiple = selection?.multiple || loadedOptions?.multiple;
		// Só o filtro de consulta da versão 2 vira seletor de data; a versão 1 segue em texto.
		const isDate = version >= 2 && input === operation.query && isDateField(apiName);
		const property: INodeProperties = {
			displayName: loadOptionsMethod
				? displayName(apiName).replace(/ ID$/, ' Name or ID')
				: displayName(apiName),
			name: camelCase(apiName),
			type: multiple
				? 'multiOptions'
				: options || loadOptionsMethod
					? 'options'
					: isDate
						? 'dateTime'
						: inferred.type,
			typeOptions: loadOptionsMethod ? { loadOptionsMethod } : undefined,
			options,
			default: multiple
				? []
				: options || loadOptionsMethod
					? (options?.[0]?.value ?? '')
					: inferred.defaultValue,
			description: fieldDescription(apiName, value, inferred.kind),
		};
		return {
			apiName,
			parameterName: camelCase(apiName),
			property,
			kind: inferred.kind,
			example: value,
			multiValueFormat: selection?.format ?? loadedOptions?.format,
		};
	});

	// Na versão 2 o `values` da variante sai daqui e vira a coleção `variantValues`.
	return fields.filter(
		({ apiName }) => !(version >= 2 && apiName === 'values' && hasVariantValues(operation)),
	);
}

export function guidedBodyProperties(
	operation: NuvemShopOperationDefinition,
	displayOptions: INodeProperties['displayOptions'],
	version = 1,
): INodeProperties[] {
	if (!operation.body) return [];
	const fields = guidedFields(operation, operation.body, version);
	const requiredNames = new Set(REQUIRED_FIELDS[operationKey(operation)] ?? []);
	const required = fields
		.filter((field) => requiredNames.has(field.apiName))
		.map((field) => {
			const options = field.property.options;
			return {
				...field.property,
				displayName: `${field.property.displayName} (Required)`,
				required: operation.advancedBody === false ? true : undefined,
				default: field.property.type === 'options' ? '' : field.property.default,
				options:
					field.property.type === 'options' && Array.isArray(options)
						? [{ name: 'Select a Value', value: '' }, ...options]
						: options,
				description:
					operation.advancedBody === false
						? `Required by the API. ${field.property.description}`
						: `Required by the API. Provide it here or in Advanced Body (JSON). ${field.property.description}`,
				displayOptions,
			};
		});
	const optional = fields.filter((field) => !requiredNames.has(field.apiName));
	const hasTranslations = fields.some(({ kind }) => kind === 'translation');

	return [
		...(hasTranslations
			? [
					{
						displayName: 'Content Language',
						name: 'contentLanguage',
						type: 'options' as const,
						options: [
							{ name: 'English', value: 'en' },
							{ name: 'Português (Brasil)', value: 'pt' },
							{ name: 'Português (pt_BR)', value: 'pt_BR' },
							{ name: 'Español', value: 'es' },
							{ name: 'Español (Argentina)', value: 'es_AR' },
						],
						default: 'pt',
						displayOptions,
						description:
							'Language key used for guided multilingual text fields. Use Advanced Body (JSON) to send more than one language.',
					},
				]
			: []),
		...required,
		...(optional.length
			? [
					{
						displayName: operation.value === 'update' ? 'Update Fields' : 'Additional Fields',
						name: 'bodyFields',
						type: 'collection' as const,
						placeholder: 'Add Field',
						default: {},
						options: optional.map((field) => field.property),
						displayOptions,
						description:
							'Guided writable fields for this operation. Add only fields that should be sent to Nuvemshop.',
					},
				]
			: []),
	];
}

export function guidedQueryProperties(
	operation: NuvemShopOperationDefinition,
	displayOptions: INodeProperties['displayOptions'],
	version = 1,
): INodeProperties[] {
	if (!operation.query) return [];
	const fields = guidedFields(operation, operation.query, version);
	if (!fields.length) return [];
	return [
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			options: fields.map((field) => field.property),
			displayOptions,
			description:
				'Common filters for this operation. Pagination fields are managed automatically by Return All and Limit.',
		},
	];
}

function parseJsonField(
	context: IExecuteFunctions,
	value: unknown,
	field: GuidedField,
	itemIndex: number,
): unknown {
	let parsed: unknown = value;
	try {
		if (typeof value === 'string') parsed = JSON.parse(value) as unknown;
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			`The guided field "${field.property.displayName}" must contain valid JSON: ${(error as Error).message}`,
			{ itemIndex },
		);
	}
	const expectedArray = Array.isArray(field.example);
	const validObject = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
	if ((expectedArray && !Array.isArray(parsed)) || (!expectedArray && !validObject)) {
		throw new NodeOperationError(
			context.getNode(),
			`The guided field "${field.property.displayName}" must contain a JSON ${expectedArray ? 'array' : 'object'}.`,
			{ itemIndex },
		);
	}
	return parsed;
}

// Valida o seletor de data da versão 2 e devolve o texto que a API espera.
// A data segue como veio (sem acrescentar fuso, AD-011); só as datas de cupom perdem a hora.
function dateApiValue(
	context: IExecuteFunctions,
	value: unknown,
	field: GuidedField,
	itemIndex: number,
): string {
	const text = String(value).trim();
	if (!ISO_8601.test(text) || Number.isNaN(Date.parse(text))) {
		throw new NodeOperationError(
			context.getNode(),
			`The "${field.property.displayName}" filter is not a valid date`,
			{
				itemIndex,
				description: 'Pick a date from the calendar or use the format 2026-07-01T00:00:00Z',
			},
		);
	}
	return COUPON_DATE_FIELDS.has(field.apiName) ? text.slice(0, 10) : text;
}

function apiValue(
	context: IExecuteFunctions,
	value: unknown,
	field: GuidedField,
	itemIndex: number,
): unknown {
	if (field.property.type === 'dateTime') return dateApiValue(context, value, field, itemIndex);
	if (field.property.type === 'multiOptions' && Array.isArray(value)) {
		if (field.multiValueFormat === 'array') {
			if (Array.isArray(field.example) && field.example.every((item) => typeof item === 'number')) {
				return value.map(Number);
			}
			return value;
		}
		return value.join(',');
	}
	if (field.kind === 'json') return parseJsonField(context, value, field, itemIndex);
	if (typeof field.example === 'number' && typeof value === 'string' && value.trim()) {
		const number = Number(value);
		if (Number.isFinite(number)) return number;
	}
	if (field.kind === 'translation') {
		const language = String(context.getNodeParameter('contentLanguage', itemIndex, 'pt'));
		return { [language]: value };
	}
	if (field.kind === 'primitiveArray' && typeof value === 'string') {
		const values = value
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
		if (Array.isArray(field.example) && field.example.every((item) => typeof item === 'number')) {
			const numbers = values.map(Number);
			if (numbers.some((number) => !Number.isFinite(number))) {
				throw new NodeOperationError(
					context.getNode(),
					`The guided field "${field.property.displayName}" accepts only comma-separated numbers.`,
					{ itemIndex },
				);
			}
			return numbers;
		}
		return values;
	}
	return value;
}

export function guidedValues(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	itemIndex: number,
	source: 'body' | 'query',
): IDataObject {
	const input = source === 'body' ? operation.body : operation.query;
	if (!input) return {};
	// A versão do node decide se os campos são os da v1 (texto) ou os da v2 (seletores).
	const version = Number(context.getNode().typeVersion) || 1;
	const fields = guidedFields(operation, input, version);
	const requiredNames = new Set(
		source === 'body' ? (REQUIRED_FIELDS[operationKey(operation)] ?? []) : [],
	);
	const collectionName = source === 'body' ? 'bodyFields' : 'filters';
	const collection = context.getNodeParameter(collectionName, itemIndex, {}) as IDataObject;
	const values: IDataObject = {};

	for (const field of fields) {
		const raw = requiredNames.has(field.apiName)
			? context.getNodeParameter(field.parameterName, itemIndex, '')
			: collection[field.parameterName];
		if (raw === undefined || raw === '') continue;
		const converted = apiValue(context, raw, field, itemIndex);
		if (
			(Array.isArray(converted) && converted.length === 0) ||
			(converted !== null &&
				typeof converted === 'object' &&
				!Array.isArray(converted) &&
				Object.keys(converted).length === 0)
		) {
			continue;
		}
		values[field.apiName] = converted as IDataObject[string];
	}

	// Versão 2: as linhas de idioma e texto viram o array `values` da variante, ex.: [{ "pt": "G" }].
	if (source === 'body' && version >= 2 && hasVariantValues(operation)) {
		const rows = (context.getNodeParameter('variantValues', itemIndex, {}) as IDataObject)
			.values as IDataObject[] | undefined;
		const variantValues = (rows ?? [])
			.filter((row) => String(row.text ?? '') !== '')
			.map((row) => ({ [String(row.language ?? 'pt')]: String(row.text) }));
		if (variantValues.length) values.values = variantValues;
	}

	return values;
}

export function validateRequiredBody(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	body: IDataObject | IDataObject[],
	itemIndex: number,
): void {
	if (!operation.body) return;
	const example = parsedExample(operation.body);
	if (example !== undefined && Array.isArray(example) !== Array.isArray(body)) {
		throw new NodeOperationError(
			context.getNode(),
			`This operation requires a JSON ${Array.isArray(example) ? 'array' : 'object'} as its request body.`,
			{ itemIndex },
		);
	}
	const empty = Array.isArray(body) ? body.length === 0 : Object.keys(body).length === 0;
	if (operation.body.required && empty) {
		throw new NodeOperationError(
			context.getNode(),
			'This operation requires a request body. Fill the guided fields or Advanced Body (JSON).',
			{ itemIndex },
		);
	}
	if (Array.isArray(body)) return;

	const missing = (REQUIRED_FIELDS[operationKey(operation)] ?? []).filter((field) => {
		const value = body[field];
		return (
			value === undefined ||
			value === null ||
			value === '' ||
			(Array.isArray(value) && value.length === 0) ||
			(!Array.isArray(value) && typeof value === 'object' && Object.keys(value).length === 0)
		);
	});
	if (missing.length) {
		throw new NodeOperationError(
			context.getNode(),
			`Missing required API field${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Provide the guided field or include it in Advanced Body (JSON).`,
			{ itemIndex },
		);
	}
}
