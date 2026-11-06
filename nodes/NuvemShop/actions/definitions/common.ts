import type {
	NuvemShopJsonInput,
	NuvemShopOperationDefinition,
	NuvemShopPathParameter,
	NuvemShopRequestScope,
} from '../types';

export function pathParameter(
	name: string,
	displayName: string,
	resourceName: string,
	options: { placeholder?: string; loadOptionsMethod?: string; description?: string } = {},
): NuvemShopPathParameter {
	return {
		name,
		displayName,
		placeholder: options.placeholder,
		loadOptionsMethod: options.loadOptionsMethod,
		description:
			options.description ??
			`Unique ${resourceName} identifier returned by a matching Get or Get Many operation. Never invent this value. Choose from the list when available, or use an expression to provide an ID from earlier workflow data.`,
	};
}

export function jsonBody(
	description: string,
	example: string,
	required = true,
): NuvemShopJsonInput {
	return {
		description: `${description} Use the exact snake_case property names documented by Nuvemshop. Do not include access_token, store_id, app_id, or other credential values; the node adds authentication and scope automatically.`,
		example,
		required,
	};
}

export function jsonQuery(description: string, example = '{}'): NuvemShopJsonInput {
	return {
		description: `${description} Provide a JSON object using the API's snake_case query parameter names. Omit this field when no filter is needed.`,
		example,
	};
}

interface CrudOperationConfig {
	resourceName: string;
	pluralName: string;
	basePath: string;
	idParameter: NuvemShopPathParameter;
	createExample: string;
	// Texto próprio do Create quando o genérico não explica uma regra do recurso (ex.: estoque do pedido).
	createDescription?: string;
	updateExample?: string;
	listQueryDescription?: string;
	listQueryExample?: string;
	getQueryDescription?: string;
	getQueryExample?: string;
	scope?: NuvemShopRequestScope;
	apiVersion?: '2025-03' | 'v1' | 'unstable';
	canCreate?: boolean;
	canUpdate?: boolean;
	canDelete?: boolean;
	canGetMany?: boolean;
	canGet?: boolean;
}

export function standardCrudOperations(
	config: CrudOperationConfig,
): NuvemShopOperationDefinition[] {
	const operations: NuvemShopOperationDefinition[] = [];
	const scope = config.scope;
	const apiVersion = config.apiVersion;

	if (config.canCreate !== false) {
		operations.push({
			name: 'Create',
			value: 'create',
			action: `Create a ${config.resourceName}`,
			description:
				config.createDescription ??
				`Create one ${config.resourceName} in the connected Nuvemshop account. This changes store data and returns the newly created record, including its server-generated ID. Validate required fields and monetary values before calling it.`,
			method: 'POST',
			path: config.basePath,
			scope,
			apiVersion,
			body: jsonBody(
				`JSON payload for the new ${config.resourceName}. Send only writable fields accepted by the Create ${config.resourceName} endpoint.`,
				config.createExample,
			),
		});
	}

	if (config.canDelete !== false) {
		operations.push({
			name: 'Delete',
			value: 'delete',
			action: `Delete a ${config.resourceName}`,
			description: `Permanently delete one ${config.resourceName}. This is destructive and can break references in products, orders, storefront content, or external systems. Read the record first, confirm its ID, and never infer the ID from a name.`,
			method: 'DELETE',
			path: `${config.basePath}/{${config.idParameter.name}}`,
			scope,
			apiVersion,
			pathParameters: [config.idParameter],
		});
	}

	if (config.canGet !== false) {
		operations.push({
			name: 'Get',
			value: 'get',
			action: `Get a ${config.resourceName}`,
			description: `Retrieve one ${config.resourceName} by its exact ID. Use this before update or delete when the current server state matters. The operation does not modify store data.`,
			method: 'GET',
			path: `${config.basePath}/{${config.idParameter.name}}`,
			scope,
			apiVersion,
			pathParameters: [config.idParameter],
			query: config.getQueryDescription
				? jsonQuery(
						config.getQueryDescription,
						config.getQueryExample ?? '{"fields":"id,name,updated_at"}',
					)
				: undefined,
		});
	}

	if (config.canGetMany !== false) {
		operations.push({
			name: 'Get Many',
			value: 'getMany',
			action: `Get many ${config.pluralName}`,
			description: `List ${config.pluralName} visible to the connected app. Use filters to narrow large stores. Return All follows every API page at a controlled rate; otherwise Limit caps the number of records returned as separate n8n items.`,
			method: 'GET',
			path: config.basePath,
			scope,
			apiVersion,
			paginated: true,
			query: jsonQuery(
				config.listQueryDescription ??
					`Optional filters supported by the Get Many ${config.pluralName} endpoint, excluding page and per_page because the node manages pagination.`,
				config.listQueryExample ?? '{}',
			),
		});
	}

	if (config.canUpdate !== false) {
		operations.push({
			name: 'Update',
			value: 'update',
			action: `Update a ${config.resourceName}`,
			description: `Update one existing ${config.resourceName} by exact ID. This changes store data. Send only fields that should change; first retrieve the record when overwriting multilingual, pricing, inventory, or status fields.`,
			method: 'PUT',
			path: `${config.basePath}/{${config.idParameter.name}}`,
			scope,
			apiVersion,
			pathParameters: [config.idParameter],
			body: jsonBody(
				`JSON payload containing writable ${config.resourceName} fields to replace or update, according to the endpoint contract.`,
				config.updateExample ?? config.createExample,
			),
		});
	}

	return operations;
}
