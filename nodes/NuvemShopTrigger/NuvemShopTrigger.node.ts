import { createHmac, timingSafeEqual } from 'node:crypto';

import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { nuvemShopApiCredentialTest } from '../NuvemShop/methods/credentialTest';
import { nuvemShopApiRequest } from '../NuvemShop/transport';
import { NUVEMSHOP_WEBHOOK_EVENTS } from '../shared/webhookEvents';

interface RegisteredWebhook {
	id: string;
	event: string;
	portalOnly?: boolean;
}

const PORTAL_ONLY_EVENTS = new Set(['customers/data_request', 'customers/redact', 'store/redact']);

const WEBHOOK_EVENTS = NUVEMSHOP_WEBHOOK_EVENTS.map((event) => ({
	name: event
		.replaceAll('/', '_')
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' '),
	value: event,
	description: PORTAL_ONLY_EVENTS.has(event)
		? `${event} is a required privacy webhook configured manually in the Nuvemshop Partners portal`
		: `Start the workflow when Nuvemshop sends ${event}`,
}));

function responseArray(response: unknown): IDataObject[] {
	if (Array.isArray(response)) return response as IDataObject[];
	if (response === null || typeof response !== 'object') return [];
	const data = response as Record<string, unknown>;
	for (const key of ['webhooks', 'data', 'results']) {
		if (Array.isArray(data[key])) return data[key] as IDataObject[];
	}
	return [];
}

function signatureIsValid(
	signature: string,
	secret: string,
	payloads: Array<string | Buffer>,
): boolean {
	const normalized = signature
		.trim()
		.replace(/^sha256=/i, '')
		.toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
	const received = Buffer.from(normalized, 'hex');

	return payloads.some((payload) => {
		const expected = createHmac('sha256', secret).update(payload).digest();
		return received.length === expected.length && timingSafeEqual(received, expected);
	});
}

async function assertSignatureConfiguration(context: IHookFunctions): Promise<void> {
	const verifySignature = context.getNodeParameter('verifySignature', true) as boolean;
	if (!verifySignature) return;

	const credentials = await context.getCredentials('nuvemShopApi');
	if (!String(credentials.clientSecret ?? '').trim()) {
		throw new NodeOperationError(
			context.getNode(),
			'Verify HMAC Signature is enabled, but the selected credential has no Client Secret. Use a Store and App (Full Integration) credential or disable signature verification only when the app does not sign this event.',
		);
	}
}

