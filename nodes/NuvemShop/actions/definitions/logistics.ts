import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from '../types';

import { jsonBody, jsonQuery, pathParameter } from './common';

const locationId = pathParameter('id', 'Location ID', 'location', {
	placeholder: 'e.g. 01HTMFDH09VC6E2Q8KGTGP44D3',
	description:
		'Location ULID returned by Location > Create, Get, or Get Many. Never substitute a numeric inventory-level ID, product variant ID, name, or address.',
});

const locationOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a location',
		description:
			'Create one physical inventory location. name is a locale map; address requires zipcode, street, city, province, region, and country. tags controls sales-channel availability and accepts online and/or offline; omitting it uses the platform default. Creation changes where stock can reside and requires write_locations scope.',
		method: 'POST',
		path: '/locations',
		body: jsonBody(
			'Location name, full address, and optional channel tags. Province, region, and country are objects with code and name. Do not send read-only id, store_id, priority, is_default, or timestamps.',
			'{"name":{"pt_BR":"Centro de Distribuicao SP","es_AR":"Centro de Distribucion SP","en_US":"Sao Paulo Distribution Center"},"address":{"zipcode":"01001-000","street":"Praca da Se","number":"100","floor":"2","locality":"Se","city":"Sao Paulo","reference":"Proximo ao metro","between_streets":"Rua Direita e Rua XV de Novembro","province":{"code":"SP","name":"Sao Paulo"},"region":{"code":"SE","name":"Sudeste"},"country":{"code":"BR","name":"Brazil"}},"tags":["online","offline"]}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a location',
		description:
			'Permanently delete one location and let Nuvemshop reprioritize the remaining locations. Deletion fails when the location is default or still has inventory levels. First read its inventory, move or remove every stock assignment, choose another default, and confirm the exact ULID. Requires write_locations scope.',
		method: 'DELETE',
		path: '/locations/{id}',
		pathParameters: [locationId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a location',
		description:
			'Retrieve one location by exact ULID, including localized name, address, priority, default status, channel tags, and timestamps. Use this read-only operation before update, default selection, or deletion. Requires read_locations scope.',
		method: 'GET',
		path: '/locations/{id}',
		pathParameters: [locationId],
	},
	{
		name: 'Get Inventory Levels',
		value: 'getInventoryLevels',
		action: 'Get inventory levels at a location',
		description:
			'List product-variant inventory assigned to one location. Optionally restrict results to an exact variant_id. Return All follows page/per_page over the response results array; otherwise Limit caps the emitted inventory records. Use this before deleting a location or reconciling multi-location stock.',
		method: 'GET',
		path: '/locations/{id}/inventory-levels',
		pathParameters: [locationId],
		paginated: true,
		responseProperty: 'results',
		query: jsonQuery(
			'Optional variant_id filter. The node manages page and per_page automatically.',
			'{"variant_id":101}',
		),
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many locations',
		description:
			'List every location configured for the store, including ULID, localized name, priority, address, default status, and sales-channel tags. The official endpoint returns one array and does not document page/per_page. Use returned IDs for fulfillment assignment and multi-location inventory operations. Requires read_locations scope.',
		method: 'GET',
		path: '/locations',
	},
	{
		name: 'Make Default',
		value: 'makeDefault',
		action: 'Make a location the default',
		description:
			'Make one non-default location the store default. The selected location becomes priority 0 and Nuvemshop reprioritizes every other location, changing checkout stock allocation order. The target must currently have priority greater than 0. Retrieve all locations and require explicit confirmation before this write.',
		method: 'PATCH',
		path: '/locations/{id}/chosen-as-default',
		pathParameters: [locationId],
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a location',
		description:
			'Update the localized name, address, or online/offline tags of one location. This can affect checkout availability, fulfillment routing, labels, and tax/shipping calculations. Send only writable fields that should change; use Make Default or Update Priorities for allocation order.',
		method: 'PUT',
		path: '/locations/{id}',
		pathParameters: [locationId],
		body: jsonBody(
			'Writable location fields. Omit id, store_id, priority, is_default, verified_at, and timestamps.',
			'{"name":{"pt_BR":"Centro de Distribuicao Principal"},"address":{"zipcode":"01001-000","street":"Praca da Se","number":"200","city":"Sao Paulo","province":{"code":"SP","name":"Sao Paulo"},"region":{"code":"SE","name":"Sudeste"},"country":{"code":"BR","name":"Brazil"}},"tags":["online"]}',
		),
	},
	{
		name: 'Update Priorities',
		value: 'updatePriorities',
		action: 'Update all location priorities',
		description:
			'Reorder store locations for stock assignment during checkout. Lower numbers have higher priority; the location assigned priority 0 automatically becomes default. This is a high-impact, collection-wide write: retrieve every location first and submit the complete intended ordering with trusted ULIDs so no warehouse is accidentally deprioritized.',
		method: 'PATCH',
		path: '/locations/priorities',
		body: jsonBody(
			'JSON array containing each location ULID and its intended numeric priority. Include the full ordering and assign priority 0 exactly once.',
			'[{"id":"01HSY0PDQCTWCEKH6Y23W0P2VR","priority":0},{"id":"01HSY0PNSV30VZ9F35VCDE0C52","priority":1},{"id":"01HSY0MVKDRAXEZ45B91EGVEJX","priority":2}]',
		),
	},
];

