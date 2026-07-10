import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJsonBody, parseJsonObject } from '../helpers/json';
import { buildMultipartForm } from '../helpers/multipart';
import { nuvemShopApiRequest, nuvemShopApiRequestAllItems } from '../transport';
import type { NuvemShopOperationDefinition, NuvemShopRequestScope } from './types';

function resolvePath(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	itemIndex: number,
): string {
	return operation.path.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, parameterName: string) => {
		const rawValue = context.getNodeParameter(parameterName, itemIndex, '') as string | number;
		const value = String(rawValue ?? '').trim();
		if (!value) {
			throw new NodeOperationError(
				context.getNode(),
				`The path parameter "${parameterName}" is required for ${operation.method} ${operation.path}`,
				{ itemIndex },
			);
		}
		return encodeURIComponent(value);
	});
}

function assertRelativeEndpoint(
	context: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
): string {
	const normalized = endpoint.trim();
	if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.includes('://')) {
		throw new NodeOperationError(
			context.getNode(),
			'Endpoint must be a relative Nuvemshop API path beginning with one slash, for example /products. Domains and full URLs are not allowed.',
			{ itemIndex },
		);
	}
	return normalized;
}

async function authorizationBody(
	context: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const credentials = await context.getCredentials('nuvemShopApi');
	const clientId = String(credentials.appId ?? '').trim();
	const clientSecret = String(credentials.clientSecret ?? '').trim();
	const code = String(context.getNodeParameter('authorizationCode', itemIndex, '')).trim();

	if (!clientId || !clientSecret) {
		throw new NodeOperationError(
			context.getNode(),
			'Authorization Code exchange requires App ID and Client Secret in the Nuvem Shop credential.',
			{ itemIndex },
		);
	}

	return {
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'authorization_code',
		code,
	};
}

async function binaryExecutionData(
	context: IExecuteFunctions,
	response: unknown,
	itemIndex: number,
	fileName: string,
	mimeType: string,
): Promise<INodeExecutionData> {
	let buffer: Buffer;
	if (Buffer.isBuffer(response)) {
		buffer = response;
	} else if (response instanceof ArrayBuffer) {
		buffer = Buffer.from(response);
	} else if (ArrayBuffer.isView(response)) {
		buffer = Buffer.from(response.buffer, response.byteOffset, response.byteLength);
	} else {
		throw new NodeOperationError(
			context.getNode(),
			'The API did not return binary data for an operation configured as a file download.',
			{ itemIndex },
		);
	}

	const binaryPropertyName = String(
		context.getNodeParameter('binaryPropertyName', itemIndex, 'data'),
	).trim();
	const binaryData = await context.helpers.prepareBinaryData(buffer, fileName, mimeType);

	return {
		json: { fileName, mimeType, size: buffer.length },
		binary: { [binaryPropertyName]: binaryData },
	};
}

export async function executeDefinedOperation(
	this: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	itemIndex: number,
): Promise<unknown> {
	const endpoint = resolvePath(this, operation, itemIndex);
	let body: IDataObject | IDataObject[] | FormData = {};

	if (operation.scope === 'authorization') {
		body = await authorizationBody(this, itemIndex);
	} else if (operation.body) {
		const parsedBody = parseJsonBody(
			this,
			this.getNodeParameter('body', itemIndex, '{}'),
			'Body (JSON)',
			itemIndex,
		);
		if (operation.bodyType === 'multipart') {
			if (Array.isArray(parsedBody)) {
				throw new NodeOperationError(
					this.getNode(),
					'Multipart Fields (JSON) must be an object whose top-level keys are form field names.',
					{ itemIndex },
				);
			}
			body = await buildMultipartForm(this, parsedBody, itemIndex);
		} else {
			body = parsedBody;
		}
	}

	const query = operation.query
		? parseJsonObject(
				this,
				this.getNodeParameter('query', itemIndex, '{}'),
				'Query Parameters (JSON)',
				itemIndex,
			)
		: {};

	if (operation.paginated) {
		if (body instanceof FormData) {
			throw new NodeOperationError(
				this.getNode(),
				'Paginated multipart requests are not supported',
				{
					itemIndex,
				},
			);
		}
		const returnAll = this.getNodeParameter('returnAll', itemIndex, false) as boolean;
		const maxItems = returnAll
			? Number.POSITIVE_INFINITY
			: (this.getNodeParameter('limit', itemIndex, 50) as number);
		return await nuvemShopApiRequestAllItems.call(
			this,
			operation.method,
			endpoint,
			body,
			query,
			maxItems,
			operation.responseProperty,
			{
				scope: operation.scope,
				apiVersion: operation.apiVersion,
			},
		);
	}

	const response = await nuvemShopApiRequest.call(this, operation.method, endpoint, body, query, {
		scope: operation.scope,
		responseType: operation.responseType,
		bodyType: operation.bodyType,
		apiVersion: operation.apiVersion,
	});

	if (operation.responseType === 'binary') {
		return await binaryExecutionData(
			this,
			response,
			itemIndex,
			operation.binaryFileName ?? 'nuvemshop-download.bin',
			operation.binaryMimeType ?? 'application/octet-stream',
		);
	}

	return response;
}

export async function executeCustomApiCall(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<unknown> {
	const endpoint = assertRelativeEndpoint(
		this,
		String(this.getNodeParameter('endpoint', itemIndex)),
		itemIndex,
	);
	const method = this.getNodeParameter('requestMethod', itemIndex) as IHttpRequestMethods;
	const scope = this.getNodeParameter('requestScope', itemIndex) as NuvemShopRequestScope;
	const bodyType = this.getNodeParameter('bodyType', itemIndex, 'json') as 'json' | 'multipart';
	const responseType = this.getNodeParameter('responseType', itemIndex, 'json') as
		| 'json'
		| 'binary';
	const query = parseJsonObject(
		this,
		this.getNodeParameter('query', itemIndex, '{}'),
		'Query Parameters (JSON)',
		itemIndex,
	);

	let body: IDataObject | IDataObject[] | FormData = {};
	if (['DELETE', 'PATCH', 'POST', 'PUT'].includes(method)) {
		const parsedBody = parseJsonBody(
			this,
			this.getNodeParameter('body', itemIndex, '{}'),
			'Body (JSON)',
			itemIndex,
		);
		if (bodyType === 'multipart') {
			if (Array.isArray(parsedBody)) {
				throw new NodeOperationError(this.getNode(), 'Multipart Body must be a JSON object', {
					itemIndex,
				});
			}
			body = await buildMultipartForm(this, parsedBody, itemIndex);
		} else {
			body = parsedBody;
		}
	}

	const response = await nuvemShopApiRequest.call(this, method, endpoint, body, query, {
		scope,
		responseType,
		bodyType,
	});
	if (responseType === 'binary') {
		return await binaryExecutionData(
			this,
			response,
			itemIndex,
			'nuvemshop-download.bin',
			'application/octet-stream',
		);
	}
	return response;
}
