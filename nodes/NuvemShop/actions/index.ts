import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { catalogResources } from './definitions/catalog';
import { commerceResources } from './definitions/commerce';
import { contentResources } from './definitions/content';
import { logisticsResources } from './definitions/logistics';
import { platformResources } from './definitions/platform';
import { priceTableResources } from './definitions/priceTable';
import { customApiCallProperties, buildResourceProperties } from './properties';
import type { NuvemShopOperationDefinition, NuvemShopResourceDefinition } from './types';

export const resourceDefinitions: NuvemShopResourceDefinition[] = [
	...catalogResources,
	...commerceResources,
	...contentResources,
	...logisticsResources,
	...platformResources,
	...priceTableResources,
].sort((left, right) => left.name.localeCompare(right.name));

export const resourceOptions: INodePropertyOptions[] = [
	...resourceDefinitions.map((resource) => ({
		name: resource.name,
		value: resource.value,
		description: resource.description,
	})),
	{
		name: 'Custom API Call',
		value: 'customApiCall',
		description:
			'Call a documented, preview, legacy, private, or future Nuvemshop endpoint with secure credential scoping',
	},
].sort((left, right) => left.name.localeCompare(right.name));

export const resourceProperties: INodeProperties[] = [
	...buildResourceProperties(resourceDefinitions),
	...customApiCallProperties,
];

export function findOperation(
	resourceValue: string,
	operationValue: string,
): NuvemShopOperationDefinition | undefined {
	return resourceDefinitions
		.find((resource) => resource.value === resourceValue)
		?.operations.find((operation) => operation.value === operationValue);
}

export { executeCustomApiCall, executeDefinedOperation } from './execute';
