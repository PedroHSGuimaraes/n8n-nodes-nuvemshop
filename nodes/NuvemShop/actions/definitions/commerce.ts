import type { NuvemShopResourceDefinition } from '../types';

import { jsonBody, jsonQuery, pathParameter, standardCrudOperations } from './common';

const checkoutId = pathParameter('checkoutId', 'Checkout ID', 'abandoned checkout', {
	placeholder: '411335234',
});
const cartId = pathParameter('cartId', 'Cart ID', 'cart', { placeholder: '397256730' });
const couponId = pathParameter('couponId', 'Coupon ID', 'coupon', {
	placeholder: '32967',
	loadOptionsMethod: 'getCoupons',
});
const customerId = pathParameter('customerId', 'Customer ID', 'customer', {
	placeholder: '101',
	loadOptionsMethod: 'getCustomers',
});
const orderId = pathParameter('orderId', 'Order ID', 'order', {
	placeholder: '871254203',
	loadOptionsMethod: 'getOrders',
});
const draftOrderId = pathParameter('draftOrderId', 'Draft Order ID', 'draft order', {
	placeholder: '39138263',
});
const transactionId = pathParameter('transactionId', 'Transaction ID', 'payment transaction', {
	placeholder: '21781944-a977-4b0d-93dc-908ddb87d778',
});
const disputeId = pathParameter('disputeId', 'Dispute ID', 'payment dispute', {
	placeholder: 'c66f4d5f-5ae2-4e35-9b4a-d63582d8df2c',
});

function customFieldResource(config: {
	name: string;
	value: string;
	basePath: string;
	ownerPath: string;
	ownerParameter: ReturnType<typeof pathParameter>;
}): NuvemShopResourceDefinition {
	const customFieldId = pathParameter(
		'customFieldId',
		'Custom Field ID',
		`${config.name} definition`,
		{
			placeholder: '9dda74d1-5dc9-43bd-90e2-4dce3b5f3835',
		},
	);

	return {
		name: config.name,
		value: config.value,
		description: `Define ${config.name.toLowerCase()} schemas and read or write their values on individual records`,
		operations: [
			{
				name: 'Create',
				value: 'create',
				action: `Create a ${config.name.toLowerCase()} definition`,
				description:
					'Create one custom-field definition. name, value_type, and values are required. value_type must be text_list, text, numeric, or date; values contains the allowed choices for text_list and must be an empty array for other types. The API returns per-value creation results, so inspect the response for duplicate or rejected choices.',
				method: 'POST',
				path: config.basePath,
				body: jsonBody(
					'Custom-field definition. values is mandatory even when it is an empty array.',
					'{"name":"Internal reference","description":"Reference used by the integration","value_type":"text","read_only":false,"values":[]}',
				),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: `Delete a ${config.name.toLowerCase()} definition`,
				description:
					'Permanently delete one custom-field definition and its associations. Retrieve the definition and its owners first, confirm the UUID, and require explicit approval because stored business metadata can be lost.',
				method: 'DELETE',
				path: `${config.basePath}/{customFieldId}`,
				pathParameters: [customFieldId],
			},
			{
				name: 'Get',
				value: 'get',
				action: `Get a ${config.name.toLowerCase()} definition`,
				description:
					'Retrieve one custom-field definition by UUID, including its name, description, type, read-only state, owner resource, and configured values. This operation does not return every owner association.',
				method: 'GET',
				path: `${config.basePath}/{customFieldId}`,
				pathParameters: [customFieldId],
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: `Get all ${config.name.toLowerCase()} definitions`,
				description:
					'The endpoint returns the complete non-paginated array of custom-field definitions for this owner resource. Use the returned UUIDs for owner lookup, definition updates, and association writes.',
				method: 'GET',
				path: config.basePath,
			},
			{
				name: 'Get Owners',
				value: 'getOwners',
				action: `Get owners of a ${config.name.toLowerCase()} definition`,
				description:
					'Retrieve records that currently own a value for the selected custom field definition. Use the returned record IDs instead of guessing which entities contain a value.',
				method: 'GET',
				path: `${config.basePath}/{customFieldId}/owners`,
				pathParameters: [customFieldId],
			},
			{
				name: 'Get Values',
				value: 'getValues',
				action: `Get ${config.name.toLowerCase()} values`,
				description:
					'Retrieve every custom-field value attached to one exact owner record. This is read-only and returns definition metadata with the stored values.',
				method: 'GET',
				path: `${config.ownerPath}/{${config.ownerParameter.name}}/custom-fields`,
				pathParameters: [config.ownerParameter],
			},
			{
				name: 'Set Values',
				value: 'setValues',
				action: `Set ${config.name.toLowerCase()} values`,
				description:
					'Create or replace custom-field values on one owner record. This changes business data; obtain definition IDs with Get Many definitions and preserve any values that must remain.',
				method: 'PUT',
				path: `${config.ownerPath}/{${config.ownerParameter.name}}/custom-fields/values`,
				pathParameters: [config.ownerParameter],
				body: jsonBody(
					'Bare JSON array of custom-field definition IDs and their values. This array replaces the owner associations, so include every value that must remain and do not wrap it in a values object.',
					'[{"id":"9dda74d1-5dc9-43bd-90e2-4dce3b5f3835","value":"ERP-1042"}]',
				),
			},
			{
				name: 'Update',
				value: 'update',
				action: `Add values to a ${config.name.toLowerCase()} definition`,
				description:
					'Add allowed values to one existing custom-field definition. The documented PUT accepts only the values array; it does not rename the field or change value_type, description, or read_only. Inspect the response because individual duplicate values can be rejected while others are created.',
				method: 'PUT',
				path: `${config.basePath}/{customFieldId}`,
				pathParameters: [customFieldId],
				body: jsonBody(
					'Values to add to the existing definition. Send the documented values envelope.',
					'{"values":["Wholesale","Retail"]}',
				),
			},
		],
	};
}

