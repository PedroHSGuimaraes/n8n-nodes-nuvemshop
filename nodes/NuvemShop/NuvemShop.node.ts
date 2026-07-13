import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	executeCustomApiCall,
	executeDefinedOperation,
	findOperation,
	resourceOptions,
	resourceProperties,
} from './actions';
import { nuvemShopApiCredentialTest } from './methods/credentialTest';
import { loadOptions } from './methods/loadOptions';

function isPreparedExecutionData(value: unknown): value is INodeExecutionData {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		'binary' in value &&
		'json' in value
	);
}

function toDataObject(value: unknown): IDataObject {
	if (value === undefined || value === null || value === '') return { success: true };
	if (typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value)) {
		return value as IDataObject;
	}
	return { data: value as string | number | boolean };
}

export class NuvemShop implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nuvem Shop',
		name: 'nuvemShop',
		icon: { light: 'file:nuvemshop.png', dark: 'file:nuvemshop.dark.png' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Read and manage Nuvemshop store data through explicit resource operations. Use one node per AI tool and expose only the selected operation. IDs must come from matching read or create operations and must never be invented. Keep destructive, financial, inventory, fulfillment, and publication actions behind human approval.',
		defaults: { name: 'Nuvem Shop' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'nuvemShopApi',
				required: true,
				testedBy: 'nuvemShopApiCredentialTest',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: resourceOptions,
				default: 'product',
				description:
					'Business object or advanced API surface to use. Select one resource per node so AI tool intent remains narrow and explicit.',
			},
			...resourceProperties,
		],
	};

	methods = { loadOptions, credentialTest: { nuvemShopApiCredentialTest } };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operationValue = this.getNodeParameter('operation', itemIndex, 'request') as string;
				let response: unknown;

				if (resource === 'customApiCall') {
					response = await executeCustomApiCall.call(this, itemIndex);
				} else {
					const operation = findOperation(resource, operationValue);
					if (!operation) {
						throw new NodeOperationError(
							this.getNode(),
							`Unsupported Nuvem Shop resource/operation: ${resource}/${operationValue}`,
							{ itemIndex },
						);
					}
					response = await executeDefinedOperation.call(this, operation, itemIndex);
				}

				if (isPreparedExecutionData(response)) {
					returnData.push({ ...response, pairedItem: { item: itemIndex } });
					continue;
				}

				const responseItems = Array.isArray(response) ? response : [response];
				for (const responseItem of responseItems) {
					returnData.push({ json: toDataObject(responseItem), pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					// Preserve the original n8n error, including API status and response metadata.
					// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
