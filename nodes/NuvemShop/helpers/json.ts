import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export type JsonBody = IDataObject | IDataObject[];

function parseJsonValue(
	context: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): unknown {
	if (typeof value !== 'string') return value;

	const trimmed = value.trim();
	if (!trimmed) return {};

	try {
		return JSON.parse(trimmed) as unknown;
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			`The ${parameterName} field must contain valid JSON: ${(error as Error).message}`,
			{ itemIndex },
		);
	}
}

export function parseJsonBody(
	context: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): JsonBody {
	const parsed = parseJsonValue(context, value, parameterName, itemIndex);
	if (Array.isArray(parsed)) return parsed as IDataObject[];
	if (parsed !== null && typeof parsed === 'object') return parsed as IDataObject;

	throw new NodeOperationError(
		context.getNode(),
		`The ${parameterName} field must be a JSON object or array`,
		{ itemIndex },
	);
}

export function parseJsonObject(
	context: IExecuteFunctions,
	value: unknown,
	parameterName: string,
	itemIndex: number,
): IDataObject {
	const parsed = parseJsonValue(context, value, parameterName, itemIndex);
	if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
		return parsed as IDataObject;
	}

	throw new NodeOperationError(
		context.getNode(),
		`The ${parameterName} field must be a JSON object`,
		{
			itemIndex,
		},
	);
}
