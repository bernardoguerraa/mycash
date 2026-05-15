import type { Account, Transaction } from 'pluggy-sdk'

// Campos retornados pela Pluggy mas ausentes do tipo público `Account`
interface PluggyAccountExtra {
  subtype?: string
  number?: string | number
  bankData?: { transferNumber?: string | number }
}
type AccountWithExtras = Account & PluggyAccountExtra

// Pluggy account.subtype → nosso tipo_conta
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  CHECKING_ACCOUNT: 'Corrente',
  SAVINGS_ACCOUNT: 'Poupanca',
  CREDIT_CARD: 'Cartao de Credito',
  LOAN: 'Emprestimo',
  INVESTMENT: 'Investimento',
}

export function mapAccountType(acc: Account): string {
  const sub = (acc as AccountWithExtras).subtype
  if (sub && ACCOUNT_TYPE_MAP[sub]) return ACCOUNT_TYPE_MAP[sub]
  return acc.type === 'CREDIT' ? 'Cartao de Credito' : 'Corrente'
}

export function mapAccountNumber(acc: Account): string {
  const extra = acc as AccountWithExtras
  const bank = extra.bankData
  if (bank?.transferNumber) return String(bank.transferNumber)
  if (extra.number) return String(extra.number)
  return acc.id.slice(0, 8)
}

// Pluggy tx é negativo = saída, positivo = entrada
export function mapTransactionTipo(tx: Transaction): 'Entrada' | 'Saida' {
  return tx.amount < 0 ? 'Saida' : 'Entrada'
}

export function mapTransactionCategoria(tx: Transaction): string {
  return tx.category || (tx.type === 'DEBIT' ? 'Outros (Saida)' : 'Outros (Entrada)')
}
