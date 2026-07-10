import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

interface BinaryMarker {
	$binary: string;
	fileName?: string;
	mimeType?: string;
}

function isBinaryMarker(value: unknown): value is BinaryMarker {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		typeof (value as Record<string, unknown>).$binary === 'string'
	);
}

export async function buildMultipartForm(
	context: IExecuteFunctions,
	body: IDataObject,
	itemIndex: number,
): Promise<FormData> {
	const form = new FormData();
	const item = context.getInputData()[itemIndex];

	for (const [fieldName, value] of Object.entries(body)) {
		if (value === undefined || value === null) continue;

		if (isBinaryMarker(value)) {
			const binaryProperty = value.$binary.trim();
			const binaryMetadata = item.binary?.[binaryProperty];
			if (!binaryProperty || !binaryMetadata) {
				throw new NodeOperationError(
					context.getNode(),
					`Multipart field "${fieldName}" references missing input binary property "${binaryProperty}"`,
					{ itemIndex },
				);
			}

			const buffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
			const mimeType = value.mimeType ?? binaryMetadata.mimeType ?? 'application/octet-stream';
			const fileName = value.fileName ?? binaryMetadata.fileName ?? `${fieldName}.bin`;
			form.append(fieldName, new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);
			continue;
		}

		if (typeof value === 'object') {
			form.append(fieldName, JSON.stringify(value));
		} else {
			form.append(fieldName, String(value));
		}
	}

	return form;
}
