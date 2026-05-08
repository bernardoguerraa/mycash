import type { Account, Transaction } from 'pluggy-sdk'

// Pluggy account.subtype → nosso tipo_conta
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  CHECKING_ACCOUNT: 'Corrente',
  SAVINGS_ACCOUNT: 'Poupanca',
  CREDIT_CARD: 'Cartao de Credito',
  LOAN: 'Emprestimo',
  INVESTMENT: 'Investimento',
}

export function mapAccountType(acc: Account): string {
  const sub = (acc as any).subtype as string | undefined
  if (sub && ACCOUNT_TYPE_MAP[sub]) return ACCOUNT_TYPE_MAP[sub]
  return acc.type === 'CREDIT' ? 'Cartao de Credito' : 'Corrente'
}

export function mapAccountNumber(acc: Account): string {
  const bank = (acc as any).bankData
  if (bank?.transferNumber) return String(bank.transferNumber)
  if ((acc as any).number) return String((acc as any).number)
  return acc.id.slice(0, 8)
}

// Pluggy tx é negativo = saída, positivo = entrada
export function mapTransactionTipo(tx: Transaction): 'Entrada' | 'Saida' {
  return tx.amount < 0 ? 'Saida' : 'Entrada'
}

export function mapTransactionCategoria(tx: Transaction): string {
  return tx.category || (tx.type === 'DEBIT' ? 'Outros (Saida)' : 'Outros (Entrada)')
}
