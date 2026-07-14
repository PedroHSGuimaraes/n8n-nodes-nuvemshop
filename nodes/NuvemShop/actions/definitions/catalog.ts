import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from '../types';

import { jsonBody, jsonQuery, pathParameter } from './common';

interface CustomFieldOperationsConfig {
	resourceName: string;
	ownerName: string;
	ownerPluralName: string;
	definitionBasePath: string;
	ownerBasePath: string;
	ownerResourceValue: 'category' | 'product' | 'product_variant';
	createExample: string;
	associationExample: string;
}

function customFieldOperations(
	config: CustomFieldOperationsConfig,
): NuvemShopOperationDefinition[] {
	const definitionId = pathParameter('id', `${config.resourceName} ID`, config.resourceName, {
		placeholder: 'e.g. 57358282-92e5-47cc-8c6e-9f0a4e7bf05f',
		description: `UUID of the ${config.resourceName} definition. Obtain it from ${config.resourceName} > Get Many or Create; do not use a ${config.ownerName} numeric ID here.`,
	});
	const ownerId = pathParameter('id', `${config.ownerName} ID`, config.ownerName, {
		placeholder: 'e.g. 1234567',
		description: `Numeric ID of the ${config.ownerName} whose custom-field associations will be read or changed. Obtain it from the matching ${config.ownerName} Get or Get Many operation; do not use a custom-field UUID here.`,
	});

	return [
		{
			name: 'Create',
			value: 'create',
			action: `Create a ${config.resourceName}`,
			description: `Create an app-owned custom-field definition for ${config.ownerPluralName}. The API generates a UUID and fixes owner_resource to ${config.ownerResourceValue}. value_type must be one of text_list, text, numeric, or date. For text_list, values contains the allowed strings; duplicate values can be returned with per-value errors even when the definition is created. read_only controls whether merchants may assign the field in the admin panel.`,
			method: 'POST',
			path: config.definitionBasePath,
			body: jsonBody(
				`Definition of the new ${config.resourceName}. name and value_type are required; values is required and should be an empty array for non-list types.`,
				config.createExample,
			),
		},
		{
			name: 'Delete',
			value: 'delete',
			action: `Delete a ${config.resourceName}`,
			description: `Permanently delete one app-owned ${config.resourceName} definition by UUID. This is destructive and can remove the field from associated ${config.ownerPluralName}; definitions created by another app or by the merchant cannot be deleted. Read the definition and its owners first, then confirm the UUID.`,
			method: 'DELETE',
			path: `${config.definitionBasePath}/{id}`,
			pathParameters: [definitionId],
		},
		{
			name: 'Get',
			value: 'get',
			action: `Get a ${config.resourceName}`,
			description: `Retrieve one ${config.resourceName} definition by its exact UUID, including its type, source, read-only flag, timestamps, and allowed values. This does not return the value assigned to a particular ${config.ownerName}; use Get Associated Values for that.`,
			method: 'GET',
			path: `${config.definitionBasePath}/{id}`,
			pathParameters: [definitionId],
		},
		{
			name: 'Get Associated Values',
			value: 'getAssociatedValues',
			action: `Get custom-field values for a ${config.ownerName}`,
			description: `List the custom-field definitions currently associated with one ${config.ownerName}, including each assigned value. Use the numeric ${config.ownerName} ID, not a custom-field UUID. Read this before Set Associated Values so existing assignments that must remain are preserved deliberately.`,
			method: 'GET',
			path: `${config.ownerBasePath}/{id}/custom-fields`,
			pathParameters: [ownerId],
		},
		{
			name: 'Get Many',
			value: 'getMany',
			action: `Get many ${config.resourceName} definitions`,
			description: `List all ${config.resourceName} definitions visible to the connected app, with their UUIDs, value types, allowed values, and read-only flags. The official endpoint does not document page or per_page parameters, so this operation makes one request and returns the API collection.`,
			method: 'GET',
			path: config.definitionBasePath,
		},
		{
			name: 'Get Owners',
			value: 'getOwners',
			action: `Get ${config.ownerPluralName} using a custom field`,
			description: `Retrieve one ${config.resourceName} definition together with the ${config.ownerPluralName} currently associated with it and each assigned value. Supply the custom-field UUID from Get Many, not a numeric ${config.ownerName} ID.`,
			method: 'GET',
			path: `${config.definitionBasePath}/{id}/owners`,
			pathParameters: [definitionId],
		},
		{
			name: 'Set Associated Values',
			value: 'setAssociatedValues',
			action: `Set custom-field values on a ${config.ownerName}`,
			description: `Associate existing custom-field definitions with one ${config.ownerName}, change their assigned values, or remove associations by sending value: null. This changes storefront catalog data and the endpoint controls the current associations. Retrieve existing values first and include every assignment that must remain; never invent custom-field UUIDs. A successful request returns HTTP 204 with no content.`,
			method: 'PUT',
			path: `${config.ownerBasePath}/{id}/custom-fields/values`,
			pathParameters: [ownerId],
			body: jsonBody(
				`JSON array of custom-field UUID and value pairs for the ${config.ownerName}. Use null only when intentionally removing that association.`,
				config.associationExample,
			),
		},
		{
			name: 'Update',
			value: 'update',
			action: `Update a ${config.resourceName}`,
			description: `Update the allowed values of one existing ${config.resourceName} definition. This changes the definition shared by every associated ${config.ownerName}. The API can report duplicate or invalid entries per value, so inspect the returned values array instead of assuming every submitted value was accepted.`,
			method: 'PUT',
			path: `${config.definitionBasePath}/{id}`,
			pathParameters: [definitionId],
			body: jsonBody(
				`Fields accepted by the ${config.resourceName} update endpoint. The documented operation updates the definition's allowed values.`,
				'{"values":["Cotton","Linen","Silk"]}',
			),
		},
	];
}