export const commerceResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Abandoned Checkout',
		value: 'abandonedCheckout',
		description: 'Read abandoned checkouts and apply a coupon to an existing checkout cart',
		operations: [
			{
				name: 'Apply Coupon',
				value: 'applyCoupon',
				action: 'Apply a coupon to an abandoned checkout',
				description:
					'Apply one existing coupon to the cart behind an abandoned checkout. This changes the checkout total. Retrieve and validate both checkout and coupon first; send the numeric coupon ID, not its code or name.',
				method: 'POST',
				path: '/checkouts/{cartId}/coupon',
				pathParameters: [cartId],
				body: jsonBody('Coupon assignment payload.', '{"coupon_id":32967}'),
				advancedBody: false,
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an abandoned checkout',
				description:
					'Retrieve one abandoned checkout by exact checkout ID, including cart, customer, products, totals, and recovery data available to the app',
				method: 'GET',
				path: '/checkouts/{checkoutId}',
				pathParameters: [checkoutId],
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many abandoned checkouts',
				description:
					'List abandoned checkouts. Use date filters for incremental synchronization. Return All follows pagination; Limit returns at most the requested number as separate n8n items.',
				method: 'GET',
				path: '/checkouts',
				paginated: true,
				query: jsonQuery(
					'Supported filters include since_id, created_at_max, updated_at_max, and fields.',
					'{"since_id":100,"created_at_max":"2026-07-10T23:59:59Z","updated_at_max":"2026-07-10T23:59:59Z","fields":"id,customer,products,total,created_at,updated_at"}',
				),
			},
		],
	},
	{
		name: 'Cart',
		value: 'cart',
		description: 'Read a cart and remove its line items or coupons',
		operations: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a cart',
				description:
					'Retrieve the current server state of a cart by exact ID. This read-only 2025-03 operation should precede destructive line-item or coupon removal.',
				method: 'GET',
				path: '/carts/{cartId}',
				pathParameters: [cartId],
				apiVersion: '2025-03',
			},
			{
				name: 'Remove Coupon',
				value: 'removeCoupon',
				action: 'Remove a coupon from a cart',
				description:
					'Permanently remove one applied coupon from a cart. This recalculates cart discounts and totals. Use Cart > Get to obtain exact cart and coupon IDs before calling it.',
				method: 'DELETE',
				path: '/carts/{cartId}/coupons/{couponId}',
				pathParameters: [cartId, couponId],
			},
			{
				name: 'Remove Line Item',
				value: 'removeLineItem',
				action: 'Remove a line item from a cart',
				description:
					'Permanently remove one exact line item from a cart. This changes quantities and totals and may invalidate discounts. Use the line-item ID returned by Cart > Get, not a product or variant ID.',
				method: 'DELETE',
				path: '/carts/{cartId}/line-items/{lineItemId}',
				pathParameters: [
					cartId,
					pathParameter('lineItemId', 'Line Item ID', 'cart line item', {
						placeholder: '717394929',
					}),
				],
			},
		],
	},
	{
		name: 'Coupon',
		value: 'coupon',
		description: 'Create and manage coupon codes, validity, limits, and discounts',
		operations: standardCrudOperations({
			resourceName: 'coupon',
			pluralName: 'coupons',
			basePath: '/coupons',
			idParameter: couponId,
			createExample:
				'{"code":"WELCOME10","type":"percentage","value":"10.00","valid":true,"start_date":"2026-07-10","end_date":"2026-08-10"}',
			listQueryDescription:
				'Supported filters include q, valid, status, limitation_type, term_type, discount_type, includes_shipping, min/max start and end dates, sort_by, created_at_*, updated_at_*, and fields.',
			listQueryExample:
				'{"q":"WELCOME","valid":true,"status":"activated","limitation_type":"quantity","term_type":"limited","discount_type":"percentage","includes_shipping":true,"min_start_date":"2026-01-01","min_end_date":"2026-01-01","max_start_date":"2026-12-31","max_end_date":"2026-12-31","sort_by":"created-at-descending","created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,code,type,value,valid,start_date,end_date,used,max_uses"}',
		}),
	},
	{
		name: 'Customer',
		value: 'customer',
		description: 'Create and manage store customers and their contact data',
		operations: standardCrudOperations({
			resourceName: 'customer',
			pluralName: 'customers',
			basePath: '/customers',
			idParameter: customerId,
			createExample:
				'{"name":"Maria Silva","email":"maria@example.com","phone":"+5511999999999","identification":"12345678909"}',
			listQueryDescription:
				'Supported filters include since_id, q, email, created_at_min, created_at_max, updated_at_min, updated_at_max, and fields.',
			listQueryExample:
				'{"since_id":100,"q":"Maria","email":"maria@example.com","created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,name,email,phone,identification,created_at,updated_at"}',
		}),
	},
	customFieldResource({
		name: 'Customer Custom Field',
		value: 'customerCustomField',
		basePath: '/customers/custom-fields',
		ownerPath: '/customers',
		ownerParameter: customerId,
	}),
	{
		name: 'Dispute',
		value: 'dispute',
		description: 'Create, inspect, and update payment disputes for a specific order transaction',
		operations: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a payment dispute',
				description:
					'Create a dispute under one payment transaction. Restricted to approved payment apps with write_payments scope. Monetary strings, evidence, reason, retained amounts, and timestamps must match the processor record.',
				method: 'POST',
				path: '/orders/{orderId}/transactions/{transactionId}/disputes',
				pathParameters: [orderId, transactionId],
				body: jsonBody(
					'Dispute creation payload. amount and retained_total are Money objects; retained_total is mandatory on every dispute create and update. reason_code must use a documented enum such as fraudulent_activity.',
					'{"reason_code":"fraudulent_activity","external_reason_code":"processor_fraud","amount":{"value":"100.00","currency":"BRL"},"retained_total":{"value":"100.00","currency":"BRL"},"initiated_at":"2026-07-10T12:00:00Z","evidence_url":"https://payments.example.com/disputes/123"}',
				),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a payment dispute',
				description:
					'Retrieve one dispute by exact order, transaction, and dispute IDs. Use its current state and evidence requirements before updating.',
				method: 'GET',
				path: '/orders/{orderId}/transactions/{transactionId}/disputes/{disputeId}',
				pathParameters: [orderId, transactionId, disputeId],
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a payment dispute',
				description:
					'Update the lifecycle state or evidence of one existing payment dispute. This financial action is restricted to approved payment apps and should require human review in AI workflows.',
				method: 'PUT',
				path: '/orders/{orderId}/transactions/{transactionId}/disputes/{disputeId}',
				pathParameters: [orderId, transactionId, disputeId],
				body: jsonBody(
					'Dispute update payload. Evidence fields are top-level, retained_total is always required, and closed_at is required when status is won or lost.',
					'{"status":"documentation_sent","evidence_url":"https://payments.example.com/disputes/123/evidence","evidence_sent_at":"2026-07-10T12:00:00Z","retained_total":{"value":"100.00","currency":"BRL"}}',
				),
			},
		],
	},
	{
		name: 'Draft Order',
		value: 'draftOrder',
		description: 'Create, retrieve, confirm, and delete draft orders',
		operations: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a draft order',
				description:
					'Create a draft order with the required customer contact, payment status, and products. payment_status must be unpaid, pending_confirmation, or paid. Optional delivery data belongs inside shipping as cost and shipping_address; do not send the response-only flattened shipping fields.',
				method: 'POST',
				path: '/draft_orders',
				body: jsonBody(
					'Draft-order creation payload. contact_name, contact_lastname, contact_email, payment_status, and products are required.',
					'{"contact_name":"Maria","contact_lastname":"Silva","contact_email":"buyer@example.com","contact_phone":"+5511999999999","payment_status":"unpaid","products":[{"variant_id":123456,"quantity":2}]}',
				),
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a draft order',
				description:
					'Permanently delete one draft order by numeric ID. Retrieve it first and confirm it has not already been confirmed or referenced by another workflow.',
				method: 'DELETE',
				path: '/draft_orders/{draftOrderId}',
				pathParameters: [draftOrderId],
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a draft order',
				description:
					'Retrieve one draft order by numeric ID, including contact data, products, shipping, totals, payment status, and confirmation state. Use this before confirm or delete.',
				method: 'GET',
				path: '/draft_orders/{draftOrderId}',
				pathParameters: [draftOrderId],
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get all draft orders',
				description:
					'Retrieve the complete draft-order collection returned by the documented non-paginated endpoint. The API does not document page, per_page, or filtering parameters for this operation.',
				method: 'GET',
				path: '/draft_orders',
			},
			{
				name: 'Confirm',
				value: 'confirm',
				action: 'Confirm a draft order',
				description:
					'Convert one draft order into a real order. This changes inventory and order state and may trigger notifications or downstream automations. Read and validate the draft before confirming it.',
				method: 'POST',
				path: '/draft_orders/{draftOrderId}/confirm',
				pathParameters: [draftOrderId],
			},
		],
	},
	{
		name: 'Order',
		value: 'order',
		description: 'Create, read, update, transition, and inspect store orders',
		operations: [
			...standardCrudOperations({
				resourceName: 'order',
				pluralName: 'orders',
				basePath: '/orders',
				idParameter: orderId,
				createExample:
					'{"gateway":"not-provided","payment_status":"pending","fulfillment":"unpacked","products":[{"variant_id":123456,"quantity":1}],"customer":{"name":"Maria Silva","email":"buyer@example.com"},"billing_address":{"first_name":"Maria","last_name":"Silva","address":"Praca da Se","number":"100","floor":"","locality":"Se","city":"Sao Paulo","province":"SP","zipcode":"01001-000","country":"BR"},"shipping_address":{"first_name":"Maria","last_name":"Silva","address":"Praca da Se","number":100,"floor":"","locality":"Se","city":"Sao Paulo","province":"SP","zipcode":"01001-000","country":"BR"},"shipping_pickup_type":"ship","shipping":"Standard delivery","shipping_option":"Standard delivery","shipping_cost_customer":0,"inventory_behaviour":"bypass"}',
				createDescription:
					'Create one order in the connected Nuvemshop account. This changes store data and returns the newly created record, including its server-generated ID. Validate required fields and monetary values before calling it. inventory_behaviour is bypass by default, which skips stock reservation. With claim the API reserves stock and validates the total quantity per variant, adding up every line of the order that contains it; if the total exceeds the available stock (or the stock of location_id, when sent) the request returns 422 with "Not enough stock for variant <id>" and no order is created.',
				updateExample: '{"owner_note":"Gift wrap this order","status":"closed"}',
				canDelete: false,
				listQueryDescription:
					'Supported filters include since_id, status, channels, payment_status, shipping_status, created_at_min, created_at_max, updated_at_min, updated_at_max, total_min, total_max, customer_ids, q, app_id, payment_methods, payment_provider, aggregates, and fields. The API limits a query to 10,000 results, so use date ranges for large stores.',
				listQueryExample:
					'{"since_id":100,"status":"any","channels":"store","payment_status":"paid","shipping_status":"any","created_at_min":"2026-07-01T00:00:00Z","created_at_max":"2026-07-31T23:59:59Z","updated_at_min":"2026-07-01T00:00:00Z","updated_at_max":"2026-07-31T23:59:59Z","total_min":10,"total_max":1000,"customer_ids":"101,102","q":"Maria","app_id":1234,"payment_methods":"credit_card","payment_provider":"provider-id","aggregates":"fulfillment_orders","fields":"id,number,total,payment_status,shipping_status,status,customer,products,updated_at"}',
				getQueryDescription:
					'Optional fields and aggregates, such as aggregates=fulfillment_orders.',
				getQueryExample:
					'{"aggregates":"fulfillment_orders","fields":"id,number,total,payment_status,shipping_status,status,customer,products,updated_at"}',
			}),
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel an order',
				description:
					'Cancel one order. This can restock products, send email, affect financial reconciliation, and trigger order/cancelled webhooks. Require human review in AI workflows and verify the current order state first.',
				method: 'POST',
				path: '/orders/{orderId}/cancel',
				pathParameters: [orderId],
				body: jsonBody(
					'Cancellation options. reason must be customer, inventory, fraud, or other; choose whether to email the customer and restock inventory.',
					'{"reason":"customer","email":true,"restock":true}',
				),
			},
			{
				name: 'Close',
				value: 'close',
				action: 'Close an order',
				description:
					'Mark one order as closed after business processing is complete. This changes order state and can trigger integrations; retrieve the order first and do not close a cancelled or incomplete order blindly.',
				method: 'POST',
				path: '/orders/{orderId}/close',
				pathParameters: [orderId],
			},
			{
				name: 'Edit (Unstable)',
				value: 'editUnstable',
				action: 'Edit order products and discounts using the unstable API',
				description:
					'Edit line items, quantities, stock behavior, fulfillment assignment, and discounts on an existing order through the explicitly unstable endpoint. This can change inventory, fulfillment orders, the amount owed, and downstream accounting. Read the order and its fulfillment data first, use exact product, variant, line-item, and fulfillment-order IDs, require human approval, and reconcile the resulting order total. The unstable contract may change without backward compatibility.',
				method: 'POST',
				path: '/orders/{orderId}/edit',
				apiVersion: 'unstable',
				pathParameters: [orderId],
				body: jsonBody(
					'Order edition payload. products may add a product/variant or change an existing line_item_id; modify_stock controls inventory adjustment and fulfillment_order_id selects the exact fulfillment. discounts contains documented type, action, and value entries. Include a clear reason and choose whether to notify the customer.',
					'{"products":[{"product_id":17310719,"variant_id":33739100,"quantity":2,"modify_stock":true,"fulfillment_order_id":"01JRK598Q8C83X2QHCRXK0J7BJ"},{"line_item_id":32720436,"quantity":1,"modify_stock":true,"fulfillment_order_id":"01JRK598Q8C83X2QHCRXK0J7BJ"}],"discounts":[{"type":"coupon_discount","action":"replace","value":1000}],"notify_customer":false,"reason":"Customer requested a different product"}',
				),
			},
			{
				name: 'Fulfill (Legacy V1)',
				value: 'fulfillLegacy',
				action: 'Fulfill an order using the legacy API',
				description:
					'Legacy v1 operation that marks an order as fulfilled and optionally records tracking details and notifies the customer. The node automatically calls API v1. Prefer Fulfillment Order operations for new multi-inventory integrations.',
				method: 'POST',
				path: '/orders/{orderId}/fulfill',
				pathParameters: [orderId],
				apiVersion: 'v1',
				body: jsonBody(
					'Legacy fulfillment payload.',
					'{"shipping_tracking_number":"BR123456789","shipping_tracking_url":"https://carrier.example/BR123456789","notify_customer":true}',
				),
			},
			{
				name: 'Get Edit History',
				value: 'getEditions',
				action: 'Get order edit history',
				description:
					'Retrieve edition records for one order. Available in API 2025-03 and useful for audit trails and reconciling changes made after creation.',
				method: 'GET',
				path: '/orders/{orderId}/history/editions',
				pathParameters: [orderId],
				apiVersion: '2025-03',
			},
			{
				name: 'Get History Values',
				value: 'getHistoryValues',
				action: 'Get order history values',
				description:
					'Retrieve historical field values for one order. Available in API 2025-03; use with edit history to understand exactly what changed.',
				method: 'GET',
				path: '/orders/{orderId}/history/values',
				pathParameters: [orderId],
				apiVersion: '2025-03',
			},
			{
				name: 'Get Subscriptions',
				value: 'getSubscriptions',
				action: 'Get order subscriptions',
				description:
					'Retrieve subscription information linked to one order. Available in API 2025-03 and read-only.',
				method: 'GET',
				path: '/orders/{orderId}/subscriptions',
				pathParameters: [orderId],
				apiVersion: '2025-03',
			},
			{
				name: 'Pack (Legacy V1)',
				value: 'packLegacy',
				action: 'Pack an order using the legacy API',
				description:
					'Legacy v1 operation that marks one order as packed. The node automatically calls API v1. Prefer Fulfillment Order status updates for new multi-inventory integrations.',
				method: 'POST',
				path: '/orders/{orderId}/pack',
				pathParameters: [orderId],
				apiVersion: 'v1',
			},
			{
				name: 'Reopen',
				value: 'reopen',
				action: 'Reopen a closed order',
				description:
					'Reopen one previously closed order so processing can continue. This changes state and may trigger downstream automations; verify the order is closed before calling it.',
				method: 'POST',
				path: '/orders/{orderId}/open',
				pathParameters: [orderId],
			},
		],
	},
	customFieldResource({
		name: 'Order Custom Field',
		value: 'orderCustomField',
		basePath: '/orders/custom-fields',
		ownerPath: '/orders',
		ownerParameter: orderId,
	}),
	{
		name: 'Transaction',
		value: 'transaction',
		description: 'Create and read payment transactions and append transaction events',
		operations: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a payment transaction',
				description:
					'Create a transaction under one order. Restricted to approved payment apps with write_payments scope. Amounts, currency, provider IDs, and callback URLs must match the actual payment attempt.',
				method: 'POST',
				path: '/orders/{orderId}/transactions',
				pathParameters: [orderId],
				body: jsonBody(
					'Transaction creation payload. payment_method, first_event, and info are required; Brazilian providers must also send payment_provider_tax_id. The first event amount is a Money object and is mandatory for authorization and sale events.',
					'{"payment_provider_id":"eeac118e-5534-40ba-b539-443449bc67a3","payment_provider_tax_id":"12.345.678/0001-99","payment_method":{"type":"pix","id":"pix"},"info":{"external_id":"payment-123","external_url":"https://payments.example.com/transactions/payment-123","refund_url":"https://payments.example.com/transactions/payment-123/refund","supports_partial_refund":true},"first_event":{"type":"sale","status":"success","happened_at":"2026-07-10T12:00:00Z","authorization_code":"AUTH123","amount":{"value":"129.90","currency":"BRL"}}}',
				),
			},
			{
				name: 'Create Event',
				value: 'createEvent',
				action: 'Create a payment transaction event',
				description:
					'Append an immutable lifecycle event to one payment transaction. Event type can include authorization, capture, refund, sale, void, expiration, or fraud analysis; status is error, failure, pending, or success.',
				method: 'POST',
				path: '/orders/{orderId}/transactions/{transactionId}/events',
				pathParameters: [orderId, transactionId],
				body: jsonBody(
					'Transaction event payload with type, status, happened_at, and processor details. amount, when sent, must be a Money object; authorization_code is conditionally required for successful sale or capture events.',
					'{"type":"capture","status":"success","happened_at":"2026-07-10T12:00:00Z","authorization_code":"AUTH123","nsu":"123456789","amount":{"value":"129.90","currency":"BRL"}}',
				),
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a payment transaction',
				description:
					'Retrieve one transaction by exact order and transaction IDs. Use this before adding an event, dispute, refund, or reconciliation record.',
				method: 'GET',
				path: '/orders/{orderId}/transactions/{transactionId}',
				pathParameters: [orderId, transactionId],
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many payment transactions',
				description:
					'List every payment transaction attached to one order. This endpoint is read-only and normally returns the complete order transaction history without global pagination.',
				method: 'GET',
				path: '/orders/{orderId}/transactions',
				pathParameters: [orderId],
			},
		],
	},
];
