import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunction,
	INodeCredentialTestResult,
} from 'n8n-workflow';

function value(credentials: ICredentialDataDecryptedObject, name: string): string {
	return String(credentials[name] ?? '').trim();
}

function missingFields(
	credentials: ICredentialDataDecryptedObject,
	credentialType: string,
): string[] {
	const required = ['region', 'apiVersion', 'userAgent'];
	if (credentialType === 'store' || credentialType === 'combined') {
		required.push('accessToken', 'storeId');
	}
	if (credentialType === 'app' || credentialType === 'combined') {
		required.push('appId', 'clientSecret');
	}
	return required.filter((name) => !value(credentials, name));
}

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	return 'Nuvemshop rejected the credential test request';
}

export const nuvemShopApiCredentialTest: ICredentialTestFunction = async function (
	credential,
): Promise<INodeCredentialTestResult> {
	const credentials = credential.data ?? {};
	const credentialType = value(credentials, 'credentialType') || 'store';
	const missing = missingFields(credentials, credentialType);
	if (missing.length) {
		return {
			status: 'Error',
			message: `Complete the required credential fields: ${missing.join(', ')}`,
		};
	}

	if (credentialType === 'app') {
		return {
			status: 'OK',
			message:
				'App credentials are configured. Nuvemshop validates the Client Secret when an authorization code is exchanged or a Partner Action is called.',
		};
	}

	const origin =
		value(credentials, 'region') === 'international'
			? 'https://api.tiendanube.com'
			: 'https://api.nuvemshop.com.br';
	const url = `${origin}/${encodeURIComponent(value(credentials, 'apiVersion'))}/${encodeURIComponent(value(credentials, 'storeId'))}/store`;

	try {
		// ICredentialTestFunctions still exposes request() as its only HTTP helper.
		// eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions
		await this.helpers.request({
			method: 'GET',
			uri: url,
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${value(credentials, 'accessToken')}`,
				'User-Agent': value(credentials, 'userAgent'),
			},
			json: true,
		});
		return { status: 'OK', message: 'Store API credentials are valid' };
	} catch (error) {
		return { status: 'Error', message: errorMessage(error) };
	}
};
