/**
 * Prova a slice S5 do plano node-cli-campos-v2: o README segue o padrão completo do README do
 * RD Station CRM e o lançamento 1.2.0 está registrado no package.json e no CHANGELOG.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('S5 documentação e lançamento', () => {
	it('README tem as seções do padrão completo', () => {
		const readme = read('README.md');
		const headings = readme
			.split('\n')
			.filter((line) => /^## /.test(line))
			.map((line) => line.replace(/^## \S+\s+/u, '').toLowerCase());
		// Cada seção do padrão do RD Station CRM, como começo do título do README.
		const required = [
			'navegação',
			'funcionalidades',
			'instalação',
			'credenciais',
			'nós e operações',
			'trigger',
			'usar como tool de agente de ia',
			'exemplos',
			'desenvolvimento',
			'compatibilidade',
			'recursos',
			'publicação',
			'versões',
			'suporte',
			'apoie o projeto',
			'licença',
		];
		for (const section of required) {
			assert.ok(
				headings.some((heading) => heading.startsWith(section)),
				`falta a seção "${section}" no README`,
			);
		}
		// Selo do Buy Me a Coffee logo no topo, antes da primeira seção.
		const top = readme.slice(0, readme.indexOf('\n## '));
		assert.match(top, /img\.shields\.io\/badge\/Buy_Me_a_Coffee/);
		assert.match(top, /buymeacoffee\.com\/qTny0AzFXS/);
		// A seção de publicação explica a fila Staged Packages com aprovação 2FA.
		assert.match(readme, /Staged Packages/);
		assert.match(readme, /stage publish/);
	});

	it('versão 1.2.0 e CHANGELOG com a seção 1.2.0', () => {
		const pkg = JSON.parse(read('package.json'));
		const changelog = read('CHANGELOG.md');
		// A versão do pacote avança a cada lançamento: ela precisa ser a da entrada mais nova do
		// CHANGELOG (a 1.3.0 é provada em rotasNovasS6), e a seção 1.2.0 segue no histórico.
		assert.equal(pkg.version, changelog.split(/^## /m)[1].split(' ')[0]);
		const section = changelog.split(/^## /m).find((part) => part.startsWith('1.2.0'));
		assert.ok(section, 'CHANGELOG sem a seção ## 1.2.0');
		// Os itens do plano: toolchain, versão 2, os cinco seletores, datas, variantes e timeout.
		for (const term of [
			/node-cli`? 0\.55\.5/,
			/version 2/i,
			/Resource Locator/,
			/date/i,
			/variant/i,
			/timeout/i,
		]) {
			assert.match(section, term);
		}
		for (const id of ['product', 'category', 'order', 'customer', 'coupon']) {
			assert.match(section.toLowerCase(), new RegExp(id));
		}
		// A seção Versões do README também registra a 1.2.0.
		assert.match(read('README.md'), /\*\*1\.2\.0\*\*/);
	});
});
