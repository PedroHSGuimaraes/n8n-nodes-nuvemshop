import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { readIdValue } from '../helpers/resourceLocator';
import { nuvemShopApiRequestAllItems } from '../transport';

// Exportada para o listSearch reaproveitar a mesma regra de nome traduzido (pt, pt_BR, es...).
export function translatedText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return '';
	const translations = value as Record<string, unknown>;
	for (const language of ['pt', 'pt_BR', 'es', 'es_AR', 'en']) {
		if (typeof translations[language] === 'string' && translations[language]) {
			return translations[language] as string;
		}
	}
	return String(Object.values(translations).find((item) => typeof item === 'string') ?? '');
}

function optionName(item: IDataObject, fields: string[], fallback: string): string {
	for (const field of fields) {
		const text = translatedText(item[field]);
		if (text) return text;
	}
	return fallback;
}

function toOptions(
	items: unknown[],
	nameFields: string[],
	idField = 'id',
	prefix?: (item: IDataObject) => string,
): INodePropertyOptions[] {
	return items
		.filter(
			(item): item is IDataObject =>
				item !== null && typeof item === 'object' && !Array.isArray(item),
		)
		.map((item) => {
			const value = String(item[idField] ?? '');
			const label = optionName(item, nameFields, value);
			const namedLabel = prefix ? `${prefix(item)}${label}` : label;
			return {
				name: namedLabel && namedLabel !== value ? `${namedLabel} — ${value}` : value,
				value,
			};
		})
		.filter((option) => option.value)
		.sort((left, right) => left.name.localeCompare(right.name));
}

async function loadCollection(
	context: ILoadOptionsFunctions,
	endpoint: string,
	query: IDataObject = {},
	responseProperty?: string,
): Promise<unknown[]> {
	return await nuvemShopApiRequestAllItems.call(
		context,
		'GET',
		endpoint,
		{},
		query,
		200,
		responseProperty,
	);
}

export const loadOptions = {
	async getCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/categories', { fields: 'id,name' });
		return toOptions(items, ['name']);
	},

	async getCoupons(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/coupons', { fields: 'id,code' });
		return toOptions(items, ['code']);
	},

	async getCustomers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/customers', { fields: 'id,name,email' });
		return toOptions(items, ['name', 'email']);
	},

	async getLocations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/locations');
		return toOptions(items, ['name', 'address']);
	},

	async getOrders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/orders', { fields: 'id,number,customer' });
		return toOptions(items, ['number'], 'id', () => '#');
	},

	async getProducts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/products', { fields: 'id,name' });
		return toOptions(items, ['name']);
	},

	async getProductVariants(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		// O produto pode vir como texto (versão 1) ou como Resource Locator (versão 2).
		const productId = readIdValue(
			this.getCurrentNodeParameter('product_id') ?? this.getCurrentNodeParameter('productId'),
		);
		if (!/^\d+$/.test(productId)) return [];
		const items = await loadCollection(
			this,
			`/products/${encodeURIComponent(productId)}/variants`,
			{ fields: 'id,sku,values' },
		);
		return toOptions(items, ['sku']);
	},

	async getWebhooks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await loadCollection(this, '/webhooks', { fields: 'id,event,url' });
		return toOptions(items, ['event', 'url']);
	},
};
