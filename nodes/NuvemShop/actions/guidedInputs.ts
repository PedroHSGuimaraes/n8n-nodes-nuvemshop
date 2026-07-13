import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { NuvemShopJsonInput, NuvemShopOperationDefinition } from './types';

type GuidedValueKind = 'direct' | 'json' | 'primitiveArray' | 'translation';

interface GuidedField {
	apiName: string;
	parameterName: string;
	property: INodeProperties;
	kind: GuidedValueKind;
	example: unknown;
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

const FIELD_LOAD_OPTIONS: Record<string, string> = {
	'POST /checkouts/{cartId}/coupon:coupon_id': 'getCoupons',
};

const FIELD_OPTIONS: Record<string, Array<{ name: string; value: string }>> = {
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
};

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

function guidedFields(
	operation: NuvemShopOperationDefinition,
	input: NuvemShopJsonInput,
): GuidedField[] {
	const example = parsedExample(input);
	if (example === null || typeof example !== 'object' || Array.isArray(example)) return [];

	return Object.entries(example).map(([apiName, value]) => {
		const inferred = fieldType(value);
		const options = FIELD_OPTIONS[`${operationKey(operation)}:${apiName}`];
		const loadOptionsMethod = FIELD_LOAD_OPTIONS[`${operationKey(operation)}:${apiName}`];
		const property: INodeProperties = {
			displayName: loadOptionsMethod
				? displayName(apiName).replace(/ ID$/, ' Name or ID')
				: displayName(apiName),
			name: camelCase(apiName),
			type: options || loadOptionsMethod ? 'options' : inferred.type,
			typeOptions: loadOptionsMethod ? { loadOptionsMethod } : undefined,
			options,
			default: options || loadOptionsMethod ? (options?.[0]?.value ?? '') : inferred.defaultValue,
			description: fieldDescription(apiName, value, inferred.kind),
		};
		return {
			apiName,
			parameterName: camelCase(apiName),
			property,
			kind: inferred.kind,
			example: value,
		};
	});
}

export function guidedBodyProperties(
	operation: NuvemShopOperationDefinition,
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties[] {
	if (!operation.body) return [];
	const fields = guidedFields(operation, operation.body);
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
): INodeProperties[] {
	if (!operation.query) return [];
	const fields = guidedFields(operation, operation.query);
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

function apiValue(
	context: IExecuteFunctions,
	value: unknown,
	field: GuidedField,
	itemIndex: number,
): unknown {
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
	const fields = guidedFields(operation, input);
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
