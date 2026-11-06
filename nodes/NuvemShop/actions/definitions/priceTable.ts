/**
 * Recurso Price Table (tabelas de preço B2B) da Nuvemshop, doc 2025-03:
 * https://nuvemshop.dev/en-US/api/resources/2025-03/products/price-tables/price-tables
 *
 * Por que um arquivo próprio: o `catalog.ts` já passa de 500 linhas, e as 17 operações deste
 * recurso formam um grupo coeso (tabela, exceções por categoria, exceções por variante e
 * clientes). As operações são declarativas: `properties.ts` e `execute.ts` fazem o resto.
 */
// Os tipos descrevem o formato de uma operação e de um recurso do node.
import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from '../types';

// Estes ajudantes montam o parâmetro de caminho, o corpo JSON e os filtros no padrão do node.
import { jsonBody, jsonQuery, pathParameter } from './common';

// Limite de `per_page` que a doc fixa na lista de tabelas e nas tabelas de um cliente.
// Acima disso a API recusa ou corta, então o node pede no máximo isso.
const TABLE_PAGE_SIZE = 10;
// Limite de `per_page` que a doc fixa nas sublistas (categorias, variantes e clientes).
const SUBLIST_PAGE_SIZE = 50;

// ID da tabela de preço. O nome de exibição "Price Table ID" liga o campo ao Resource Locator
// da versão 2 (lista pesquisável + colar o ID), como os outros IDs principais do node.
const priceTableId = pathParameter('priceTableId', 'Price Table ID', 'price table', {
	placeholder: 'e.g. 1',
	description:
		'ID of the price table returned by Price Table > Create or Get Many. Choose it from the list or paste the ID. Never use a category, variant, or customer ID here.',
});

// ID da categoria que tem exceção na tabela. Vem do Get Categories ou do recurso Category.
const categoryId = pathParameter('categoryId', 'Category ID', 'category', {
	placeholder: 'e.g. 1238746858',
	description:
		'Numeric ID of the category that has an exception in this price table. Obtain it from Price Table > Get Categories or from Category > Get Many.',
});

// O nome de exibição NÃO é "Product Variant ID" de propósito: esse nome aciona o dropdown de
// variantes de um produto, e aqui a variante não depende de um produto escolhido no formulário.
const variantId = pathParameter('variantId', 'Variant ID', 'product variant', {
	placeholder: 'e.g. 136548285',
	description:
		'Numeric ID of the product variant that has an exception in this price table. Obtain it from Price Table > Get Variants or from Product Variant > Get Many.',
});

// ID do cliente ligado à tabela. O nome "Customer ID" liga o campo ao Resource Locator de clientes.
const customerId = pathParameter('customerId', 'Customer ID', 'customer', {
	placeholder: 'e.g. 987654321',
	description:
		'Numeric ID of the customer linked to this price table, or whose price tables are listed. Obtain it from Price Table > Get Customers or Customer > Get Many.',
});

// Exemplo completo de tabela, copiado da doc. Os campos guiados do formulário saem dele.
const tableBodyExample =
	'{"name":"Wholesale","default_discount":"7.00","cart_minimum_price":"250.00","cart_minimum_quantity":30,"auto_approve_customers":true,"categories":[{"id":"135796548","discount":"15.00"}],"product_variants":[{"product_id":"84682548","product_variant_id":"234098766","discount":"10.00","price":null}]}';