const orderId = pathParameter('order_id', 'Order ID', 'order', {
	placeholder: 'e.g. 123456',
	description:
		'Numeric order ID returned by Order > Get or Get Many. Do not use the human-facing order number, fulfillment-order number, or fulfillment-order ULID.',
});
const fulfillmentOrderId = pathParameter(
	'fulfillment_order_id',
	'Fulfillment Order ID',
	'fulfillment order',
	{
		placeholder: 'e.g. 01FHZXHK8PTP9FVK99Z66GXASS',
		description:
			'Fulfillment-order ULID returned by Fulfillment Order > Get Many or as the order fulfillment_orders aggregate. It must belong to the order_id used in the same request.',
	},
);
const trackingEventId = pathParameter(
	'fulfillment_order_tracking_event_id',
	'Tracking Event ID',
	'fulfillment-order tracking event',
	{
		placeholder: 'e.g. 01FHZXHK8PTP9FVK99Z66GXJIO',
		description:
			'Tracking-event ULID returned by Create Tracking Event, Get Tracking Event, or Get Many Tracking Events for this same fulfillment order. Never substitute the carrier tracking code.',
	},
);
const labelId = pathParameter('label_id', 'Label ID', 'fulfillment-order label', {
	placeholder: 'e.g. 01GSB6KZXT0RTBA0CD4M4WXBSR',
	description:
		'Label ULID embedded in a Fulfillment Order response or returned by Create Labels. It must belong to the fulfillment_order_id used in the same request; it is not a tracking code.',
});

const fulfillmentOrderOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create Labels',
		value: 'createLabels',
		action: 'Create labels for fulfillment orders',
		description:
			'Start asynchronous shipping-label creation for multiple fulfillment-order ULIDs. This feature requires fulfillment_order_label_api, currently associated with eligible Next-plan stores; check Store features first. Send at most 50 fulfillment orders per request and no more than 20 labels per fulfillment order. Optional carrier {ID, app_id} overrides routing for that request without changing the fulfillment order.',
		method: 'POST',
		path: '/fulfillment-orders/labels',
		body: jsonBody(
			'JSON array of fulfillment-order label requests. id is the fulfillment-order ULID. Include carrier only when deliberately overriding the enabled carrier; both carrier id and owning app_id are then required.',
			'[{"id":"01FHZXHK8PTP9FVK99Z66GXKKK"},{"id":"01FHZXHK8PTP9FVK99Z66GXLLL","carrier":{"id":"123456","app_id":"98765"}}]',
		),
	},
	{
		name: 'Create Tracking Event',
		value: 'createTrackingEvent',
		action: 'Create a fulfillment-order tracking event',
		description:
			'Append a shipment tracking event after the fulfillment order is DISPATCHED. Valid statuses include dispatched, received_by_post_office, in_transit, out_for_delivery, delivery_attempt_failed, delayed, ready_for_pickup, delivered, returned_to_sender, lost, failure, and custom_{status}. delivered automatically marks the fulfillment order DELIVERED and sets fulfilled_at from happened_at. Identical consecutive events are rejected; at most 100 events are supported.',
		method: 'POST',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}/tracking-events',
		pathParameters: [orderId, fulfillmentOrderId],
		body: jsonBody(
			'Tracking status, human-readable description, optional address/geolocation, event time, and estimated delivery time. Timestamps use ISO 8601; when happened_at is omitted the API assumes now.',
			'{"status":"in_transit","description":"Package left the distribution center","address":"Sao Paulo, SP, Brazil","geolocation":{"longitude":-46.6333,"latitude":-23.5505},"happened_at":"2026-07-10T14:30:00Z","estimated_delivery_at":"2026-07-13T18:00:00Z"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a fulfillment order',
		description:
			'Permanently delete one fulfillment order from an order. This is destructive and can affect shipment allocation, status history, tracking, labels, and inventory reconciliation. Retrieve the fulfillment order and parent order first, verify it is legally deletable, and require explicit human confirmation.',
		method: 'DELETE',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}',
		pathParameters: [orderId, fulfillmentOrderId],
	},
	{
		name: 'Delete Tracking Event',
		value: 'deleteTrackingEvent',
		action: 'Delete a fulfillment-order tracking event',
		description:
			'Permanently remove one tracking event while the fulfillment order is DISPATCHED and not DELIVERED. This removes buyer-visible shipment history and may alter downstream reconciliation. Confirm the event ULID by reading it first; do not use the carrier tracking code.',
		method: 'DELETE',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}/tracking-events/{fulfillment_order_tracking_event_id}',
		pathParameters: [orderId, fulfillmentOrderId, trackingEventId],
	},
	{
		name: 'Download Label',
		value: 'downloadLabel',
		action: 'Get signed fulfillment-order label download URLs',
		description:
			'Request signed download URLs for fulfillment-order label documents. The label must be READY_TO_USE or DOWNLOADED and the store must have fulfillment_order_label_api. The API returns JSON containing temporary signed URLs rather than file bytes and changes label status to DOWNLOADED. To fetch a file, pass its returned external URL to an n8n HTTP Request node without Nuvemshop authentication; Nuvem Shop Custom API Call accepts only relative Nuvemshop paths and cannot follow external signed URLs. Download or archive promptly because documents expire three months after creation.',
		method: 'POST',
		path: '/fulfillment-orders/{fulfillment_order_id}/labels/{label_id}/download',
		pathParameters: [fulfillmentOrderId, labelId],
		query: jsonQuery(
			'Optional label document format and comma-separated document types. format accepts PDF, TXT, ZPL, HTML, or XML; types accepts LABEL and/or CONTENT_DECLARATION.',
			'{"format":"PDF","types":"LABEL"}',
		),
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a fulfillment order',
		description:
			'Retrieve one shipment by parent order ID and fulfillment-order ULID. The response includes assigned location, line items, recipient, destination, shipping option and costs, status/history, tracking info/events, labels, and timestamps. Read this state before every status, tracking, label, assignment, or deletion write.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}',
		pathParameters: [orderId, fulfillmentOrderId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get fulfillment orders for an order',
		description:
			'List every fulfillment order (shipment) belonging to one order. Add aggregates=custom_fields when line_items must include their custom-field key/value dictionary. The endpoint returns one array and does not document page/per_page. Use returned ULIDs for tracking and label operations.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillment-orders',
		pathParameters: [orderId],
		query: jsonQuery(
			'Optional aggregates selector. The only documented value is custom_fields.',
			'{"aggregates":"custom_fields"}',
		),
	},
	{
		name: 'Get Many Tracking Events',
		value: 'getManyTrackingEvents',
		action: 'Get many fulfillment-order tracking events',
		description:
			'List the complete buyer-visible tracking history for one fulfillment order. The endpoint returns one array and does not document pagination. Use returned event ULIDs for exact update or delete operations and use happened_at, not created_at, for the physical event sequence.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}/tracking-events',
		pathParameters: [orderId, fulfillmentOrderId],
	},
	{
		name: 'Get Tracking Event',
		value: 'getTrackingEvent',
		action: 'Get a fulfillment-order tracking event',
		description:
			'Retrieve one tracking event by order ID, fulfillment-order ULID, and event ULID. Returns status, description, address, optional geolocation, happened_at, estimated_delivery_at, and timestamps. This read is the safe prerequisite for update or deletion.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}/tracking-events/{fulfillment_order_tracking_event_id}',
		pathParameters: [orderId, fulfillmentOrderId, trackingEventId],
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a fulfillment order',
		description:
			'Update status, tracking_info, destination, recipient, shipping, and/or assigned_location. Valid status workflow values are UNPACKED, IN_PREPARATION, PACKED, DISPATCHED, READY_FOR_PICKUP, and DELIVERED, subject to shipping type. IN_PREPARATION is optional and set manually: it triggers no automatic transition, and a request may skip it when moving forward. Sent shipments cannot change destination, shipping, or recipient; packed/sent shipments cannot change assigned location. Prefer a delivered tracking event instead of directly setting DELIVERED so fulfilled_at uses the actual event time.',
		method: 'PATCH',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}',
		pathParameters: [orderId, fulfillmentOrderId],
		body: jsonBody(
			'Only fulfillment-order sections that intentionally change. tracking_info supports code, url, and notify_customer; assigned_location.location_id must come from Location > Get Many.',
			'{"status":"PACKED","tracking_info":{"code":"BR123123123AA","url":"https://carrier.example/track/BR123123123AA","notify_customer":true},"recipient":{"name":"Maria Silva","phone":"+5511999999999","identifier":"12345678909","email":"maria@example.com"},"assigned_location":{"location_id":"01ARZ3NDEKTSV4RRFFQ69G5DAD"}}',
		),
	},
	{
		name: 'Update Label',
		value: 'updateLabel',
		action: 'Update a fulfillment-order label',
		description:
			'Advance one label through its validated lifecycle. Allowed requested statuses are READY_TO_DOWNLOAD, FAILED, CANCELED, SUSPENDED, and READY_TO_USE. READY_TO_DOWNLOAD requires documents with a reachable download_url_from_app; FAILED/CANCELED/SUSPENDED require reason; reactivating SUSPENDED to READY_TO_USE also requires reason. Terminal and backward transitions are rejected. Tracking from the newest eligible label can replace or clear parent fulfillment tracking.',
		method: 'PATCH',
		path: '/fulfillment-orders/{fulfillment_order_id}/labels/{label_id}',
		pathParameters: [fulfillmentOrderId, labelId],
		body: jsonBody(
			'One label status transition. Document type accepts LABEL or CONTENT_DECLARATION; format accepts PDF, TXT, ZPL, HTML, or XML. The carrier URL must remain accessible until READY_TO_USE or FAILED is received.',
			'{"status":"READY_TO_DOWNLOAD","tracking_info":{"code":"AA123456789BR","url":"https://carrier.example/track/AA123456789BR"},"documents":[{"file_name":"label_123.pdf","type":"LABEL","format":"PDF","download_url_from_app":"https://carrier.example/labels/label_123.pdf","size":1024}]}',
		),
	},
	{
		name: 'Update Many Labels',
		value: 'updateManyLabels',
		action: 'Update many fulfillment-order labels',
		description:
			'Apply validated status transitions to labels across multiple fulfillment orders. The API accepts at most 200 fulfillment orders per request, each with 1-10 unique labels. The same status, reason, documents, tracking, terminal-state, and carrier-callback rules as Update Label apply. Batch cancellation or suspension can be partially rejected by carriers, so inspect every returned label and error.',
		method: 'PATCH',
		path: '/fulfillment-orders/labels/status',
		body: jsonBody(
			'Array grouped by fulfillment-order id; each labels array contains exact label ULIDs and one allowed status transition.',
			'[{"id":"01FHZXHK8PTP9FVK99Z66GXKKK","labels":[{"id":"01GSB6KZXT0RTBA0CD4M4WXBSR","status":"CANCELED","reason":{"type":"OTHER_ERROR","message":"Cancellation requested by merchant"}}]}]',
		),
	},
	{
		name: 'Update Tracking Event',
		value: 'updateTrackingEvent',
		action: 'Update a fulfillment-order tracking event',
		description:
			'Update one existing tracking event while the fulfillment order is DISPATCHED and not yet DELIVERED. Changing status to delivered automatically marks the fulfillment order DELIVERED and sets fulfilled_at. Preserve accurate happened_at chronology and do not create a duplicate event within the API duplicate-detection window.',
		method: 'PUT',
		path: '/orders/{order_id}/fulfillment-orders/{fulfillment_order_id}/tracking-events/{fulfillment_order_tracking_event_id}',
		pathParameters: [orderId, fulfillmentOrderId, trackingEventId],
		body: jsonBody(
			'Updated tracking-event status and metadata. Timestamps use ISO 8601 and geolocation uses decimal longitude and latitude.',
			'{"status":"out_for_delivery","description":"Package is out for delivery","address":"Sao Paulo, SP, Brazil","geolocation":{"longitude":-46.6333,"latitude":-23.5505},"happened_at":"2026-07-13T10:15:00Z","estimated_delivery_at":"2026-07-13T18:00:00Z"}',
		),
	},
];

