import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { idKindFor } from '../helpers/resourceLocator';
import {
	guidedBodyProperties,
	guidedQueryProperties,
	hasVariantValues,
	variantValuesProperty,
} from './guidedInputs';
import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from './types';

function operationDisplay(resource: string, operation: string): Record<string, string[]> {
	return { resource: [resource], operation: [operation] };
}

// Restringe uma propriedade a uma faixa de versões do node, mantendo o resto do displayOptions.
function forVersions(
	property: INodeProperties,
	condition: Array<number | { _cnd: { gte: number } }>,
): INodeProperties {
	return {
		...property,
		displayOptions: { show: { ...property.displayOptions?.show, '@version': condition } },
	};
}

const ONLY_V1 = [1];
const FROM_V2 = [{ _cnd: { gte: 2 } }];

function operationFields(
	resource: NuvemShopResourceDefinition,
	operation: NuvemShopOperationDefinition,
): INodeProperties[] {
	const displayOptions = { show: operationDisplay(resource.value, operation.value) };
	const properties: INodeProperties[] = [];

	for (const parameter of operation.pathParameters ?? []) {
		const inferredLoadOptions: Record<string, string> = {
			'Category ID': 'getCategories',
			'Location ID': 'getLocations',
			'Product ID': 'getProducts',
			'Product Variant ID': 'getProductVariants',
			'Webhook ID': 'getWebhooks',
		};
		const loadOptionsMethod =
			parameter.loadOptionsMethod ?? inferredLoadOptions[parameter.displayName];
		const staticOptions: Record<string, INodePropertyOptions[]> = {
			'/business_rules/integrations/{domain}:domain': [
				{ name: 'Payments', value: 'payments' },
				{ name: 'Shipping', value: 'shipping' },
				{ name: 'Location', value: 'location' },
				{ name: 'Cart', value: 'cart' },
			],
			'/metafields/{owner_resource}:owner_resource': [
				{ name: 'Products', value: 'products' },
				{ name: 'Product Variants', value: 'product_variants' },
				{ name: 'Categories', value: 'categories' },
				{ name: 'Pages', value: 'pages' },
				{ name: 'Orders', value: 'orders' },
				{ name: 'Customers', value: 'customers' },
			],
		};
		const options = staticOptions[`${operation.path}:${parameter.name}`];
		const legacyProperty: INodeProperties = {
			displayName: loadOptionsMethod
				? parameter.displayName.replace(/ ID$/, ' Name or ID')
				: parameter.displayName,
			name: parameter.name,
			type: loadOptionsMethod || options ? 'options' : 'string',
			typeOptions: loadOptionsMethod ? { loadOptionsMethod } : undefined,
			options,
			default: options?.[0]?.value ?? '',
			required: true,
			placeholder: parameter.placeholder,
			displayOptions,
			description: parameter.description,
		};

		// Os cinco IDs principais viram Resource Locator na versão 2, com o mesmo `name` da versão 1
		// (AD-002 e AD-009). A versão 1 guarda a propriedade antiga, só restrita a `@version` 1.
		const kind = idKindFor(parameter.displayName);
		if (!kind) {
			properties.push(legacyProperty);
			continue;
		}
		properties.push(
			{
				...legacyProperty,
				displayOptions: { show: { ...displayOptions.show, '@version': [1] } },
			},
			{
				displayName: kind.label,
				name: parameter.name,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: `Select ${kind.indefinite}...`,
						typeOptions: { searchListMethod: kind.searchMethod, searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: parameter.placeholder,
					},
				],
				displayOptions: { show: { ...displayOptions.show, '@version': [{ _cnd: { gte: 2 } }] } },
				description: parameter.description,
			},
		);
	}

	if (operation.scope === 'authorization') {
		properties.push({
			displayName: 'Authorization Code',
			name: 'authorizationCode',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'Code received at the app redirect URL',
			displayOptions,
			description:
				'One-time OAuth authorization code received after the merchant approves the app. It expires after five minutes. App ID and Client Secret are read securely from the credential.',
		});
	}

	if (operation.body && operation.scope !== 'authorization') {
		const bodyIsArray = Array.isArray(JSON.parse(operation.body.example));
		const bodyV1 = guidedBodyProperties(operation, displayOptions);
		if (hasVariantValues(operation)) {
			// Variante: a v2 troca o JSON cru de `values` por linhas de idioma e texto.
			properties.push(
				...bodyV1.map((property) => forVersions(property, ONLY_V1)),
				...guidedBodyProperties(operation, displayOptions, 2).map((property) =>
					forVersions(property, FROM_V2),
				),
				forVersions(variantValuesProperty(displayOptions), FROM_V2),
			);
		} else {
			properties.push(...bodyV1);
		}
		if (bodyIsArray) {
			properties.push({
				displayName: 'Body (JSON) (Required)',
				name: 'body',
				type: 'json',
				typeOptions: { alwaysOpenEditWindow: true },
				default: '[]',
				required: true,
				displayOptions,
				description: `${operation.body.description} Required JSON array for this operation. Example: ${operation.body.example}.`,
			});
		} else if (operation.advancedBody !== false) {
			properties.push({
				displayName:
					operation.bodyType === 'multipart'
						? 'Advanced Multipart Fields (JSON)'
						: 'Advanced Body (JSON)',
				name: 'body',
				type: 'json',
				typeOptions: { alwaysOpenEditWindow: true },
				default: '{}',
				displayOptions,
				description: `${operation.body.description} Optional advanced fallback; values here are merged with guided fields, and guided fields take precedence. Example: ${operation.body.example}.`,
			});
		}
	}

	if (operation.query) {
		const queryV1 = guidedQueryProperties(operation, displayOptions);
		const queryV2 = guidedQueryProperties(operation, displayOptions, 2);
		// Só duplica o filtro quando a v2 muda algo (datas); o resto fica igual nas duas versões.
		const hasDates = queryV2.some(
			(property) =>
				Array.isArray(property.options) &&
				property.options.some((option) => 'type' in option && option.type === 'dateTime'),
		);
		if (hasDates) {
			properties.push(
				...queryV1.map((property) => forVersions(property, ONLY_V1)),
				...queryV2.map((property) => forVersions(property, FROM_V2)),
			);
		} else {
			properties.push(...queryV1);
		}
		properties.push({
			displayName: 'Additional Query Parameters (JSON)',
			name: 'query',
			type: 'json',
			default: '{}',
			displayOptions,
			description: `${operation.query.description} Optional advanced fallback for filters not shown above. Guided filters take precedence. Example: ${operation.query.example}.`,
		});
	}

	// Operação destrutiva: o booleano de confirmação nasce desligado e a descrição abre com "Warning:".
	if (operation.confirmation) {
		properties.push({
			displayName: operation.confirmation.displayName,
			name: operation.confirmation.name,
			type: 'boolean',
			default: false,
			displayOptions,
			description: operation.confirmation.description,
		});
	}

	if (operation.paginated) {
		properties.push(
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 10000 },
				default: 50,
				displayOptions: {
					show: { ...operationDisplay(resource.value, operation.value), returnAll: [false] },
				},
				description: 'Max number of results to return',
			},
		);
	}

	if (operation.responseType === 'binary') {
		properties.push({
			displayName: 'Put Output in Field',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions,
			description: 'Name of the binary property that will contain the downloaded file',
		});
	}

	return properties;
}

