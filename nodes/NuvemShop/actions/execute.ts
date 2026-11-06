import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseJsonBody, parseJsonObject } from '../helpers/json';
import { emptyLocatorError, getIdParameter, idKindFor } from '../helpers/resourceLocator';
import { buildMultipartForm } from '../helpers/multipart';
import { nuvemShopApiRequest, nuvemShopApiRequestAllItems } from '../transport';
import { guidedValues, validateRequiredBody } from './guidedInputs';
import type { NuvemShopOperationDefinition, NuvemShopRequestScope } from './types';

function resolvePath(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	itemIndex: number,
): string {
	return operation.path.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, parameterName: string) => {
		// Texto na versão 1 e Resource Locator na versão 2 saem do mesmo helper como texto.
		const value = getIdParameter(context, parameterName, itemIndex);
		if (!value) {
			// Na versão 2 os cinco IDs principais ganham a mensagem do Resource Locator vazio.
			const displayName = operation.pathParameters?.find(
				(parameter) => parameter.name === parameterName,
			)?.displayName;
			const kind = idKindFor(displayName);
			if (kind && Number(context.getNode().typeVersion) >= 2) {
				throw emptyLocatorError(context, kind, itemIndex);
			}
			throw new NodeOperationError(
				context.getNode(),
				`The path parameter "${parameterName}" is required for ${operation.method} ${operation.path}`,
				{ itemIndex },
			);
		}
		return encodeURIComponent(value);
	});
}

// Recusa a operação destrutiva cujo booleano de confirmação está desligado (padrão).
function assertConfirmed(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	itemIndex: number,
): void {
	const confirmation = operation.confirmation;
	// Operação sem trava de confirmação segue direto.
	if (!confirmation) return;
	// Só o booleano verdadeiro libera; ausente ou falso recusa.
	if (context.getNodeParameter(confirmation.name, itemIndex, false) === true) return;
	throw new NodeOperationError(
		context.getNode(),
		`"${confirmation.displayName}" is off, so no request was sent`,
		{
			itemIndex,
			description: `Turn on "${confirmation.displayName}" to confirm that you want to run ${operation.name} (${operation.method} ${operation.path})`,
		},
	);
}

// Confere que cada filtro obrigatório da query tem valor. Texto em branco e lista só de vírgulas
// (" , ") contam como ausentes: a API receberia `events= , ` e responderia erro.
function assertRequiredQuery(
	context: IExecuteFunctions,
	operation: NuvemShopOperationDefinition,
	query: IDataObject,
	itemIndex: number,
): void {
	for (const name of operation.requiredQuery ?? []) {
		// Separa por vírgula e exige ao menos um item com texto.
		const hasValue = String(query[name] ?? '')
			.split(',')
			.some((item) => item.trim());
		if (hasValue) continue;
		throw new NodeOperationError(
			context.getNode(),
			`The query parameter "${name}" is required for ${operation.method} ${operation.path}`,
			{ itemIndex, description: `Fill "${name}" in Filters or in Additional Query Parameters` },
		);
	}
}

function assertRelativeEndpoint(
	context: IExecuteFunctions,
	endpoint: string,
	itemIndex: number,
): string {
	const normalized = endpoint.trim();
	const path = normalized.split(/[?#]/, 1)[0];
	const containsControlCharacter = (value: string) =>
		[...value].some((character) => {
			const code = character.charCodeAt(0);
			return code <= 0x1f || code === 0x7f;
		});
	const hasControlCharacter = containsControlCharacter(normalized);
	const hasUnsafePathSegment = path.split('/').some((segment) => {
		let decoded = segment;
		let fullyDecoded = false;
		for (let pass = 0; pass < 8; pass++) {
			try {
				const next = decodeURIComponent(decoded);
				if (next === decoded) {
					fullyDecoded = true;
					break;
				}
				decoded = next;
			} catch {
				return true;
			}
		}

		return (
			!fullyDecoded ||
			decoded === '.' ||
			decoded === '..' ||
			decoded.includes('/') ||
			decoded.includes('\\') ||
			containsControlCharacter(decoded)
		);
	});
	if (
		!normalized.startsWith('/') ||
		normalized.startsWith('//') ||
		normalized.includes('://') ||
		normalized.includes('\\') ||
		hasControlCharacter ||
		hasUnsafePathSegment
	) {
		throw new NodeOperationError(
			context.getNode(),
			'Endpoint must be a safe relative Nuvemshop API path beginning with one slash, for example /products. Domains, full URLs, backslashes, control characters, and path traversal segments are not allowed.',
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
	// A confirmação vem antes de tudo: sem ela nenhuma requisição sai, nem para montar a rota.
	assertConfirmed(this, operation, itemIndex);
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
		const guidedBody = guidedValues(this, operation, itemIndex, 'body');
		if (Array.isArray(parsedBody)) {
			if (Object.keys(guidedBody).length) {
				throw new NodeOperationError(
					this.getNode(),
					'Guided fields cannot be combined with an array-shaped Advanced Body (JSON). Use one input method for this operation.',
					{ itemIndex },
				);
			}
			body = parsedBody;
		} else {
			body = { ...parsedBody, ...guidedBody };
		}
		validateRequiredBody(this, operation, body, itemIndex);
		if (operation.bodyType === 'multipart') {
			if (Array.isArray(body)) {
				throw new NodeOperationError(
					this.getNode(),
					'Multipart Fields (JSON) must be an object whose top-level keys are form field names.',
					{ itemIndex },
				);
			}
			body = await buildMultipartForm(this, body, itemIndex);
		}
	}

	const query = operation.query
		? {
				...parseJsonObject(
					this,
					this.getNodeParameter('query', itemIndex, '{}'),
					'Query Parameters (JSON)',
					itemIndex,
				),
				...guidedValues(this, operation, itemIndex, 'query'),
			}
		: {};

	// Filtro obrigatório da API (ex.: `events` ao apagar integração) falta? Erro local, sem HTTP.
	assertRequiredQuery(this, operation, query, itemIndex);

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
				// Repassa o teto de `per_page` da operação; sem ele a paginação usa 200.
				maxPageSize: operation.pageSize,
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
