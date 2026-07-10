import type { IHttpRequestMethods } from 'n8n-workflow';

export type NuvemShopRequestScope = 'store' | 'unversionedStore' | 'partner' | 'authorization';

export interface NuvemShopPathParameter {
	name: string;
	displayName: string;
	description: string;
	placeholder?: string;
	loadOptionsMethod?: string;
}

export interface NuvemShopJsonInput {
	description: string;
	example: string;
	required?: boolean;
}

export interface NuvemShopOperationDefinition {
	name: string;
	value: string;
	action: string;
	description: string;
	method: IHttpRequestMethods;
	path: string;
	scope?: NuvemShopRequestScope;
	pathParameters?: NuvemShopPathParameter[];
	body?: NuvemShopJsonInput;
	bodyType?: 'json' | 'multipart';
	query?: NuvemShopJsonInput;
	paginated?: boolean;
	responseProperty?: string;
	responseType?: 'json' | 'binary';
	binaryFileName?: string;
	binaryMimeType?: string;
	apiVersion?: '2025-03' | 'v1' | 'unstable';
}

export interface NuvemShopResourceDefinition {
	name: string;
	value: string;
	description: string;
	operations: NuvemShopOperationDefinition[];
}