export function buildResourceProperties(
	resources: NuvemShopResourceDefinition[],
): INodeProperties[] {
	const properties: INodeProperties[] = [];

	for (const resource of resources) {
		const operationOptions: INodePropertyOptions[] = [...resource.operations]
			.sort((left, right) => left.name.localeCompare(right.name))
			.map((operation) => ({
				name: operation.name,
				value: operation.value,
				action: operation.action,
				description: operation.description,
			}));
		const safeDefault =
			operationOptions.find(({ value }) => value === 'getMany')?.value ??
			operationOptions.find(({ value }) => value === 'get')?.value ??
			resource.operations.find(({ method }) => method === 'GET')?.value ??
			operationOptions[0]?.value ??
			'';

		properties.push({
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: operationOptions,
			default: safeDefault,
			displayOptions: { show: { resource: [resource.value] } },
		});

		for (const operation of resource.operations) {
			properties.push(...operationFields(resource, operation));
		}
	}

	return properties;
}

export const customApiCallProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'hidden',
		default: 'request',
		displayOptions: { show: { resource: ['customApiCall'] } },
	},
	{
		displayName: 'Request Scope',
		name: 'requestScope',
		type: 'options',
		options: [
			{
				name: 'Store',
				value: 'store',
				description: 'Use the store ID and store access token from the credential',
			},
			{
				name: 'Partner App',
				value: 'partner',
				description: 'Use the app ID and client secret for a Partner-Action endpoint',
			},
		],
		default: 'store',
		displayOptions: { show: { resource: ['customApiCall'] } },
		description:
			'Select which credential scope supplies the URL prefix and Bearer token. Secrets are never read from node parameters.',
	},
	{
		displayName: 'Method',
		name: 'requestMethod',
		type: 'options',
		options: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'].map((method) => ({
			name: method,
			value: method,
		})),
		default: 'GET',
		displayOptions: { show: { resource: ['customApiCall'] } },
		description: 'HTTP method defined by the Nuvemshop endpoint documentation',
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		default: '',
		required: true,
		placeholder: '/products',
		displayOptions: { show: { resource: ['customApiCall'] } },
		description:
			'Relative endpoint beginning with /. Do not include a domain, API version, store ID, or app ID; the credential adds the selected base URL securely.',
	},
	{
		displayName: 'Body Content Type',
		name: 'bodyType',
		type: 'options',
		options: [
			{ name: 'JSON', value: 'json' },
			{
				name: 'Multipart Form-Data',
				value: 'multipart',
				description: 'Use {"$binary":"propertyName"} as a field value to attach input binary data',
			},
		],
		default: 'json',
		displayOptions: {
			show: { resource: ['customApiCall'], requestMethod: ['DELETE', 'PATCH', 'POST', 'PUT'] },
		},
		description: 'Encoding used for the request body',
	},
	{
		displayName: 'Body (JSON)',
		name: 'body',
		type: 'json',
		typeOptions: { alwaysOpenEditWindow: true },
		default: '{}',
		displayOptions: {
			show: { resource: ['customApiCall'], requestMethod: ['DELETE', 'PATCH', 'POST', 'PUT'] },
		},
		description:
			'Request fields as a JSON object or array. For multipart, each top-level key becomes a form field and {"$binary":"data"} attaches the named input binary property.',
	},
	{
		displayName: 'Query Parameters (JSON)',
		name: 'query',
		type: 'json',
		default: '{}',
		displayOptions: { show: { resource: ['customApiCall'] } },
		description:
			'Optional query string as a JSON object, for example {"page":1,"per_page":200,"fields":"ID,name"}',
	},
	{
		displayName: 'Response Type',
		name: 'responseType',
		type: 'options',
		options: [
			{ name: 'JSON', value: 'json' },
			{ name: 'File', value: 'binary' },
		],
		default: 'json',
		displayOptions: { show: { resource: ['customApiCall'] } },
		description: 'Choose File only when the endpoint returns binary content rather than JSON',
	},
	{
		displayName: 'Put Output in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: { show: { resource: ['customApiCall'], responseType: ['binary'] } },
		description: 'Name of the binary property that will contain the downloaded file',
	},
];
