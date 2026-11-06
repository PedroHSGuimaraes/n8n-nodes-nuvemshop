/**
 * Apoio dos testes do plano rotas-novas (.specs/features/rotas-novas/plan.md): contextos falsos
 * que gravam a requisição HTTP, sem rede, e leitura das propriedades do node por versão.
 */
const fs = require('node:fs');
const path = require('node:path');

const { findOperation, resourceDefinitions } = require('../../dist/nodes/NuvemShop/actions');
const { executeDefinedOperation } = require('../../dist/nodes/NuvemShop/actions/execute');
const { listSearch } = require('../../dist/nodes/NuvemShop/methods/listSearch');
const { NuvemShop } = require('../../dist/nodes/NuvemShop/NuvemShop.node');
const { NuvemShopTrigger } = require('../../dist/nodes/NuvemShopTrigger/NuvemShopTrigger.node');
const { NUVEMSHOP_WEBHOOK_EVENTS } = require('../../dist/nodes/shared/webhookEvents');

const root = path.join(__dirname, '..', '..');
const credentials = {
	region: 'br',
	apiVersion: '2025-03',
	storeId: '123456',
	accessToken: 'token',
	userAgent: 'test-agent (https://example.com)',
};

// Contexto de execução: grava todas as requisições e responde com a função do teste.
function executeContext(typeVersion, parameters, responder = async () => ({})) {
	const requests = [];
	return {
		requests,
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion }),
		getNodeParameter: (name, _itemIndex, defaultValue) => parameters[name] ?? defaultValue,
		getCredentials: async () => credentials,
		helpers: {
			httpRequestWithAuthentication: async (_type, options) => {
				requests.push(options);
				return responder(options, requests.length);
			},
		},
	};
}

// Contexto do editor (listSearch): grava as requisições.
function editorContext(responder) {
	const requests = [];
	return {
		requests,
		getNode: () => ({ name: 'Nuvem Shop', type: 'nuvemShop', typeVersion: 2 }),
		getCredentials: async () => credentials,
		helpers: {
			httpRequestWithAuthentication: async (_type, options) => {
				requests.push(options);
				return responder(options, requests.length);
			},
		},
	};
}

// Roda uma operação pelo nome do recurso e da operação.
async function run(resource, operation, parameters, responder, typeVersion = 2) {
	const context = executeContext(typeVersion, parameters, responder);
	const result = await executeDefinedOperation.call(context, findOperation(resource, operation), 0);
	return { context, result };
}

// Diz se uma propriedade aparece na versão do node, lendo a condição `@version`.
function visibleIn(property, version) {
	const conditions = property.displayOptions?.show?.['@version'];
	if (!conditions) return true;
	return conditions.some((condition) =>
		typeof condition === 'number' ? condition === version : version >= condition._cnd.gte,
	);
}

const properties = new NuvemShop().description.properties;

function propertiesOf(resource, operation, version = 2) {
	return properties.filter(
		(property) =>
			visibleIn(property, version) &&
			property.displayOptions?.show?.resource?.includes(resource) &&
			property.displayOptions?.show?.operation?.includes(operation),
	);
}

// Nomes de exibição das operações de um recurso, para o README citar cada uma.
function operationNames(resourceValue) {
	return resourceDefinitions
		.find((resource) => resource.value === resourceValue)
		.operations.map((operation) => operation.name);
}

module.exports = {
	NUVEMSHOP_WEBHOOK_EVENTS,
	NuvemShop,
	NuvemShopTrigger,
	credentials,
	editorContext,
	executeContext,
	executeDefinedOperation,
	findOperation,
	listSearch,
	operationNames,
	properties,
	propertiesOf,
	root,
	run,
	resourceDefinitions,
	visibleIn,
};
