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

// Trava de confirmação de uma operação destrutiva (porta 1 do plano rotas-novas). O node mostra um
// booleano desligado com este nome e recusa a operação, antes de qualquer requisição, se ele não for ligado.
export interface NuvemShopConfirmation {
	name: string;
	displayName: string;
	description: string;
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
	advancedBody?: boolean;
	query?: NuvemShopJsonInput;
	// Filtros que a API exige na query; o node recusa a operação antes do HTTP se algum faltar.
	requiredQuery?: string[];
	// Presente só nas operações destrutivas: ver NuvemShopConfirmation.
	confirmation?: NuvemShopConfirmation;
	paginated?: boolean;
	// Teto de `per_page` desta operação. Sem ele o node pede 200 por página; as rotas de Price
	// Table só aceitam 10 ou 50, e acima disso a API recusa ou corta a página (porta 2 do plano).
	pageSize?: number;
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
