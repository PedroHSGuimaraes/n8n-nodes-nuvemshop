import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

import type { JsonBody } from '../helpers/json';
import type { NuvemShopRequestScope } from '../actions/types';

export type NuvemShopContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

// Tempo máximo de espera por resposta da Nuvemshop, em milissegundos (AD-005).
// 30 s deixa folga para multipart e arquivo binário; as listas respondem bem antes disso.
const REQUEST_TIMEOUT_MS = 30000;

interface NuvemShopRequestConfig {
	scope?: NuvemShopRequestScope;
	responseType?: 'json' | 'binary';
	apiVersion?: '2025-03' | 'v1' | 'unstable';
	bodyType?: 'json' | 'multipart';
	// Teto de `per_page` quando a rota aceita menos que os 200 padrão (só usado na paginação).
	maxPageSize?: number;
}

function credentialString(credentials: ICredentialDataDecryptedObject, name: string): string {
	return String(credentials[name] ?? '').trim();
}

function apiOrigin(credentials: ICredentialDataDecryptedObject): string {
	return credentialString(credentials, 'region') === 'international'
		? 'https://api.tiendanube.com'
		: 'https://api.nuvemshop.com.br';
}

function authorizationOrigin(credentials: ICredentialDataDecryptedObject): string {
	return credentialString(credentials, 'region') === 'international'
		? 'https://www.tiendanube.com'
		: 'https://www.nuvemshop.com.br';
}

function requiredCredential(
	context: NuvemShopContext,
	credentials: ICredentialDataDecryptedObject,
	name: string,
	displayName: string,
): string {
	const value = credentialString(credentials, name);
	if (value) return value;

	throw new NodeOperationError(
		context.getNode(),
		`The Nuvem Shop credential requires ${displayName} for this operation. Open the credential, fill in the field, and try again.`,
	);
}

export function buildNuvemShopBaseUrl(
	context: NuvemShopContext,
	credentials: ICredentialDataDecryptedObject,
	scope: NuvemShopRequestScope,
	apiVersion?: '2025-03' | 'v1' | 'unstable',
): string {
	if (scope === 'authorization') return authorizationOrigin(credentials);
	if (scope === 'unversionedStore') {
		const storeId = requiredCredential(context, credentials, 'storeId', 'Store ID');
		return `${apiOrigin(credentials)}/${encodeURIComponent(storeId)}`;
	}

	const version =
		apiVersion ?? requiredCredential(context, credentials, 'apiVersion', 'API Version');
	if (scope === 'partner') {
		const appId = requiredCredential(context, credentials, 'appId', 'App ID');
		return `${apiOrigin(credentials)}/${version}/apps/${encodeURIComponent(appId)}`;
	}

	const storeId = requiredCredential(context, credentials, 'storeId', 'Store ID');
	return `${apiOrigin(credentials)}/${version}/${encodeURIComponent(storeId)}`;
}

