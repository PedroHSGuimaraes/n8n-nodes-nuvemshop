/**
 * Prova a slice S6 do plano rotas-novas (.specs/features/rotas-novas/plan.md). O nome de cada
 * teste é a linha que o checks.md espera ler.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const {
	NUVEMSHOP_WEBHOOK_EVENTS,
	NuvemShop,
	NuvemShopTrigger,
	editorContext,
	executeContext,
	executeDefinedOperation,
	findOperation,
	listSearch,
	operationNames,
	properties,
	propertiesOf,
	resourceDefinitions,
	root,
	run,
	visibleIn,
} = require('./helpers/rotasNovas.cjs');

describe('S6 Entrega da versão 1.3.0', () => {
	it('a versão é 1.3.0 e o CHANGELOG registra as rotas novas', () => {
		const pacote = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
		assert.equal(pacote.version, '1.3.0');
		const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
		const entrada = changelog.split('\n## ')[1];
		assert.match(entrada, /^1\.3\.0/);
		for (const termo of [
			/Price Table/,
			/13 .*webhook|13 .*event/i,
			/confirmation/i,
			/inventory_behaviour/,
			/IN_PREPARATION/,
			/Payment Option/,
		]) {
			assert.match(entrada, termo);
		}
	});

	it('o README documenta Price Table, as remoções e a Tool de IA', () => {
		const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
		assert.match(readme, /Price Table/);
		for (const operacao of operationNames('priceTable')) {
			assert.ok(readme.includes(operacao), `README sem ${operacao}`);
		}
		assert.match(readme, /Delete All Promotions/);
		assert.match(readme, /Delete Integration/);
		assert.match(readme, /Confirm Delete/);
		// A seção de Tool de IA é a última ocorrência do título; ela precisa citar Price Table.
		assert.match(readme.split('Tool de Agente de IA').pop() ?? '', /Price Table/);
	});

	it('o node continua usableAsTool e inclui priceTable', () => {
		const descricao = new NuvemShop().description;
		assert.equal(descricao.usableAsTool, true);
		const recurso = properties.find(
			(property) => property.name === 'resource' && property.type === 'options',
		);
		assert.ok(recurso.options.some((option) => option.value === 'priceTable'));
	});
});