const categoryId = pathParameter('id', 'Category ID', 'category', {
	placeholder: 'e.g. 4567',
	description:
		'Numeric category ID returned by Category > Create or Get Many. Use the child category ID when changing parent; parent itself belongs in the JSON body. Never infer an ID from a translated name or handle.',
});

const categoryOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a category',
		description:
			'Create one catalog category with multilingual name and optional description, parent, Google taxonomy, and visibility. name is required. Set parent to an existing category ID to create a subcategory. visibility accepts visible or hidden; soft-hidden is inherited from a hidden ancestor and cannot be assigned directly. The store supports at most 1000 categories.',
		method: 'POST',
		path: '/categories',
		body: jsonBody(
			'Writable category fields. Language maps use store language codes such as pt, es, and en. description may contain HTML and is limited to 65,535 characters.',
			'{"name":{"pt":"Camisetas","es":"Remeras","en":"T-Shirts"},"description":{"pt":"<p>Camisetas para todos os estilos.</p>"},"parent":4567,"visibility":"visible","google_shopping_category":"Clothing & Accessories > Clothing"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a category',
		description:
			'Permanently remove one category by numeric ID. This is destructive and can change product navigation and category hierarchy. Retrieve the category first, inspect its subcategories and associated products, and confirm that reassignment is not required before deletion.',
		method: 'DELETE',
		path: '/categories/{id}',
		pathParameters: [categoryId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a category',
		description:
			'Retrieve one category by exact numeric ID, including multilingual content, parent, first-level subcategory IDs, visibility, and Google Shopping category. Use fields to request only selected response properties. This operation does not modify catalog data.',
		method: 'GET',
		path: '/categories/{id}',
		pathParameters: [categoryId],
		query: jsonQuery(
			'Optional response projection. fields is a comma-separated list of category properties.',
			'{"fields":"id,name,parent,subcategories,visibility,updated_at"}',
		),
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many categories',
		description:
			'List store categories with filters for hierarchy, handle, language, ID cursor, and creation or update dates. language is required when filtering by handle. Return All follows every API page; otherwise Limit caps returned records. Use the returned IDs for product category assignments and parent relationships.',
		method: 'GET',
		path: '/categories',
		paginated: true,
		query: jsonQuery(
			'Optional category filters: since_id, language, handle, parent_id, created_at_min, created_at_max, updated_at_min, updated_at_max, and fields. Dates use ISO 8601. The node manages page and per_page.',
			'{"since_id":100,"language":"pt","handle":"camisetas","parent_id":4567,"created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,name,description,handle,parent,subcategories,visibility,updated_at"}',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a category',
		description:
			'Update writable fields of one category. Set parent to another category ID to move it, or null to make it top-level. A hidden category cannot contain visible descendants; hiding a parent makes eligible descendants soft-hidden. Send visible or hidden only, never soft-hidden. subcategories is read-only and must not be sent.',
		method: 'PUT',
		path: '/categories/{id}',
		pathParameters: [categoryId],
		body: jsonBody(
			'Only category fields that should change. Omit subcategories, timestamps, and other read-only response fields.',
			'{"name":{"pt":"Camisetas premium"},"parent":null,"visibility":"hidden"}',
		),
	},
];

const productId = pathParameter('id', 'Product ID', 'product', {
	placeholder: 'e.g. 1234',
	description:
		'Numeric product ID returned by Product > Create, Get Many, or Get by SKU. Never substitute a variant, image, category, or kit component ID.',
});

const productOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a product',
		description:
			'Create one physical or digital product, optionally with variants, images, category IDs, multilingual content, SEO data, and shipping settings. name is required. Product attributes and each variant values array must have the same length, with at most three attributes and 1000 variants. For a fluid request include at most nine images here; add further images through Product Image > Create.',
		method: 'POST',
		path: '/products',
		body: jsonBody(
			'Writable product fields. Monetary and dimension fields belong inside variants. Category entries are numeric IDs from Category > Get Many; image src values must be reachable URLs.',
			'{"name":{"pt":"Camiseta Basica"},"description":{"pt":"<p>Camiseta de algodao.</p>"},"published":true,"free_shipping":false,"requires_shipping":true,"categories":[4567],"brand":"Acme","tags":"camiseta,algodao","attributes":[{"pt":"Tamanho"}],"variants":[{"values":[{"pt":"M"}],"price":"79.90","promotional_price":"69.90","stock_management":true,"stock":25,"sku":"CAM-M","weight":"0.25"}],"images":[{"src":"https://example.com/camiseta.webp"}]}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a product',
		description:
			'Permanently remove one product by numeric ID. This is destructive and removes the item from the storefront together with its catalog variants and image relationships; external workflows may retain broken references. Retrieve and confirm the product ID before deletion.',
		method: 'DELETE',
		path: '/products/{id}',
		pathParameters: [productId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a product',
		description:
			'Retrieve one product by exact numeric ID, including its variants, images, category objects, translations, prices, stock data, and publication settings. Use fields to reduce the response. This read operation is the safest prerequisite for updates that replace categories or multilingual values.',
		method: 'GET',
		path: '/products/{id}',
		pathParameters: [productId],
		query: jsonQuery(
			'Optional response projection. fields is a comma-separated list of product properties.',
			'{"fields":"id,name,variants,images,categories,published,updated_at"}',
		),
	},
	{
		name: 'Get by SKU',
		value: 'getBySku',
		action: 'Get a product by variant SKU',
		description:
			'Return the first product whose variant has the exact SKU supplied in the path. This endpoint searches variant SKU, not product ID. Because it returns only the first match, do not assume SKU is globally unique unless the store enforces that rule; verify the returned variant before mutating data.',
		method: 'GET',
		path: '/products/sku/{sku}',
		pathParameters: [
			pathParameter('sku', 'Variant SKU', 'variant SKU', {
				placeholder: 'e.g. CAM-M',
				description:
					'Exact SKU stored on a product variant. Obtain it from trusted workflow input or a Product/Variant response; matching is used to return the first containing product.',
			}),
		],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many products',
		description:
			'List products with filters for IDs, text, handle, category, publication, shipping, stock, promotional price, dimensions, dates, and sort order. The API returns up to 30 records by default; Return All follows all pages and Limit caps output. Use returned product and nested variant IDs for later operations.',
		method: 'GET',
		path: '/products',
		paginated: true,
		query: jsonQuery(
			'Optional product filters: ids (up to 30 comma-separated IDs), since_id, language, q, handle, category_id, published, free_shipping, max_stock, min_stock, has_promotional_price, has_weight, has_all_dimensions, has_weight_and_all_dimensions, created_at_min/max, updated_at_min/max, sort_by, and fields. The node manages page and per_page.',
			'{"ids":"1234,5678","since_id":100,"language":"pt","q":"camiseta","handle":"camiseta-basica","category_id":4567,"published":true,"free_shipping":false,"max_stock":100,"min_stock":1,"has_promotional_price":true,"has_weight":true,"has_all_dimensions":true,"has_weight_and_all_dimensions":true,"created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","sort_by":"created-at-descending","fields":"id,name,description,handle,variants,images,categories,published,free_shipping,brand,tags,updated_at"}',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a product',
		description:
			'Update product-level fields by exact ID. The categories array is authoritative: sending an empty array removes every category and sending a partial array removes omitted categories; omit categories to preserve them. Price, stock, SKU, weight, and dimensions belong to the product virtual/real variant and must be changed with Product Variant operations.',
		method: 'PUT',
		path: '/products/{id}',
		pathParameters: [productId],
		body: jsonBody(
			'Only product-level fields that should change. Retrieve current categories and translations first when replacing either collection.',
			'{"name":{"pt":"Camiseta Basica Premium"},"published":false,"categories":[4567,5678],"seo_title":"Camiseta Basica Premium","seo_description":"Camiseta premium de algodao."}',
		),
	},
	{
		name: 'Update Stock and Price',
		value: 'updateStockPrice',
		action: 'Update stock and price for many variants',
		description:
			'Bulk-update price and/or inventory for variants grouped by product. This writes live sellable price and stock and accepts at most 50 variants across all products per request. Every product and variant ID must come from Product > Get or Get Many. For multi-location stores, include location_id on every inventory_levels entry; split large payloads and verify partial success flags.',
		method: 'PATCH',
		path: '/products/stock-price',
		body: jsonBody(
			'JSON array of product objects, each containing its exact id and a variants array. Each variant requires id and may contain price and inventory_levels. Stock cannot be negative.',
			'[{"id":53786462,"variants":[{"id":147085180,"price":79.9,"inventory_levels":[{"location_id":"01J0LOCATIONABC","stock":25}]}]}]',
		),
	},
];

const productImageProductId = pathParameter('product_id', 'Product ID', 'product', {
	placeholder: 'e.g. 1234',
	description:
		'Numeric ID of the product that owns the image. Obtain it from Product > Create, Get, Get by SKU, or Get Many; do not use the image ID here.',
});
const productImageId = pathParameter('image_id', 'Product Image ID', 'product image', {
	placeholder: 'e.g. 112',
	description:
		'Numeric image ID returned by Product Image > Create or Get Many for this same product. Never infer it from the image URL or position.',
});
const productImageGenericId = pathParameter('id', 'Product Image ID', 'product image', {
	placeholder: 'e.g. 112',
	description:
		'Numeric image ID returned by Product Image > Create or Get Many for this same product. Never infer it from the image URL or position.',
});

const productImageOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a product image',
		description:
			'Add one image to a product from a public URL or a Base64 attachment. Images must be smaller than 10 MB and use GIF, JPG, PNG, or WEBP. Use either src, or attachment together with filename; do not send both representations unless the API contract requires it. position 1 makes the image the storefront main image. A product supports at most 250 images.',
		method: 'POST',
		path: '/products/{product_id}/images',
		pathParameters: [productImageProductId],
		body: jsonBody(
			'Image source and optional position. For Base64 upload replace src with attachment and filename.',
			'{"src":"https://example.com/products/camiseta-front.webp","position":1,"alt":"Camiseta vista frontal"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a product image',
		description:
			'Permanently remove one image from a product. This changes storefront media; deleting position 1 removes the current main image and may promote another image. Confirm both product ID and image ID from Get Many before deletion.',
		method: 'DELETE',
		path: '/products/{product_id}/images/{id}',
		pathParameters: [productImageProductId, productImageGenericId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a product image',
		description:
			'Retrieve one product image by product ID and image ID. Use fields to limit the response. The returned src normally points to a 1024-pixel asset; this operation does not download binary data or change the image.',
		method: 'GET',
		path: '/products/{product_id}/images/{image_id}',
		pathParameters: [productImageProductId, productImageId],
		query: jsonQuery(
			'Optional response projection using a comma-separated fields value.',
			'{"fields":"id,product_id,src,position,alt,updated_at"}',
		),
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many product images',
		description:
			'List images belonging to one product, optionally filtering by ID cursor, source URL, or position. Return All follows every API page; otherwise Limit caps output. Use the returned image IDs for variant image_id assignments, updates, and deletes.',
		method: 'GET',
		path: '/products/{product_id}/images',
		pathParameters: [productImageProductId],
		paginated: true,
		query: jsonQuery(
			'Optional image filters: since_id, src, position, and fields. The node manages page and per_page.',
			'{"since_id":100,"src":"https://example.com/image.webp","position":1,"fields":"id,product_id,src,position,alt,updated_at"}',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a product image',
		description:
			'Update writable metadata of an existing product image, principally its list position and alt text. Changing position to 1 makes it the main product image and reorders storefront media. Use IDs from Get Many; do not send read-only product_id or timestamps.',
		method: 'PUT',
		path: '/products/{product_id}/images/{id}',
		pathParameters: [productImageProductId, productImageGenericId],
		body: jsonBody(
			'Writable image fields that should change.',
			'{"position":1,"alt":"Camiseta vista frontal"}',
		),
	},
];

const productVariantProductId = pathParameter('product_id', 'Product ID', 'product', {
	placeholder: 'e.g. 1234',
	description:
		'Numeric ID of the product that owns the variant collection. Obtain it from Product > Create, Get, Get by SKU, or Get Many.',
});
const productVariantId = pathParameter('id', 'Product Variant ID', 'product variant', {
	placeholder: 'e.g. 144',
	description:
		'Numeric variant ID returned within Product > Get/Get Many or by Product Variant > Create/Get Many. It must belong to the product_id in the same request.',
});

const productVariantOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a product variant',
		description:
			'Create one new variant under an existing product. values must contain one translated value for each product attribute, in the same order, and the combination must be unique. Products support at most 1000 variants. age_group accepts newborn, infant, toddler, kids, or adult; gender accepts female, male, or unisex. Setting price to null makes the product initiate contact instead of checkout.',
		method: 'POST',
		path: '/products/{product_id}/variants',
		pathParameters: [productVariantProductId],
		body: jsonBody(
			'Writable variant fields. image_id must reference an image of the same product. Prices, cost, weight, width, height, and depth are non-negative values; stock is meaningful when stock_management is true.',
			'{"values":[{"pt":"M"}],"price":"79.90","promotional_price":"69.90","stock_management":true,"stock":25,"sku":"CAM-M","image_id":112,"weight":"0.25","width":"20.00","height":"2.00","depth":"25.00","barcode":"7891234567890","mpn":"CAM-001-M","age_group":"adult","gender":"unisex","cost":"35.00"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a product variant',
		description:
			'Permanently remove one variant from its product. This is destructive and can invalidate SKU, stock, image, cart, or external references. Confirm that product_id and variant ID match and that the product retains a valid variant configuration before deletion.',
		method: 'DELETE',
		path: '/products/{product_id}/variants/{id}',
		pathParameters: [productVariantProductId, productVariantId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a product variant',
		description:
			'Retrieve one variant by its exact product and variant IDs, including values, SKU, pricing, inventory, physical dimensions, image association, and commerce attributes. Use fields to reduce the response. This does not modify stock or catalog data.',
		method: 'GET',
		path: '/products/{product_id}/variants/{id}',
		pathParameters: [productVariantProductId, productVariantId],
		query: jsonQuery(
			'Optional response projection using a comma-separated fields value.',
			'{"fields":"id,product_id,values,sku,price,promotional_price,stock,updated_at"}',
		),
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many product variants',
		description:
			'List variants belonging to one product, with ID cursor and creation/update date filters. Return All follows every API page; otherwise Limit caps output. Read these records before bulk replacement, partial updates, stock changes, or custom-field assignments.',
		method: 'GET',
		path: '/products/{product_id}/variants',
		pathParameters: [productVariantProductId],
		paginated: true,
		query: jsonQuery(
			'Optional variant filters: since_id, created_at_min, created_at_max, updated_at_min, updated_at_max, and fields. Dates use ISO 8601. The node manages page and per_page.',
			'{"since_id":100,"created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,product_id,values,sku,price,promotional_price,stock,stock_management,updated_at"}',
		),
	},
	{
		name: 'Replace All',
		value: 'replaceAll',
		action: 'Replace all variants of a product',
		description:
			'DESTRUCTIVE bulk synchronization of the entire variant collection. Submitted value combinations become the current and only variants: matching combinations are updated, new combinations are created, and every existing combination omitted from the body is deleted. Read all variants first, preserve every combination that must remain, and never use this operation for a partial update.',
		method: 'PUT',
		path: '/products/{product_id}/variants',
		pathParameters: [productVariantProductId],
		body: jsonBody(
			'Authoritative non-empty JSON array of every variant that must exist after the request. Each values combination must be unique and match the product attributes.',
			'[{"values":[{"pt":"M"}],"price":"79.90","stock_management":true,"stock":25,"sku":"CAM-M"},{"values":[{"pt":"G"}],"price":"84.90","stock_management":true,"stock":18,"sku":"CAM-G"}]',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a product variant',
		description:
			'Update one existing variant by product and variant IDs. This changes live price, promotion, inventory, SKU, dimensions, values, or image assignment. values must remain unique and align with the product attributes. The endpoint is subject to weighted rate limits; retry 429 responses with backoff rather than immediate repetition.',
		method: 'PUT',
		path: '/products/{product_id}/variants/{id}',
		pathParameters: [productVariantProductId, productVariantId],
		body: jsonBody(
			'Only writable variant fields that should change. For multi-location inventory use the location-aware inventory contract enabled for the store.',
			'{"price":"84.90","promotional_price":"74.90","stock_management":true,"stock":30,"sku":"CAM-M","image_id":112}',
		),
	},
	{
		name: 'Update Many',
		value: 'updateMany',
		action: 'Update many existing product variants',
		description:
			'Partially update multiple existing variants without adding or deleting variants. Every array item must include an existing variant ID belonging to the product, and resulting values combinations must remain unique. The endpoint returns the complete updated collection and uses a weighted token-bucket limit; split heavy payloads and back off on HTTP 429.',
		method: 'PATCH',
		path: '/products/{product_id}/variants',
		pathParameters: [productVariantProductId],
		body: jsonBody(
			'JSON array of partial variant objects. id is mandatory on every item; include only fields to change.',
			'[{"id":143,"price":"79.90"},{"id":144,"price":"84.90","stock_management":true,"stock":18}]',
		),
	},
	{
		name: 'Update Stock',
		value: 'updateStock',
		action: 'Update product variant stock',
		description:
			'Add, subtract, or replace stock for one variant or every variant of a product. action must be replace or variation. For variation, positive values add stock and negative values subtract it; subtraction below zero is silently clamped to zero. For replace, value may be a non-negative number, zero, or null for infinite stock. Omitting ID affects ALL variants, so include a trusted variant ID unless a store-wide product adjustment is intentional.',
		method: 'POST',
		path: '/products/{product_id}/variants/stock',
		pathParameters: [productVariantProductId],
		body: jsonBody(
			'Stock operation object. id is optional at API level but strongly recommended to scope the change to one variant.',
			'{"action":"variation","value":-2,"id":144}',
		),
	},
];

const metafieldId = pathParameter('id', 'Metafield ID', 'metafield', {
	placeholder: 'e.g. 11896',
	description:
		'Numeric metafield ID returned by Metafield > Create or Get Many. This is not the owner entity ID and cannot be derived from namespace or key.',
});

const metafieldOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a metafield',
		description:
			'Create an app namespaced key-value string on one Product, Product_Variant, Category, Page, Order, or Customer. namespace and key must start with a letter and then contain only letters, digits, or underscores. owner_id must identify an entity of owner_resource. For variant extra shipping days use namespace shipping_rules, key additional_days, owner_resource Product_Variant, and the variant ID.',
		method: 'POST',
		path: '/metafields',
		body: jsonBody(
			'Metafield definition and owner. owner_resource is case-sensitive and must be one of Product, Product_Variant, Category, Page, Order, or Customer; value is always a string.',
			'{"key":"additional_days","value":"5","namespace":"shipping_rules","description":"Extra preparation days","owner_id":2856879,"owner_resource":"Product_Variant"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a metafield',
		description:
			'Permanently delete one metafield by numeric ID. This is destructive and may remove application behavior or storefront metadata, including shipping rules. Retrieve the metafield first and verify its namespace, key, owner_resource, and owner_id before deletion.',
		method: 'DELETE',
		path: '/metafields/{id}',
		pathParameters: [metafieldId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a metafield',
		description:
			'Retrieve one metafield by exact numeric ID, including namespace, key, string value, description, owner type, owner ID, and timestamps. Use this to verify identity before update or delete. It does not modify the owner resource.',
		method: 'GET',
		path: '/metafields/{id}',
		pathParameters: [metafieldId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many metafields',
		description:
			'List metafields for one owner resource type. The path value is plural and lower-case, such as products, product_variants, categories, pages, orders, or customers; it differs from the singular case-sensitive owner_resource used in create bodies. Filter by owner_id, namespace, key, or dates. Return All follows every page and Limit caps output.',
		method: 'GET',
		path: '/metafields/{owner_resource}',
		pathParameters: [
			pathParameter('owner_resource', 'Owner Resource Path', 'metafield owner resource', {
				placeholder: 'e.g. product_variants',
				description:
					'Plural lower-case owner resource used in the URL: products, product_variants, categories, pages, orders, or customers. Do not use the create-body value Product_Variant here.',
			}),
		],
		paginated: true,
		query: jsonQuery(
			'Optional metafield filters: owner_id, namespace, key, created_at_min, created_at_max, updated_at_min, updated_at_max, and fields. Dates use ISO 8601. The node manages page and per_page.',
			'{"owner_id":2856879,"namespace":"shipping_rules","key":"additional_days","created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,namespace,key,value,description,owner_id,owner_resource,created_at,updated_at"}',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a metafield',
		description:
			'Update the string value and/or description of one existing metafield. The documented endpoint does not move ownership or rename namespace/key; create a new metafield if identity must change. Changing values such as shipping_rules/additional_days can affect checkout delivery estimates, so verify the owner before writing.',
		method: 'PUT',
		path: '/metafields/{id}',
		pathParameters: [metafieldId],
		body: jsonBody(
			'Only value and/or description for the existing metafield.',
			'{"value":"7","description":"Updated extra preparation days"}',
		),
	},
];

export const catalogResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Category',
		value: 'category',
		description:
			'Catalog categories and hierarchy. Create, read, update, list, and delete multilingual categories; manage parent relationships and visible/hidden storefront state with explicit inheritance rules.',
		operations: categoryOperations,
	},
	{
		name: 'Category Custom Field',
		value: 'categoryCustomField',
		description:
			'App-defined category metadata schemas and their values. Definitions use UUIDs; category owners use numeric IDs. Association writes and definition deletion change catalog metadata and must use IDs returned by read operations.',
		operations: customFieldOperations({
			resourceName: 'category custom field',
			ownerName: 'category',
			ownerPluralName: 'categories',
			definitionBasePath: '/categories/custom-fields',
			ownerBasePath: '/categories',
			ownerResourceValue: 'category',
			createExample:
				'{"name":"Material type","description":"Material used by products in this category","value_type":"text_list","read_only":false,"values":["Cotton","Linen"]}',
			associationExample: '[{"id":"e0a56bef-91d0-45f7-a70d-6b9264c85e8c","value":"Cotton"}]',
		}),
	},
	{
		name: 'Kit',
		value: 'kit',
		description:
			'Read-only product bundles managed in the store admin. A kit ID equals its product ID; responses include component products, required quantities, calculated kit stock, discount, media, categories, translations, and publication data.',
		operations: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a kit',
				description:
					'Retrieve one read-only kit by its exact ID, which is the same numeric ID as the corresponding product. The response includes component product IDs, quantities, positions, current component data, discount percentage, and calculated kit_stock. Kits cannot be created, updated, or deleted through this API; manage them in the store admin.',
				method: 'GET',
				path: '/kits/{id}',
				apiVersion: '2025-03',
				pathParameters: [
					pathParameter('id', 'Kit ID', 'kit', {
						placeholder: 'e.g. 123456789',
						description:
							'Numeric kit ID, equal to the kit product ID. Obtain it from trusted product/admin data; component product IDs are different and must not be used.',
					}),
				],
			},
		],
	},
	{
		name: 'Metafield',
		value: 'metafield',
		description:
			'App-scoped namespaced string metadata attached to products, variants, categories, pages, orders, or customers. Owner type, namespace, key, and owner ID define identity; values can drive application and shipping behavior.',
		operations: metafieldOperations,
	},
	{
		name: 'Product',
		value: 'product',
		description:
			'Core sellable catalog items. Manage multilingual content, publication, categories, variants, images, shipping, SEO, and bulk stock/price updates while preserving authoritative collection fields deliberately.',
		operations: productOperations,
	},
	{
		name: 'Product Custom Field',
		value: 'productCustomField',
		description:
			'App-defined product metadata schemas and per-product values. Definition UUIDs and numeric product IDs are distinct; association writes can replace or remove values and definition deletion is limited to fields owned by the connected app.',
		operations: customFieldOperations({
			resourceName: 'product custom field',
			ownerName: 'product',
			ownerPluralName: 'products',
			definitionBasePath: '/products/custom-fields',
			ownerBasePath: '/products',
			ownerResourceValue: 'product',
			createExample:
				'{"name":"Supplier","description":"Material supplier","value_type":"text_list","read_only":false,"values":["Acme","Umbrella"]}',
			associationExample: '[{"id":"57358282-92e5-47cc-8c6e-9f0a4e7bf05f","value":"Acme"}]',
		}),
	},
	{
		name: 'Product Image',
		value: 'productImage',
		description:
			'Images belonging to a product. Upload by public URL or Base64, list and retrieve image IDs, change ordering and alt text, and delete media while respecting size, format, count, and main-image effects.',
		operations: productImageOperations,
	},
	{
		name: 'Product Variant',
		value: 'productVariant',
		description:
			'Sellable product variations with attribute values, SKU, pricing, inventory, image, dimensions, barcode, cost, and demographic metadata. Includes single, partial bulk, destructive full replacement, and stock-specific writes.',
		operations: productVariantOperations,
	},
	{
		name: 'Product Variant Custom Field',
		value: 'productVariantCustomField',
		description:
			'App-defined variant metadata schemas and per-variant values, including fields merchants may expose as storefront filters. Definition UUIDs differ from numeric variant IDs; retrieve both before association or deletion.',
		operations: customFieldOperations({
			resourceName: 'product variant custom field',
			ownerName: 'product variant',
			ownerPluralName: 'product variants',
			definitionBasePath: '/products/variants/custom-fields',
			ownerBasePath: '/products/variants',
			ownerResourceValue: 'product_variant',
			createExample:
				'{"name":"Production status","description":"Current production status","value_type":"text_list","read_only":false,"values":["Started","In Production","Finished"]}',
			associationExample: '[{"id":"d6079ed1-6aaf-4392-8c10-32557e7f93f3","value":"In Production"}]',
		}),
	},
];