const carrierId = pathParameter('carrier_id', 'Shipping Carrier ID', 'shipping carrier', {
	placeholder: 'e.g. 1234',
	description:
		'Numeric shipping-carrier ID returned by Shipping Carrier > Create, Get, or Get Many. Do not use the carrier app ID, option ID, rate code, or fulfillment carrier code.',
});
const carrierGenericId = pathParameter('id', 'Shipping Carrier ID', 'shipping carrier', {
	placeholder: 'e.g. 1234',
	description:
		'Numeric shipping-carrier ID returned by Shipping Carrier > Create, Get, or Get Many. Do not use the carrier app ID, option ID, or rate code.',
});

const shippingCarrierOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a shipping carrier',
		description:
			'Create a real-time shipping carrier for the store. This API is restricted to shipping apps approved by Nuvemshop Platform. name, HTTPS callback_url, and comma-separated types are required; types accepts ship, pickup, or ship,pickup. callback_labels_url is optional but must be HTTPS and is required for asynchronous Labels API integration.',
		method: 'POST',
		path: '/shipping_carriers',
		body: jsonBody(
			'Shipping carrier registration. callback_url receives checkout rate requests; callback_labels_url receives label lifecycle callbacks. active defaults to true.',
			'{"name":"Acme Shipping","callback_url":"https://shipping.example.com/rates","callback_labels_url":"https://shipping.example.com/labels","types":"ship,pickup","active":true}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a shipping carrier',
		description:
			'Permanently remove one shipping carrier. This is destructive: its options and checkout rate integration may stop working and fulfillment or label references can remain. Prefer disabling active first, verify no live store depends on it, and confirm the exact carrier ID.',
		method: 'DELETE',
		path: '/shipping_carriers/{id}',
		pathParameters: [carrierGenericId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a shipping carrier',
		description:
			'Retrieve one carrier by exact numeric ID, including name, active state, supported types, rate callback, label callback, and timestamps. Use this read before changing or deleting a checkout shipping integration.',
		method: 'GET',
		path: '/shipping_carriers/{id}',
		pathParameters: [carrierGenericId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many shipping carriers',
		description:
			'List all shipping carriers configured for the store. The official endpoint returns one array and does not document page/per_page. Use returned IDs for carrier options and optional label carrier overrides; verify active before routing new labels.',
		method: 'GET',
		path: '/shipping_carriers',
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a shipping carrier',
		description:
			'Update carrier name, HTTPS callbacks, supported ship/pickup types, or active state. Disabling active removes the carrier from new checkout use. Setting callback_labels_url to null removes label callbacks and changes cancellation/suspension behavior, so verify outstanding labels before doing so.',
		method: 'PUT',
		path: '/shipping_carriers/{id}',
		pathParameters: [carrierGenericId],
		body: jsonBody(
			'Only carrier fields that should change. Use null for callback_labels_url only when intentionally removing label integration.',
			'{"name":"Acme Shipping Express","callback_labels_url":"https://shipping.example.com/new-labels","types":"ship","active":false}',
		),
	},
];

const carrierOptionId = pathParameter('option_id', 'Shipping Carrier Option ID', 'carrier option', {
	placeholder: 'e.g. 123',
	description:
		'Numeric carrier-option ID returned by Shipping Carrier Option > Create, Get, or Get Many for this carrier. Do not use its code or the parent carrier ID.',
});

const shippingCarrierOptionOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a shipping carrier option',
		description:
			'Create a merchant-configurable service option under one approved shipping carrier. code and name are required. code must match the code returned by the carrier rate callback so additional_days, additional_cost, active state, and free-shipping eligibility can be applied. Ship-rate codes must be unique; pickup rates may reuse a code for multiple locations.',
		method: 'POST',
		path: '/shipping_carriers/{carrier_id}/options',
		pathParameters: [carrierId],
		body: jsonBody(
			'Carrier option code, buyer-facing name, and optional merchant settings. active defaults to true.',
			'{"code":"express","name":"Acme Express","additional_days":1,"additional_cost":9.9,"allow_free_shipping":true,"active":true}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a shipping carrier option',
		description:
			'Permanently remove one option from a carrier. Checkout rates using its code will no longer match merchant configuration. Prefer setting active=false when temporary suspension is intended, and confirm both carrier and option IDs before deletion.',
		method: 'DELETE',
		path: '/shipping_carriers/{carrier_id}/options/{option_id}',
		pathParameters: [carrierId, carrierOptionId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a shipping carrier option',
		description:
			'Retrieve one option by parent carrier ID and option ID, including rate-matching code, buyer-facing name, extra days/cost, free-shipping eligibility, active state, and timestamps. This operation does not call the external rate callback.',
		method: 'GET',
		path: '/shipping_carriers/{carrier_id}/options/{option_id}',
		pathParameters: [carrierId, carrierOptionId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many shipping carrier options',
		description:
			'List every configured option for one carrier. The official endpoint returns one array and does not document page/per_page. Compare option codes with codes emitted by the carrier callback before updating or deleting configuration.',
		method: 'GET',
		path: '/shipping_carriers/{carrier_id}/options',
		pathParameters: [carrierId],
	},
	{
		name: 'Update',
		value: 'update',
		action: 'Update a shipping carrier option',
		description:
			'Update the option name/code, added delivery days, added consumer cost, free-shipping eligibility, or active state. These settings directly modify checkout prices and delivery promises after carrier rates are returned. Read the current option and validate monetary and day adjustments before writing.',
		method: 'PUT',
		path: '/shipping_carriers/{carrier_id}/options/{option_id}',
		pathParameters: [carrierId, carrierOptionId],
		body: jsonBody(
			'Only option settings that should change. additional_days and additional_cost must be non-negative.',
			'{"additional_days":2,"additional_cost":10.0,"allow_free_shipping":true,"active":true}',
		),
	},
];

const legacyFulfillmentId = pathParameter(
	'id',
	'Legacy Fulfillment Event ID',
	'legacy fulfillment event',
	{
		placeholder: 'e.g. 3',
		description:
			'Numeric legacy fulfillment-event ID returned by Legacy Fulfillment Event > Create, Get, or Get Many. It is not a modern fulfillment-order/tracking-event ULID.',
	},
);

const legacyFulfillmentOperations: NuvemShopOperationDefinition[] = [
	{
		name: 'Create',
		value: 'create',
		action: 'Create a legacy fulfillment event',
		description:
			'Create a buyer-visible tracking event through the legacy order-level fulfillment API using the API version selected in the credential. Prefer modern Fulfillment Order > Create Tracking Event for new multi-location integrations. Valid status values are dispatched, received_by_post_office, in_transit, out_for_delivery, delivery_attempt_failed, delayed, ready_for_pickup, delivered, returned_to_sender, lost, and failure. Country uses ISO 3166-1 and dates use ISO 8601.',
		method: 'POST',
		path: '/orders/{order_id}/fulfillments',
		pathParameters: [orderId],
		body: jsonBody(
			'Legacy fulfillment event status and tracking context. Use accurate event and estimated-delivery timestamps; do not send modern fulfillment-order ULIDs.',
			'{"status":"in_transit","description":"Package forwarded to destination","city":"Sao Paulo","province":"SP","country":"BR","happened_at":"2026-07-10T14:30:00Z","estimated_delivery_at":"2026-07-13T18:00:00Z"}',
		),
	},
	{
		name: 'Delete',
		value: 'delete',
		action: 'Delete a legacy fulfillment event',
		description:
			'Permanently remove one legacy buyer-visible tracking event. This can erase shipment history from the tracking page. Confirm the numeric event ID under the exact order and use modern Fulfillment Order tracking operations when the store has multi-inventory fulfillment orders.',
		method: 'DELETE',
		path: '/orders/{order_id}/fulfillments/{id}',
		pathParameters: [orderId, legacyFulfillmentId],
	},
	{
		name: 'Get',
		value: 'get',
		action: 'Get a legacy fulfillment event',
		description:
			'Retrieve one legacy order-level fulfillment event by numeric order and event IDs using the API version selected in the credential. Returns status, description, location strings, event time, estimate, and timestamps. This is not a modern Fulfillment Order and has no assigned-location, label, or tracking-event ULID.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillments/{id}',
		pathParameters: [orderId, legacyFulfillmentId],
	},
	{
		name: 'Get Many',
		value: 'getMany',
		action: 'Get many legacy fulfillment events',
		description:
			'List all legacy order-level fulfillment events for one order in buyer tracking history using the API version selected in the credential. The endpoint returns one array and does not document pagination. Use modern Fulfillment Order > Get Many Tracking Events for stores migrated to multi-inventory fulfillment orders.',
		method: 'GET',
		path: '/orders/{order_id}/fulfillments',
		pathParameters: [orderId],
	},
];

export const logisticsResources: NuvemShopResourceDefinition[] = [
	{
		name: 'Fulfillment Event (Legacy)',
		value: 'legacyFulfillmentEvent',
		description:
			'Legacy buyer tracking events attached directly to an order and available in both supported API versions. Prefer Fulfillment Order tracking events for modern multi-location stores.',
		operations: legacyFulfillmentOperations,
	},
	{
		name: 'Fulfillment Order',
		value: 'fulfillmentOrder',
		description:
			'Modern shipment units for multi-inventory orders, including assigned locations, lifecycle status, recipient and destination, tracking events, asynchronous labels, and signed label download URLs',
		operations: fulfillmentOrderOperations,
	},
	{
		name: 'Location',
		value: 'location',
		description:
			'Physical inventory locations and their checkout allocation priority, default status, online/offline channels, addresses, and paginated variant inventory levels',
		operations: locationOperations,
	},
	{
		name: 'Shipping Carrier',
		value: 'shippingCarrier',
		description:
			'Approved real-time shipping integrations registered on a store, with HTTPS checkout-rate and optional label callback endpoints, supported ship/pickup types, and active state',
		operations: shippingCarrierOperations,
	},
	{
		name: 'Shipping Carrier Option',
		value: 'shippingCarrierOption',
		description:
			'Merchant-configurable services under a shipping carrier. Option codes match callback rates and apply extra cost, delivery days, free-shipping eligibility, and availability at checkout.',
		operations: shippingCarrierOptionOperations,
	},
];