export class NuvemShopTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nuvem Shop Trigger',
		name: 'nuvemShopTrigger',
		icon: { light: 'file:nuvemshop.png', dark: 'file:nuvemshop.dark.png' },
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow from Nuvemshop webhooks. Registers one HTTPS webhook per selected API event, removes registrations on deactivation, validates store identity, optionally verifies the x-linkedstore-hmac-sha256 signature, and returns each delivery without deduplication because Nuvemshop does not guarantee order or uniqueness.',
		defaults: { name: 'Nuvem Shop Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'nuvemShopApi',
				required: true,
				testedBy: 'nuvemShopApiCredentialTest',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['order/created'],
				options: WEBHOOK_EVENTS,
				description:
					'Events to receive. Standard events are registered automatically. Privacy events marked as Partners portal events must use this node production URL in the app settings.',
			},
			{
				displayName: 'Verify HMAC Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description:
					'Whether to reject deliveries whose x-linkedstore-hmac-sha256 header does not match the raw body and Client Secret in the credential. Disable only for an app or legacy event that does not send signatures.',
			},
			{
				displayName: 'Include Request Metadata',
				name: 'includeRequestMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to output an object containing body, headers, and query instead of only the webhook JSON body',
			},
		],
	};

	methods = { credentialTest: { nuvemShopApiCredentialTest } };

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				await assertSignatureConfiguration(this);
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node');
				const automaticEvents = events.filter((event) => !PORTAL_ONLY_EVENTS.has(event));
				const existing = automaticEvents.length
					? responseArray(
							await nuvemShopApiRequest.call(this, 'GET', '/webhooks', {}, { per_page: 200 }),
						)
					: [];
				const registered: RegisteredWebhook[] = [];

				for (const event of events) {
					if (PORTAL_ONLY_EVENTS.has(event)) {
						registered.push({ id: `portal:${event}`, event, portalOnly: true });
						continue;
					}
					const match = existing.find(
						(webhook) => webhook.url === webhookUrl && webhook.event === event,
					);
					if (!match?.id) return false;
					registered.push({ id: String(match.id), event });
				}

				staticData.webhooks = registered;
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				await assertSignatureConfiguration(this);
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;
				const events = this.getNodeParameter('events') as string[];
				const staticData = this.getWorkflowStaticData('node');
				const automaticEvents = events.filter((event) => !PORTAL_ONLY_EVENTS.has(event));
				const existing = automaticEvents.length
					? responseArray(
							await nuvemShopApiRequest.call(this, 'GET', '/webhooks', {}, { per_page: 200 }),
						)
					: [];
				const registered: RegisteredWebhook[] = [];
				const createdDuringActivation: RegisteredWebhook[] = [];

				try {
					for (const event of events) {
						if (PORTAL_ONLY_EVENTS.has(event)) {
							registered.push({ id: `portal:${event}`, event, portalOnly: true });
							staticData.webhooks = [...registered];
							continue;
						}

						const match = existing.find(
							(webhook) => webhook.url === webhookUrl && webhook.event === event,
						);
						if (match?.id) {
							registered.push({ id: String(match.id), event });
							staticData.webhooks = [...registered];
							continue;
						}

						const created = (await nuvemShopApiRequest.call(this, 'POST', '/webhooks', {
							event,
							url: webhookUrl,
						})) as IDataObject;
						if (!created?.id) {
							throw new NodeOperationError(
								this.getNode(),
								`Nuvemshop did not return an ID while registering the ${event} webhook`,
							);
						}

						const webhook = { id: String(created.id), event };
						registered.push(webhook);
						createdDuringActivation.push(webhook);
						staticData.webhooks = [...registered];
					}

					return true;
				} catch (error) {
					const rollbackFailures: RegisteredWebhook[] = [];
					for (const webhook of [...createdDuringActivation].reverse()) {
						try {
							await nuvemShopApiRequest.call(this, 'DELETE', `/webhooks/${webhook.id}`);
						} catch {
							rollbackFailures.push(webhook);
						}
					}

					if (rollbackFailures.length) {
						staticData.webhooks = rollbackFailures;
						throw new NodeOperationError(
							this.getNode(),
							`Webhook activation failed and rollback could not remove registrations ${rollbackFailures.map(({ id }) => id).join(', ')}. Remove these IDs in Nuvemshop before activating again. Original error: ${(error as Error).message}`,
						);
					}

					delete staticData.webhooks;
					if (error instanceof NodeApiError || error instanceof NodeOperationError) {
						// Preserve the activation error after every new registration was rolled back.
						// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error as Error);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const registered = (staticData.webhooks as unknown as RegisteredWebhook[]) ?? [];

				const unresolved: RegisteredWebhook[] = [];
				let firstError: unknown;
				for (const webhook of registered) {
					if (webhook.portalOnly) continue;
					try {
						await nuvemShopApiRequest.call(this, 'DELETE', `/webhooks/${webhook.id}`);
					} catch (error) {
						if (error instanceof NodeApiError && error.httpCode === '404') continue;
						unresolved.push(webhook);
						firstError ??= error;
					}
				}

				if (unresolved.length) {
					staticData.webhooks = unresolved;
					if (firstError instanceof NodeApiError || firstError instanceof NodeOperationError) {
						// Keep the HTTP response available so a later deactivation can be retried safely.
						throw firstError;
					}
					throw new NodeOperationError(this.getNode(), firstError as Error);
				}

				delete staticData.webhooks;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData();
		const credentials = await this.getCredentials('nuvemShopApi');
		const configuredStoreId = String(credentials.storeId ?? '').trim();
		const payloadStoreId = String(bodyData.store_id ?? '').trim();

		if (payloadStoreId && configuredStoreId && payloadStoreId !== configuredStoreId) {
			this.getResponseObject().status(403).send('Webhook store does not match credential');
			return { noWebhookResponse: true };
		}

		const verifySignature = this.getNodeParameter('verifySignature', true) as boolean;
		if (verifySignature) {
			const signatureHeader = headerData['x-linkedstore-hmac-sha256'];
			const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
			const secret = String(credentials.clientSecret ?? '').trim();
			const request = this.getRequestObject() as unknown as { rawBody?: Buffer | string };
			const payloads: Array<string | Buffer> = [JSON.stringify(bodyData)];
			if (request.rawBody) payloads.unshift(request.rawBody);

			if (!secret || !signature || !signatureIsValid(signature, secret, payloads)) {
				this.getResponseObject().status(401).send('Invalid webhook signature');
				return { noWebhookResponse: true };
			}
		}

		const includeMetadata = this.getNodeParameter('includeRequestMetadata', false) as boolean;
		const output = includeMetadata
			? ({ body: bodyData, headers: headerData, query: this.getQueryData() } as IDataObject)
			: bodyData;

		return { workflowData: [this.helpers.returnJsonArray(output)] };
	}
}
