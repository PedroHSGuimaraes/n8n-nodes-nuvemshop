/**
 * Busca paginada para os Resource Locators da versão 2 (plano node-cli-campos-v2, slice S3).
 *
 * O editor do n8n chama estes métodos quando a pessoa abre a lista "From List" de um ID ou
 * digita na caixa de busca. Cada chamada busca UMA página da Nuvemshop e devolve o token da
 * próxima, para o editor pedir mais ao rolar a lista. Nunca baixamos a lista inteira: o
 * `loadOptions` antigo só trazia as 200 primeiras linhas e escondia o resto.
 */
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { nuvemShopApiRequest } from '../transport';
import { translatedText } from './loadOptions';

// Tamanho da página das rotas com busca no servidor (`q`); equilibra rapidez e rolagem.
const PAGE_SIZE = 50;
// A rota de categorias não tem `q`, então buscamos páginas grandes e filtramos aqui.
const CATEGORY_PAGE_SIZE = 200;
const CATEGORY_MAX_PAGES = 5;
const CATEGORY_MAX_RESULTS = 20;

/** Tira acento e caixa para a busca "contém" achar "Camisêtas" ao digitar "camise". */
function normalize(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Converte o token do editor ("2") no número da página; sem token vale a página 1. */
function pageFromToken(paginationToken: unknown): number {
	const page = Number(paginationToken);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Busca uma página da lista; resposta que não seja lista vira lista vazia. */
async function fetchPage(
	context: ILoadOptionsFunctions,
	endpoint: string,
	query: IDataObject,
	page: number,
	perPage: number,
): Promise<IDataObject[]> {
	const response = await nuvemShopApiRequest.call(
		context,
		'GET',
		endpoint,
		{},
		{ ...query, page, per_page: perPage },
	);
	return Array.isArray(response) ? (response as IDataObject[]) : [];
}

/** Texto do rótulo: "Nome — ID", ou só o ID quando a API não devolve nome. */
function labelWithId(item: IDataObject, name: string): INodeListSearchItems {
	const value = String(item.id ?? '');
	return { name: name ? `${name} — ${value}` : value, value };
}

/** Monta o resultado; só inclui o token quando a página veio cheia (pode haver mais). */
function result(
	results: INodeListSearchItems[],
	paginationToken: string | undefined,
): INodeListSearchResult {
	return paginationToken ? { results, paginationToken } : { results };
}

/**
 * Busca com `q` no servidor: um GET por chamada, com `fields` para a resposta vir enxuta.
 * Página cheia (PAGE_SIZE itens) devolve o token da próxima página.
 */
async function searchWithQuery(
	context: ILoadOptionsFunctions,
	endpoint: string,
	fields: string,
	filter: string | undefined,
	paginationToken: string | undefined,
	toItem: (item: IDataObject) => INodeListSearchItems,
	keep: (item: IDataObject, search: string) => boolean = () => true,
): Promise<INodeListSearchResult> {
	const page = pageFromToken(paginationToken);
	const search = (filter ?? '').trim();
	const query: IDataObject = { fields };
	if (search) query.q = search;
	const items = await fetchPage(context, endpoint, query, page, PAGE_SIZE);
	const kept = search ? items.filter((item) => keep(item, search)) : items;
	return result(kept.map(toItem), items.length >= PAGE_SIZE ? String(page + 1) : undefined);
}

export const listSearch = {
	async searchOrders(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWithQuery(
			this,
			'/orders',
			'id,number,contact_name',
			filter,
			paginationToken,
			(item) => ({
				name: `#${String(item.number ?? item.id)} — ${String(item.contact_name ?? '')}`.replace(
					/ — $/,
					'',
				),
				value: String(item.id ?? ''),
			}),
		);
	},

	async searchProducts(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWithQuery(this, '/products', 'id,name', filter, paginationToken, (item) =>
			labelWithId(item, translatedText(item.name)),
		);
	},

	async searchCustomers(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWithQuery(
			this,
			'/customers',
			'id,name,email',
			filter,
			paginationToken,
			(item) => labelWithId(item, translatedText(item.name) || translatedText(item.email)),
		);
	},

	/**
	 * A doc diz só "the coupon's code to filter" para `q`, sem dizer se é igualdade.
	 * Por isso mantemos, no que voltar, só o código que contém o texto (Assumptions do plano).
	 */
	async searchCoupons(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		return await searchWithQuery(
			this,
			'/coupons',
			'id,code',
			filter,
			paginationToken,
			(item) => labelWithId(item, translatedText(item.code)),
			(item, search) => normalize(translatedText(item.code)).includes(normalize(search)),
		);
	},

	/**
	 * A rota `GET /categories` não tem `q` (só handle e parent_id). Buscamos páginas de 200,
	 * filtramos o nome por "contém" aqui e paramos com 20 acertos ou 5 páginas, para o editor
	 * não ficar esperando. O token continua de onde paramos.
	 */
	async searchCategories(
		this: ILoadOptionsFunctions,
		filter?: string,
		paginationToken?: string,
	): Promise<INodeListSearchResult> {
		const search = normalize((filter ?? '').trim());
		const results: INodeListSearchItems[] = [];
		let page = pageFromToken(paginationToken);
		let fetched = 0;
		let lastPageFull = false;

		while (fetched < CATEGORY_MAX_PAGES && results.length < CATEGORY_MAX_RESULTS) {
			const items = await fetchPage(
				this,
				'/categories',
				{ fields: 'id,name' },
				page,
				CATEGORY_PAGE_SIZE,
			);
			fetched += 1;
			page += 1;
			lastPageFull = items.length >= CATEGORY_PAGE_SIZE;
			for (const item of items) {
				const name = translatedText(item.name);
				if (!search || normalize(name).includes(search)) results.push(labelWithId(item, name));
			}
			// Página incompleta é a última da loja: não há o que buscar depois dela.
			if (!lastPageFull) break;
		}

		return result(results, lastPageFull ? String(page) : undefined);
	},
};