// As 17 rotas do recurso, na ordem da doc: tabela, categorias, variantes e clientes.
const priceTableOperations: NuvemShopOperationDefinition[] = [
	// POST /products/price-tables: cria a tabela (name e default_discount são obrigatórios).
	{
		name: 'Create',
		value: 'create',
		action: 'Create a price table',
		description:
			'Create a price table that gives a default percentage discount to every product, with optional exceptions by category and by product variant. name and default_discount are required. The most specific rule wins: a variant exception beats a category exception, which beats the default discount; a fixed variant price beats its percentage. This changes store pricing for the linked customers.',
		method: 'POST',
		path: '/products/price-tables',
		body: jsonBody(
			'Price table with name, default_discount (string such as "7.00"), and optional cart_minimum_price, cart_minimum_quantity, auto_approve_customers, categories (id and discount), and product_variants (product_id, product_variant_id, discount, price).',
			tableBodyExample,
		),
	},
	// GET /products/price-tables/{id}: lê uma tabela. Só leitura.
	{
		name: 'Get',
		value: 'get',
		action: 'Get a price table',
		description:
			'Retrieve one price table by its exact ID, including its default discount, cart minimums, and whether it has category, variant, and customer rules. The operation does not modify store data.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}',
		pathParameters: [priceTableId],
	},
	// GET /products/price-tables: lista as tabelas, no máximo 10 por página (pageSize).
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many price tables',
		description:
			'List the price tables of the store. The API returns at most 10 per page; Return All follows every page at a controlled rate, otherwise Limit caps the number of records returned as separate n8n items.',
		method: 'GET',
		path: '/products/price-tables',
		paginated: true,
		pageSize: TABLE_PAGE_SIZE,
		query: jsonQuery(
			'The endpoint accepts only page and per_page, which the node manages, so this field stays empty.',
		),
	},
	// PUT /products/price-tables/{id}: troca os dados da tabela (name e default_discount obrigatórios).
	{
		name: 'Update',
		value: 'update',
		action: 'Update a price table',
		description:
			'Replace the settings of one price table. name and default_discount are required, as in Create. Sending categories or product_variants replaces that whole list, and an empty array clears it; omit them to keep the current exceptions. Read the table first when overwriting.',
		method: 'PUT',
		path: '/products/price-tables/{priceTableId}',
		pathParameters: [priceTableId],
		body: jsonBody(
			'Price table with name, default_discount, and optional active, cart minimums, auto_approve_customers, categories, and product_variants.',
			'{"name":"Wholesale","default_discount":"10.00","active":true,"cart_minimum_price":"350.00","cart_minimum_quantity":20,"auto_approve_customers":true}',
		),
	},
	// PUT .../categories: grava várias exceções de categoria de uma vez (corpo é um array).
	{
		name: 'Set Categories',
		value: 'setCategories',
		action: 'Add or update category exceptions in a price table',
		description:
			'Add or update one or more category discount exceptions in a price table. The body is a JSON array of objects with the category id and its discount percentage as a string. The API answers 204 with no body. This changes store pricing.',
		method: 'PUT',
		path: '/products/price-tables/{priceTableId}/categories',
		pathParameters: [priceTableId],
		body: jsonBody(
			'JSON array of category exceptions. Each item needs id and discount.',
			'[{"id":"1238746858","discount":"20.00"},{"id":"3896583258","discount":"0.00"}]',
		),
	},
	// GET .../categories/{id}: lê a exceção de uma categoria. Só leitura.
	{
		name: 'Get Category',
		value: 'getCategory',
		action: 'Get one category exception of a price table',
		description:
			'Retrieve the discount exception of one category in a price table. The operation does not modify store data.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}/categories/{categoryId}',
		pathParameters: [priceTableId, categoryId],
	},
	// GET .../categories: lista as exceções de categoria, no máximo 50 por página.
	{
		name: 'Get Categories',
		value: 'getCategories',
		action: 'Get the category exceptions of a price table',
		description:
			'List the category discount exceptions of a price table. The API returns at most 50 per page; Return All follows every page, otherwise Limit caps the records returned.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}/categories',
		pathParameters: [priceTableId],
		paginated: true,
		pageSize: SUBLIST_PAGE_SIZE,
		query: jsonQuery(
			'The endpoint accepts only page and per_page, which the node manages, so this field stays empty.',
		),
	},
	// DELETE .../categories/{id}: remove a exceção de uma categoria; ela volta ao desconto padrão.
	{
		name: 'Delete Category',
		value: 'deleteCategory',
		action: 'Delete a category exception from a price table',
		description:
			'Remove the discount exception of one category from a price table. Products of that category fall back to the default discount. The API answers 204 with no body.',
		method: 'DELETE',
		path: '/products/price-tables/{priceTableId}/categories/{categoryId}',
		pathParameters: [priceTableId, categoryId],
	},
	// PUT .../product-variants: grava várias exceções de variante de uma vez (corpo é um array).
	{
		name: 'Set Variants',
		value: 'setVariants',
		action: 'Add or update variant exceptions in a price table',
		description:
			'Add or update one or more product variant exceptions in a price table. Each item has product_id, product_variant_id, a percentage discount, and an optional fixed price that replaces the percentage. The API answers 204 with no body. This changes store pricing.',
		method: 'PUT',
		path: '/products/price-tables/{priceTableId}/product-variants',
		pathParameters: [priceTableId],
		body: jsonBody(
			'JSON array of variant exceptions. Each item needs product_id, product_variant_id, and discount; price is optional.',
			'[{"product_id":"136548284","product_variant_id":"136548285","discount":"20.00","price":"150.00"}]',
		),
	},
	// GET .../product-variants/{id}: lê a exceção de uma variante. Só leitura.
	{
		name: 'Get Variant',
		value: 'getVariant',
		action: 'Get one variant exception of a price table',
		description:
			'Retrieve the discount or fixed-price exception of one product variant in a price table. The operation does not modify store data.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}/product-variants/{variantId}',
		pathParameters: [priceTableId, variantId],
	},
	// GET .../product-variants: lista as exceções de variante, no máximo 50 por página.
	{
		name: 'Get Variants',
		value: 'getVariants',
		action: 'Get the variant exceptions of a price table',
		description:
			'List the product variant exceptions of a price table. The API returns at most 50 per page; Return All follows every page, otherwise Limit caps the records returned.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}/product-variants',
		pathParameters: [priceTableId],
		paginated: true,
		pageSize: SUBLIST_PAGE_SIZE,
		query: jsonQuery(
			'The endpoint accepts only page and per_page, which the node manages, so this field stays empty.',
		),
	},
	// DELETE .../product-variants/{id}: remove a exceção de uma variante.
	{
		name: 'Delete Variant',
		value: 'deleteVariant',
		action: 'Delete a variant exception from a price table',
		description:
			'Remove the exception of one product variant from a price table. The variant falls back to its category exception or to the default discount. The API answers 204 with no body.',
		method: 'DELETE',
		path: '/products/price-tables/{priceTableId}/product-variants/{variantId}',
		pathParameters: [priceTableId, variantId],
	},
	// PUT .../customers: liga clientes à tabela (acrescenta; 409 se algum já tem tabela).
	{
		name: 'Add Customers',
		value: 'addCustomers',
		action: 'Add customers to a price table',
		description:
			'Link customers to a price table. The call appends: customers already linked to this table stay. A customer can belong to only one price table, so if any customer in the batch is already linked to a table the whole batch fails with 409 and the response lists the conflicting IDs. The limit is 10,000 customers per request. The API answers 204 with no body.',
		method: 'PUT',
		path: '/products/price-tables/{priceTableId}/customers',
		pathParameters: [priceTableId],
		body: jsonBody(
			'JSON array of customer IDs as strings, at most 10,000.',
			'["123456789","654987321"]',
		),
	},
	// POST .../approve-customers: aprova clientes pendentes (tabelas sem aprovação automática).
	{
		name: 'Approve Customers',
		value: 'approveCustomers',
		action: 'Approve customers of a price table',
		description:
			'Approve the link of one or more customers to a price table, for tables that do not approve customers automatically. The API answers 204 with no body.',
		method: 'POST',
		path: '/products/price-tables/{priceTableId}/approve-customers',
		pathParameters: [priceTableId],
		body: jsonBody('JSON array of customer IDs as strings.', '["123456789","654987321"]'),
	},
	// GET .../customers: lista os clientes da tabela, no máximo 50 por página.
	{
		name: 'Get Customers',
		value: 'getCustomers',
		action: 'Get the customers of a price table',
		description:
			'List the customers linked to a price table, with the date of each link and of its approval (null while pending). The API returns at most 50 per page; Return All follows every page, otherwise Limit caps the records returned.',
		method: 'GET',
		path: '/products/price-tables/{priceTableId}/customers',
		pathParameters: [priceTableId],
		paginated: true,
		pageSize: SUBLIST_PAGE_SIZE,
		query: jsonQuery(
			'The endpoint accepts only page and per_page, which the node manages, so this field stays empty.',
		),
	},
	// DELETE .../customers/{id}: desliga um cliente da tabela (necessário antes de mudá-lo de tabela).
	{
		name: 'Delete Customer',
		value: 'deleteCustomer',
		action: 'Remove a customer from a price table',
		description:
			'Unlink one customer from a price table. Do this before moving the customer to another table, because a customer can belong to only one table. The API answers 204 with no body.',
		method: 'DELETE',
		path: '/products/price-tables/{priceTableId}/customers/{customerId}',
		pathParameters: [priceTableId, customerId],
	},
	// GET /products/price-tables/customers/{id}: lista as tabelas de um cliente, no máximo 10 por página.
	{
		name: 'Get Price Tables of a Customer',
		value: 'getByCustomer',
		action: 'Get the price tables of a customer',
		description:
			'List the price tables linked to one customer. The API returns at most 10 per page; Return All follows every page, otherwise Limit caps the records returned.',
		method: 'GET',
		path: '/products/price-tables/customers/{customerId}',
		pathParameters: [customerId],
		paginated: true,
		pageSize: TABLE_PAGE_SIZE,
		query: jsonQuery(
			'The endpoint accepts only page and per_page, which the node manages, so this field stays empty.',
		),
	},
];

// O recurso entra na lista geral (`actions/index.ts`), que ordena por nome e gera o dropdown.
export const priceTableResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Price Table',
		value: 'priceTable',
		description:
			'B2B price tables that apply a default discount, category exceptions, and variant exceptions or fixed prices to linked customers',
		operations: priceTableOperations,
	},
];
