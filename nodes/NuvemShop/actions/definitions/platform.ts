import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from '../types';

import { jsonBody, jsonQuery, pathParameter } from './common';

const planId = pathParameter('planId', 'Plan ID or External Reference', 'billing plan', {
	placeholder: 'e.g. 6dbbcbe4-7e30-4d1c-b8ab-8f57f8f04e4e',
	description:
		'Exact Nuvemshop plan UUID or the external_reference assigned by this app when it created the plan. Obtain it from the Create Plan response or trusted billing records. Never infer it from a description or currency code.',
});

const conceptCode = pathParameter('conceptCode', 'Concept Code', 'billing concept', {
	placeholder: 'e.g. subscription',
	description:
		'Billing concept code configured for this service. This is a stable business identifier, not a plan ID, store ID, or display name. Obtain it from the app billing configuration or a subscription/charge response.',
});

const serviceId = pathParameter('serviceId', 'Service ID', 'billing service', {
	placeholder: 'e.g. 1234',
	description:
		'ID of the billing service. For an application service this is normally the app ID from the Partner Portal. Do not use the merchant store ID or a plan ID.',
});

const promotionId = pathParameter('promotionId', 'Promotion ID', 'promotion', {
	placeholder: 'e.g. e855b201-be35-496c-8aed-28c6f1de840d',
	description:
		'UUID returned by Promotion > Create or Get Many for a promotion owned by the connected app in this store. Promotions belonging to another app cannot be changed or deleted.',
});

const paymentProviderId = pathParameter(
	'paymentProviderId',
	'Payment Provider ID',
	'payment provider',
	{
		placeholder: 'e.g. 6e760b6e-e4f3-42ba-8a2d-afddf44e6cf1',
		description:
			'UUID returned by Payment Provider > Create or Get Many for this store. This is not a checkout payment-option ID or transaction ID. Payment-provider operations require an app approved for the Payments API.',
	},
);

const webhookId = pathParameter('webhookId', 'Webhook ID', 'webhook registration', {
	placeholder: 'e.g. 8901',
	description:
		'Numeric registration ID returned by Webhook > Create or Get Many. It identifies one event-and-URL subscription for this app and store; it is not an event resource ID.',
});

const cartId = pathParameter('cartId', 'Cart ID', 'cart', {
	placeholder: 'e.g. 397256730',
	description:
		'Numeric ID of the current cart whose app-applied discounts should be inspected. Use the cart_id received in a Discount callback or a trusted Cart response; do not substitute an order or checkout ID.',
});

const billingOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create Charge',
		value: 'createCharge',
		action: 'Create an additional app charge',
		description:
			'Create a non-recurring or variable charge for the connected merchant and service in API 2025-03. Use this for usage or expenses outside the fixed subscription fee. The date range must describe the billed period, amount_currency must be valid for the store, and duplicate external references should be avoided. This creates a financial obligation and should require explicit confirmation in AI workflows.',
		method: 'POST',
		path: '/services/{serviceId}/charges',
		pathParameters: [serviceId],
		apiVersion: '2025-03',
		body: jsonBody(
			'Additional charge fields. description, from_date, to_date, amount_value, amount_currency, and concept_code are required; external_reference is optional but recommended for idempotent reconciliation. Dates use YYYY-MM-DD and the amount is a JSON number in the API billing unit.',
			'{"description":"Orders processed in July 2026","external_reference":"usage-2026-07","from_date":"2026-07-01","to_date":"2026-07-31","amount_value":199.9,"amount_currency":"BRL","concept_code":"extra_usage"}',
		),
	},
	{
		name: 'Create Plan',
		value: 'createPlan',
		action: 'Create an app billing plan',
		description:
			'Create one plan for this application through the 2025-03 Partner Action API. This request is app-scoped rather than store-scoped and authenticates with the client secret from the credential. code identifies the plan currency/code expected by the billing configuration. external_reference should be a stable ID from the partner system and must be unique for this service.',
		method: 'POST',
		path: '/plans',
		scope: 'partner',
		apiVersion: '2025-03',
		body: jsonBody(
			'New plan fields. code is required; external_reference and description are optional. The app ID and client secret come from the credential and must not be sent in this payload.',
			'{"code":"BRL","external_reference":"pro-monthly-brl","description":"Pro monthly subscription"}',
		),
	},
	{
		name: 'Delete Plan',
		value: 'deletePlan',
		action: 'Delete an app billing plan',
		description:
			'Delete one app plan through the 2025-03 Partner Action API. This is highly destructive: Nuvemshop also deletes subscriptions using the plan and charges that have not already been paid or entered payment processing. A default plan cannot be deleted. Retrieve and confirm the exact UUID or external reference and require human approval before execution.',
		method: 'DELETE',
		path: '/plans/{planId}',
		scope: 'partner',
		apiVersion: '2025-03',
		pathParameters: [planId],
	},
	{
		name: 'Get Subscription',
		value: 'getSubscription',
		action: 'Get the merchant app subscription',
		description:
			'Retrieve the subscription for the connected store, billing concept, and service in API 2025-03. The response includes amount, currency, recurrence, next and last execution dates, and linked plan. Use this read operation before changing price or plan and before creating variable charges for the same billing period.',
		method: 'GET',
		path: '/concepts/{conceptCode}/services/{serviceId}/subscriptions',
		pathParameters: [conceptCode, serviceId],
		apiVersion: '2025-03',
	},
	{
		name: 'Update Plan',
		value: 'updatePlan',
		action: 'Update an app billing plan',
		description:
			'Update a plan through the 2025-03 Partner Action API using its UUID or external reference. Changes propagate to every subscription on the plan and to charges that are not paid or awaiting payment, so this operation has broad financial impact. Read affected billing data and require explicit human approval before changing code, reference, or description.',
		method: 'PATCH',
		path: '/plans/{planId}',
		scope: 'partner',
		apiVersion: '2025-03',
		pathParameters: [planId],
		body: jsonBody(
			'Complete set of documented writable plan fields: code, external_reference, and description.',
			'{"code":"BRL","external_reference":"pro-monthly-brl","description":"Updated Pro monthly subscription"}',
		),
	},
	{
		name: 'Update Subscription',
		value: 'updateSubscription',
		action: 'Update the merchant app subscription',
		description:
			'Change the price or plan associated with the connected merchant subscription in API 2025-03. Updating a subscription also changes charges already created but not paid or waiting for payment. Supply either authoritative plan identifiers or the intended amount and currency, never values inferred from display text, and require confirmation in AI workflows.',
		method: 'PATCH',
		path: '/concepts/{conceptCode}/services/{serviceId}/subscriptions',
		pathParameters: [conceptCode, serviceId],
		apiVersion: '2025-03',
		body: jsonBody(
			'Subscription fields accepted by the API: amount_currency, amount_value, plan_id, and plan_external_id. Use the plan UUID and external reference returned by trusted billing data.',
			'{"amount_currency":"BRL","amount_value":99.9,"plan_id":"6dbbcbe4-7e30-4d1c-b8ab-8f57f8f04e4e","plan_external_id":"pro-monthly-brl"}',
		),
	},
];

const businessRuleOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Get Payment Options',
		value: 'getPaymentOptions',
		action: 'Get payment options for business rules',
		description:
			'Retrieve payment providers and their checkout options for the connected store. A payment business-rule callback uses these exact provider and option IDs when returning filter_payments_options; never filter by a translated display name. Requires the read_payments scope and a Business Rules app enabled by Nuvemshop.',
		method: 'GET',
		path: '/payment_providers/options',
	},
	{
		name: 'Get Shipping Options',
		value: 'getShippingOptions',
		action: 'Get shipping options for business rules',
		description:
			'Retrieve enabled carriers and shipping options for the connected store. A shipping business-rule callback uses the returned carrier, option, and code identifiers when returning filter_shipping_options. Requires read_shipping and a Business Rules app enabled by Nuvemshop.',
		method: 'GET',
		path: '/shipping_carriers/options',
	},
	{
		name: 'Set Integration Callback',
		value: 'setIntegrationCallback',
		action: 'Create or replace a business-rule callback',
		description:
			'Register the HTTPS endpoint Nuvemshop calls before filtering payment or shipping options, prioritizing locations, or finishing a cart. The domain and event must match exactly. This PUT replaces the callback configuration for that store and domain. The partner endpoint must validate requests and answer its documented command within roughly one second or Nuvemshop treats the evaluation as failed.',
		method: 'PUT',
		path: '/business_rules/integrations/{domain}',
		pathParameters: [
			pathParameter('domain', 'Domain', 'business-rule domain', {
				placeholder: 'e.g. payments',
				description:
					'Exact supported domain: payments, shipping, location, or cart. Use payments with payments/before-filter, shipping with shipping/before-filter, location with location/prioritization, and cart with cart/before-finish.',
			}),
		],
		body: jsonBody(
			'Callback configuration. url must be a public HTTPS endpoint. event must be exactly payments/before-filter, shipping/before-filter, location/prioritization, or cart/before-finish and must correspond to the domain in the path.',
			'{"url":"https://integration.example.com/nuvemshop/business-rules","event":"payments/before-filter"}',
		),
	},
];

const discountOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create Promotion',
		value: 'createPromotion',
		action: 'Create an app promotion',
		description:
			'Create a promotion definition owned by this app for the connected store. name and allocation_type are required; allocation_type must be line_item or cross_items. This definition does not calculate a discount by itself: Nuvemshop sends carts to the registered callback, which returns create, update, or remove commands. Multicurrency is not supported by this API, so verify store currency before activation.',
		method: 'POST',
		path: '/promotions',
		scope: 'unversionedStore',
		body: jsonBody(
			'Promotion definition. Prefer the granular combines_with_quantity_discounts, combines_with_free_shipping, combines_with_cart_amount_discounts, combines_with_app_discounts, and combines_with_price_discounts flags. combines_with_other_discounts is deprecated and must never be sent together with granular flags.',
			'{"name":"Second item 50% off","description":"Buy two eligible items and receive 50% off the second","disclaimer":"Valid while stocks last","allocation_type":"line_item","active":true,"combines_with_quantity_discounts":false,"combines_with_free_shipping":true,"combines_with_cart_amount_discounts":false,"combines_with_app_discounts":false,"combines_with_price_discounts":false,"translations":[{"lang":"pt-br","name":"Segunda unidade com 50%","description":"Compre duas unidades elegiveis"}]}',
		),
	},
	{
		name: 'Delete Promotion',
		value: 'deletePromotion',
		action: 'Delete an app promotion',
		description:
			'Delete one promotion created by this app for the connected store. This is destructive and can remove the rule from future cart evaluations; active carts may be recalculated without it. Retrieve the app promotion list, confirm its UUID and business owner, then require explicit approval before deletion.',
		method: 'DELETE',
		path: '/promotions/{promotionId}',
		scope: 'unversionedStore',
		pathParameters: [promotionId],
	},
	{
		name: 'Get Cart Discounts',
		value: 'getCartDiscounts',
		action: 'Get app discounts applied to a cart',
		description:
			'Retrieve promotions from the connected app currently applied to one cart and the affected line-item IDs. The response is app-scoped and read-only. Use the cart ID received from the discount callback; an order ID or checkout token is not interchangeable.',
		method: 'GET',
		path: '/carts/{cartId}/discounts',
		scope: 'unversionedStore',
		pathParameters: [cartId],
		responseProperty: 'data',
	},
	{
		name: 'Get Many Promotions',
		value: 'getManyPromotions',
		action: 'Get many app promotions',
		description:
			'List every non-deleted promotion created by the connected app for this store, including UUID, name, allocation type, active state, and combination flags. The official Discount OpenAPI does not define page or per_page, so this operation makes one request instead of inventing pagination parameters.',
		method: 'GET',
		path: '/promotions',
		scope: 'unversionedStore',
		responseProperty: 'data',
	},
	{
		name: 'Set Callback',
		value: 'setCallback',
		action: 'Create or replace the discount callback',
		description:
			'Register the public HTTPS endpoint that evaluates carts for this app. Nuvemshop calls it after cart changes when app promotions exist. PUT creates or replaces the current callback; the API does not provide a delete operation. The endpoint must validate the signed request and respond with valid discount commands within about 800 milliseconds.',
		method: 'PUT',
		path: '/discounts/callbacks',
		scope: 'unversionedStore',
		body: jsonBody(
			'Discount callback registration. url is required and must include a valid HTTPS scheme.',
			'{"url":"https://integration.example.com/nuvemshop/discounts"}',
		),
	},
	{
		name: 'Update Promotion',
		value: 'updatePromotion',
		action: 'Update an app promotion',
		description:
			'Change active state or discount-combination rules for one promotion owned by this app. This immediately changes future cart evaluations. The API does not document changing name or allocation_type here. Prefer granular combines_with_* flags; the deprecated combines_with_other_discounts field must be used alone, never alongside granular flags.',
		method: 'PATCH',
		path: '/promotions/{promotionId}',
		scope: 'unversionedStore',
		pathParameters: [promotionId],
		body: jsonBody(
			'Only documented mutable promotion fields: active and either granular combines_with_* flags or the deprecated combines_with_other_discounts flag by itself.',
			'{"active":false,"combines_with_quantity_discounts":false,"combines_with_free_shipping":true,"combines_with_cart_amount_discounts":false,"combines_with_app_discounts":false,"combines_with_price_discounts":false}',
		),
	},
];

const paymentProviderOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a payment provider',
		description:
			'Create a Payments API provider for the connected store. This operation is exclusively for approved payment apps. Every URL must use HTTPS; option IDs must be unique for providers of this app; currency, payment-method, installment, rate, authentication, and checkout configuration must match the real processor capability. Do not send read-only ID, store_id, or app_id fields.',
		method: 'POST',
		path: '/payment_providers',
		body: jsonBody(
			'Payment Provider object. Include merchant-facing identity, required logo sizes, supported ISO 4217 currencies and payment methods, checkout_js_url, checkout payment options, and any optional rates, features, configuration URLs, or authentication settings actually supported by the provider.',
			'{"name":"Acme Payments","public_name":"Pay with Acme","description":"Card and Pix payments","logo_urls":{"400x120":"https://cdn.example.com/acme-400x120.png","160x100":"https://cdn.example.com/acme-160x100.png"},"supported_currencies":["BRL"],"supported_payment_methods":[{"payment_method_type":"pix","payment_methods":["pix"]},{"payment_method_type":"credit_card","payment_methods":["visa","mastercard"],"installments":{"specification":[{"installments":1,"interest_rate":"0.00"}]}}],"checkout_js_url":"https://cdn.example.com/nuvemshop-checkout.js","checkout_payment_options":[{"id":"acme_transparent_pix","name":"Pix","supported_billing_countries":["BR"],"supported_payment_method_types":["pix"],"integration_type":"transparent"}],"features":["transparent_checkout"],"enabled":true,"authentication":null}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a payment provider',
		description:
			'Delete one payment-provider registration from the connected store. This disables its configured checkout options and can interrupt payment acceptance. The operation is restricted to approved payment apps. Retrieve and verify the exact provider UUID and require human approval before deletion.',
		method: 'DELETE',
		path: '/payment_providers/{paymentProviderId}',
		pathParameters: [paymentProviderId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a payment provider',
		description:
			'Retrieve one provider registration by UUID, including checkout options, supported methods and currencies, rates, features, enabled state, and authentication metadata visible to the app. Use this before update or delete; provider IDs and checkout option IDs are different identifiers.',
		method: 'GET',
		path: '/payment_providers/{paymentProviderId}',
		pathParameters: [paymentProviderId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many payment providers',
		description:
			'List payment providers registered for the connected store and visible to this payment app. The documented endpoint returns one array and does not publish page or per_page parameters, so the node makes a single request. Use returned provider UUIDs for subsequent reads and writes.',
		method: 'GET',
		path: '/payment_providers',
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a payment provider',
		description:
			'Replace or update the writable configuration of one payment provider, commonly installment rules, payment options, rates, URLs, authentication, or enabled state. This can immediately change checkout behavior. Retrieve the full current provider first and preserve required arrays and objects intentionally; do not send read-only response fields.',
		method: 'PUT',
		path: '/payment_providers/{paymentProviderId}',
		pathParameters: [paymentProviderId],
		body: jsonBody(
			'Complete writable Payment Provider object that should become authoritative. PUT is documented with a full Payment Provider object, so preserve required identity, URLs, logos, currencies, supported methods, checkout options, and nested arrays unless intentionally replacing them.',
			'{"name":"Acme Payments","public_name":"Pay with Acme","description":"Card and Pix payments","logo_urls":{"400x120":"https://cdn.example.com/acme-400x120.png","160x100":"https://cdn.example.com/acme-160x100.png"},"supported_currencies":["BRL"],"supported_payment_methods":[{"payment_method_type":"pix","payment_methods":["pix"]},{"payment_method_type":"credit_card","payment_methods":["visa","mastercard"],"installments":{"specification":[{"installments":1,"interest_rate":"0.00"},{"installments":3,"interest_rate":"0.00"}]}}],"checkout_js_url":"https://cdn.example.com/nuvemshop-checkout.js","checkout_payment_options":[{"id":"acme_transparent_pix","name":"Pix","supported_billing_countries":["BR"],"supported_payment_method_types":["pix"],"integration_type":"transparent"}],"features":["transparent_checkout"],"enabled":true}',
		),
	},
];

const webhookOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a webhook registration',
		description:
			'Register one event and HTTPS destination for this app and store. The URL cannot use localhost or a Nuvemshop/Tiendanube domain. Registration does not create an n8n receiver by itself; use the dedicated Nuvem Shop Trigger URL. Choose the narrowest event needed to avoid excess traffic, and ensure the app has the related resource scope.',
		method: 'POST',
		path: '/webhooks',
		body: jsonBody(
			'Webhook registration with event and public HTTPS url. Supported families include app, category, customer, order, product, product_variant, domain, order_custom_field, product_variant_custom_field, subscription, fulfillment, fulfillment_order, and location. Examples include order/paid, product/updated, fulfillment_order/status_updated, and location/deleted.',
			'{"event":"order/paid","url":"https://automation.example.com/webhook/nuvemshop-order-paid"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a webhook registration',
		description:
			'Permanently remove one event subscription by numeric webhook ID. Nuvemshop stops delivering future notifications for this registration, which can break synchronization. Retrieve the registration first and require confirmation when no equivalent listener remains.',
		method: 'DELETE',
		path: '/webhooks/{webhookId}',
		pathParameters: [webhookId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a webhook registration',
		description:
			'Retrieve one webhook registration by numeric ID, including event, destination URL, and timestamps. Use fields to project a smaller response. This returns registration metadata, not a webhook event payload or delivery history.',
		method: 'GET',
		path: '/webhooks/{webhookId}',
		pathParameters: [webhookId],
		query: jsonQuery(
			'Optional response projection. fields is a comma-separated list such as id,event,url,updated_at.',
			'{"fields":"id,event,url,updated_at"}',
		),
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many webhook registrations',
		description:
			'List webhook registrations owned by this app in the connected store. Filter by event or URL to detect duplicates before creating another registration. Return All follows every API page at a controlled rate; otherwise Limit caps records returned as separate n8n items.',
		method: 'GET',
		path: '/webhooks',
		paginated: true,
		query: jsonQuery(
			'Optional filters: since_id, url, event, created_at_min, created_at_max, updated_at_min, updated_at_max, and fields. Dates use ISO 8601. The node manages page and per_page.',
			'{"since_id":100,"url":"https://automation.example.com/webhook","event":"order/paid","created_at_min":"2026-01-01T00:00:00Z","created_at_max":"2026-12-31T23:59:59Z","updated_at_min":"2026-01-01T00:00:00Z","updated_at_max":"2026-12-31T23:59:59Z","fields":"id,event,url,created_at,updated_at"}',
		),
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a webhook registration',
		description:
			'Change the event, destination URL, or both for one existing registration. This redirects future notifications and can silently stop an old consumer, so retrieve the current registration and verify the destination before writing. Send only writable event and URL fields, never ID or timestamps.',
		method: 'PUT',
		path: '/webhooks/{webhookId}',
		pathParameters: [webhookId],
		body: jsonBody(
			'Writable webhook fields. event must be an event allowed for the app scopes and url must be public HTTPS.',
			'{"event":"order/paid","url":"https://automation.example.com/webhook/nuvemshop-order-paid-v2"}',
		),
	},
];

export const platformResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Authorization',
		value: 'authorization',
		description:
			'Complete the Nuvemshop OAuth installation flow by exchanging a short-lived authorization code for the store access token and store ID',
		operations: [
			{
				name: 'Exchange Authorization Code',
				value: 'exchangeAuthorizationCode',
				action: 'Exchange an OAuth authorization code',
				description:
					'Exchange the code returned to the app redirect URL for an access_token and user_id, where user_id is the merchant store ID. The code expires in five minutes and should be exchanged once. Nuvemshop access tokens do not expire, but a newer token or app uninstall invalidates the old token. App ID and Client Secret must be sourced from the protected credential, never from untrusted workflow input.',
				method: 'POST',
				path: '/apps/authorize/token',
				scope: 'authorization',
				body: jsonBody(
					'OAuth exchange payload. code is the exact value received at the configured redirect URL and grant_type must remain authorization_code. The execution layer adds client_id and client_secret from the credential.',
					'{"grant_type":"authorization_code","code":"authorization-code-from-redirect"}',
				),
			},
		],
	},
	{
		name: 'Billing',
		value: 'billing',
		description:
			'Manage app billing plans, inspect or change a merchant subscription, and create additional usage charges through API 2025-03',
		operations: billingOperations,
	},
	{
		name: 'Business Rule',
		value: 'businessRule',
		description:
			'Configure store callbacks that filter payment or shipping options, prioritize locations, or block checkout, and retrieve valid option identifiers',
		operations: businessRuleOperations,
	},
	{
		name: 'Discount',
		value: 'discount',
		description:
			'Register the app cart-evaluation callback and manage promotion definitions and discounts applied by this app',
		operations: discountOperations,
	},
	{
		name: 'Payment Option',
		value: 'paymentOption',
		description:
			'Read payment providers and checkout options currently available to consumers in the connected store',
		operations: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many checkout payment options',
				description:
					'Retrieve payment providers activated by the merchant and each checkout_payment_options entry, including exact option ID, display name, supported payment-method types, integration type, and logo. This endpoint is read-only and returns one array without documented pagination. Use IDs from this response instead of guessing from provider names.',
				method: 'GET',
				path: '/payment-options',
			},
		],
	},
	{
		name: 'Payment Provider',
		value: 'paymentProvider',
		description:
			'Create and manage store-specific payment processor registrations; restricted to applications approved for the Nuvemshop Payments API',
		operations: paymentProviderOperations,
	},
	{
		name: 'Store',
		value: 'store',
		description:
			'Read identity, locale, currency, domains, plan, enabled languages, business settings, and feature flags of the connected store',
		operations: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the connected store',
				description:
					'Retrieve general settings and identity for the store in the credential, including name, contact details, country, currency, main language, domains, plan, timestamps, and feature flags. Check features before using gated APIs such as fulfillment-order labels. This operation is read-only and addresses the connected store directly, so no store ID path parameter is needed.',
				method: 'GET',
				path: '/store',
				query: jsonQuery(
					'Optional response projection. fields is a comma-separated list of Store properties.',
					'{"fields":"id,name,country,currency,main_language,domains,plan_name,features"}',
				),
			},
		],
	},
	{
		name: 'Webhook',
		value: 'webhook',
		description:
			'Create and manage HTTPS event registrations for this app and store; event reception belongs to the dedicated Nuvem Shop Trigger node',
		operations: webhookOperations,
	},
];
