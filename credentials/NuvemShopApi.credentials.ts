import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class NuvemShopApi implements ICredentialType {
	name = 'nuvemShopApi';

	displayName = 'Nuvem Shop API';

	icon = { light: 'file:nuvemshop.png', dark: 'file:nuvemshop.dark.png' } as const;

	documentationUrl = 'https://tiendanube.github.io/api-documentation/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Credential Type',
			name: 'credentialType',
			type: 'options',
			options: [
				{
					name: 'Store API',
					value: 'store',
					description: 'Use a merchant store ID and permanent OAuth access token',
				},
				{
					name: 'App OAuth and Partner Actions',
					value: 'app',
					description:
						'Use an app ID and client secret to exchange authorization codes or call Partner Action endpoints',
				},
				{
					name: 'Store and App (Full Integration)',
					value: 'combined',
					description:
						'Use store access together with app credentials, including automatic webhooks with HMAC verification',
				},
			],
			default: 'store',
			description:
				'Select the credentials available for this connection. OAuth code exchange works with an app-only credential before a store token exists. Store operations require Store API fields, Partner Actions require App fields, and a verified Trigger requires the full integration type.',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: { show: { credentialType: ['store', 'combined'] } },
			description:
				'Permanent OAuth access token returned when the merchant installs your Nuvemshop app. It is sent as a Bearer token and is never exposed as an AI tool parameter.',
		},
		{
			displayName: 'Store ID',
			name: 'storeId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: { credentialType: ['store', 'combined'] } },
			placeholder: '1234567',
			description:
				'Numeric store identifier returned as user_id during OAuth authorization. The node inserts it into every store-scoped API URL, so workflows and AI agents must not repeat or guess it.',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'Brazil (Nuvemshop)',
					value: 'br',
					description: 'Use api.nuvemshop.com.br and nuvemshop.com.br',
				},
				{
					name: 'International (Tienda Nube)',
					value: 'international',
					description: 'Use api.tiendanube.com and tiendanube.com',
				},
			],
			default: 'br',
			description:
				'API domain for the store. Choose Brazil for Nuvemshop stores; choose International for Tiendanube stores in Argentina, Mexico, Colombia, Chile, and other supported countries.',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'options',
			options: [
				{
					name: '2025-03 (Stable)',
					value: '2025-03',
					description: 'Current stable API contract and recommended choice for new workflows',
				},
				{
					name: 'V1 (Legacy)',
					value: 'v1',
					description: 'Legacy API contract for existing integrations',
				},
				{
					name: 'Unstable (Early Access)',
					value: 'unstable',
					description: 'Preview contract that can change without backward compatibility',
				},
			],
			default: '2025-03',
			description:
				'Version segment placed in every API URL. Built-in operations target the stable 2025-03 contract; use Custom API Call for version-specific preview or legacy routes.',
		},
		{
			displayName: 'User Agent',
			name: 'userAgent',
			type: 'string',
			default: 'n8n-nodes-nuvemshop (https://github.com/PedroHSGuimaraes/n8n-nodes-nuvemshop)',
			required: true,
			description:
				'Application name plus a contact email or URL. Nuvemshop requires this header on every request and returns HTTP 400 when it is missing.',
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			required: true,
			displayOptions: { show: { credentialType: ['app', 'combined'] } },
			placeholder: '1234',
			description:
				'Partner application ID. It is used for Authorization > Exchange Code and partner-scoped operations such as creating, updating, or deleting billing plans.',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			displayOptions: { show: { credentialType: ['app', 'combined'] } },
			description:
				'Secret from the Nuvemshop Partners portal. It exchanges authorization codes, authenticates Partner Action endpoints, and verifies webhook signatures. Never expose it in workflow fields.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
				'User-Agent': '={{$credentials.userAgent}}',
				Accept: 'application/json',
				'Content-Type': 'application/json; charset=utf-8',
			},
		},
	};
}