export async function nuvemShopApiRequest(
	this: NuvemShopContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: JsonBody | FormData = {},
	qs: IDataObject = {},
	config: NuvemShopRequestConfig = {},
): Promise<unknown> {
	const credentials = await this.getCredentials('nuvemShopApi');
	const scope = config.scope ?? 'store';
	const isStoreScope = scope === 'store' || scope === 'unversionedStore';
	const options: IHttpRequestOptions = {
		method,
		baseURL: buildNuvemShopBaseUrl(this, credentials, scope, config.apiVersion),
		url: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
		qs,
		body,
		json: config.responseType !== 'binary' && config.bodyType !== 'multipart',
		// Sem limite de tempo, uma API travada prende a execução do workflow para sempre.
		timeout: REQUEST_TIMEOUT_MS,
	};

	if (config.responseType === 'binary') options.encoding = 'arraybuffer';
	if (
		!(body instanceof FormData) &&
		((Array.isArray(body) && body.length === 0) ||
			(!Array.isArray(body) && !Object.keys(body).length))
	) {
		delete options.body;
	}
	if (!Object.keys(qs).length) delete options.qs;

	try {
		if (isStoreScope && config.bodyType !== 'multipart') {
			return await this.helpers.httpRequestWithAuthentication.call(this, 'nuvemShopApi', options);
		}

		const userAgent = requiredCredential(this, credentials, 'userAgent', 'User Agent');
		options.headers = {
			Accept: config.responseType === 'binary' ? '*/*' : 'application/json',
			'User-Agent': userAgent,
		};
		if (config.bodyType !== 'multipart') {
			options.headers['Content-Type'] = 'application/json; charset=utf-8';
		}

		if (isStoreScope) {
			const accessToken = requiredCredential(this, credentials, 'accessToken', 'Access Token');
			options.headers.Authorization = `Bearer ${accessToken}`;
		}

		if (scope === 'partner') {
			const clientSecret = requiredCredential(this, credentials, 'clientSecret', 'Client Secret');
			options.headers.Authorization = `Bearer ${clientSecret}`;
		}

		return await this.helpers.httpRequest.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function nestedValue(source: unknown, path: string): unknown {
	return path.split('.').reduce<unknown>((current, key) => {
		if (current === null || typeof current !== 'object' || Array.isArray(current)) return undefined;
		return (current as Record<string, unknown>)[key];
	}, source);
}

function extractPageItems(response: unknown, responseProperty?: string): unknown[] {
	if (Array.isArray(response)) return response;
	if (response === null || typeof response !== 'object') return [];

	const data = response as Record<string, unknown>;
	if (responseProperty) {
		const value = nestedValue(data, responseProperty);
		if (Array.isArray(value)) return value;
	}

	for (const key of ['data', 'items', 'result', 'results', 'products', 'orders', 'customers']) {
		if (Array.isArray(data[key])) return data[key] as unknown[];
	}

	const arrays = Object.values(data).filter(Array.isArray);
	return arrays.length === 1 ? (arrays[0] as unknown[]) : [];
}

function envelopeHasNextPage(
	response: unknown,
	responseProperty: string | undefined,
	currentPage: number,
): boolean | undefined {
	if (!responseProperty) return undefined;
	const parentPath = responseProperty.split('.').slice(0, -1).join('.');
	const parent = parentPath ? nestedValue(response, parentPath) : response;
	if (parent === null || typeof parent !== 'object' || Array.isArray(parent)) return undefined;

	const container = parent as Record<string, unknown>;
	const metaCandidate = container.meta;
	const meta =
		metaCandidate !== null && typeof metaCandidate === 'object' && !Array.isArray(metaCandidate)
			? (metaCandidate as Record<string, unknown>)
			: container;

	if (Object.prototype.hasOwnProperty.call(meta, 'nextPage')) {
		const nextPage = meta.nextPage;
		return nextPage !== null && nextPage !== false && nextPage !== '' && nextPage !== 0;
	}

	const pageCount = Number(meta.pageCount ?? meta.lastPage);
	const page = Number(meta.page ?? currentPage);
	if (Number.isFinite(pageCount) && Number.isFinite(page)) return page < pageCount;
	return undefined;
}

export async function nuvemShopApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: JsonBody,
	qs: IDataObject,
	maxItems: number,
	responseProperty?: string,
	config: NuvemShopRequestConfig = {},
): Promise<unknown[]> {
	const returnData: unknown[] = [];
	const query: IDataObject = { ...qs };
	let page = Number(query.page ?? 1);
	let pageCount = 0;

	while (pageCount < 1000 && returnData.length < maxItems) {
		pageCount += 1;
		// O teto da operação (10 ou 50 nas Price Tables) vale no lugar dos 200 padrão da API.
		const pageLimit = config.maxPageSize ?? 200;
		// O per_page fica igual em todas as páginas: a API pagina pelo número da página, e uma última
		// página menor (page=3&per_page=5) devolveria de novo itens já lidos. O `slice` final corta
		// o excesso. Com limite menor que o teto, uma página só já basta.
		const pageSize = Math.max(
			1,
			Math.min(pageLimit, Number.isFinite(maxItems) ? maxItems : pageLimit),
		);
		query.page = page;
		query.per_page = pageSize;

		const response = await nuvemShopApiRequest.call(this, method, endpoint, body, query, config);
		const items = extractPageItems(response, responseProperty);
		returnData.push(...items);

		const hasNextPage = envelopeHasNextPage(response, responseProperty, page);
		if (hasNextPage === false || items.length === 0) break;
		if (hasNextPage === undefined && items.length < pageSize) break;
		page += 1;
		await sleep(500);
	}
	if (pageCount >= 1000 && returnData.length < maxItems) {
		throw new NodeOperationError(
			this.getNode(),
			'Pagination stopped after 1,000 API pages while more results may still exist. Narrow the query by date, ID, or another documented filter to avoid returning a silently truncated data set.',
		);
	}

	return Number.isFinite(maxItems) ? returnData.slice(0, maxItems) : returnData;
}
