/**
 * Leitura única do ID de um parâmetro de caminho (plano node-cli-campos-v2, AD-009).
 *
 * Na versão 1 do node o ID é um texto (ou um dropdown). Na versão 2 os cinco IDs principais
 * (produto, categoria, pedido, cliente e cupom) são Resource Locator e chegam como
 * `{ mode, value }`. Todo código que precisa do ID passa por `readIdValue`, para as duas
 * versões devolverem o mesmo texto e a regra existir em um lugar só.
 */
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/** Dados de um tipo de ID que vira Resource Locator na versão 2. */
export interface IdKind {
	/** Rótulo do campo no editor, em inglês como o resto da interface. */
	label: string;
	/** Frase usada na mensagem de campo vazio ("Choose an order ..."). */
	indefinite: string;
	/** Nome do método de busca em `methods.listSearch`. */
	searchMethod: string;
}

/**
 * Chave: `displayName` do parâmetro de caminho nas definições de operação.
 * Só estes cinco têm rota de listagem com busca confirmada na doc da Nuvemshop; os demais IDs
 * (local, variante, webhook e o resto) seguem como estão (ver "Out of scope" do plano).
 */
export const ID_KINDS: Record<string, IdKind> = {
	'Product ID': { label: 'Product', indefinite: 'a product', searchMethod: 'searchProducts' },
	'Category ID': { label: 'Category', indefinite: 'a category', searchMethod: 'searchCategories' },
	'Order ID': { label: 'Order', indefinite: 'an order', searchMethod: 'searchOrders' },
	'Customer ID': { label: 'Customer', indefinite: 'a customer', searchMethod: 'searchCustomers' },
	'Coupon ID': { label: 'Coupon', indefinite: 'a coupon', searchMethod: 'searchCoupons' },
};

/**
 * Devolve o ID em texto, sem espaço nas pontas, venha ele como texto, número ou Resource Locator.
 * O Resource Locator manda o ID em `value`, nos dois modos (`list` e `id`).
 */
export function readIdValue(raw: unknown): string {
	if (raw !== null && typeof raw === 'object' && 'value' in raw) {
		return String((raw as { value: unknown }).value ?? '').trim();
	}
	return String(raw ?? '').trim();
}

/** Lê o parâmetro de caminho do item e devolve o ID em texto (vazio quando não foi preenchido). */
export function getIdParameter(
	context: IExecuteFunctions,
	parameterName: string,
	itemIndex: number,
): string {
	return readIdValue(context.getNodeParameter(parameterName, itemIndex, ''));
}

/**
 * Erro de Resource Locator vazio na versão 2. A tela do n8n acrescenta " [item N]" à mensagem
 * a partir do `itemIndex`, por isso o texto aqui não repete o índice.
 */
export function emptyLocatorError(
	context: IExecuteFunctions,
	kind: IdKind,
	itemIndex: number,
): NodeOperationError {
	return new NodeOperationError(context.getNode(), `The '${kind.label}' parameter is empty`, {
		itemIndex,
		description: `Choose ${kind.indefinite} from the list or paste its ID`,
	});
}
