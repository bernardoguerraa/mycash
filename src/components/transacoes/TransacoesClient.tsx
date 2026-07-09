'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
} from 'lucide-react'
import { TipoTransacao } from '@/types/database'
import TransacaoModal from './TransacaoModal'
import DeleteConfirmModal from './DeleteConfirmModal'
import { api } from '@/lib/api/client'
import { useRouter } from 'next/navigation'

interface Transacao {
  id_transacao: number
  id_conta: number
  data_transacao: string
  tipo: TipoTransacao
  categoria: string
  descricao: string
  valor: number
}

interface ContaOption {
  id_conta: number
  label: string
}

interface Props {
  initialTransacoes: Transacao[]
  contas: ContaOption[]
}

const ITEMS_PER_PAGE = 10

const CATEGORIAS = [
  'Alimentacao',
  'Transporte',
  'Moradia',
  'Saude',
  'Educacao',
  'Lazer',
  'Salario',
  'Freelance',
  'Investimento',
  'Outros',
]

type SortField = 'data_transacao' | 'valor'
type SortDir = 'asc' | 'desc'

export default function TransacoesClient({ initialTransacoes, contas }: Props) {
  const router = useRouter()

  const [transacoes, setTransacoes] = useState<Transacao[]>(initialTransacoes)

  // Filters
  const [filterTipo, setFilterTipo] = useState<'All' | TipoTransacao>('All')
  const [filterCategoria, setFilterCategoria] = useState<string>('All')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('data_transacao')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editingTransacao, setEditingTransacao] = useState<Transacao | null>(null)
  const [deletingTransacao, setDeletingTransacao] = useState<Transacao | null>(null)

  // Derive unique categories from data
  const allCategories = useMemo(() => {
    const fromData = transacoes.map((t) => t.categoria)
    const merged = Array.from(new Set([...CATEGORIAS, ...fromData]))
    return merged.sort()
  }, [transacoes])

  // Conta lookup
  const contaLabelMap = useMemo(() => {
    const map: Record<number, string> = {}
    contas.forEach((c) => {
      map[c.id_conta] = c.label
    })
    return map
  }, [contas])

  // Filtered + sorted data
  const filteredData = useMemo(() => {
    let result = [...transacoes]

    if (filterTipo !== 'All') {
      result = result.filter((t) => t.tipo === filterTipo)
    }

    if (filterCategoria !== 'All') {
      result = result.filter((t) => t.categoria === filterCategoria)
    }

    if (filterDateFrom) {
      result = result.filter((t) => t.data_transacao >= filterDateFrom)
    }

    if (filterDateTo) {
      const toEnd = filterDateTo + 'T23:59:59'
      result = result.filter((t) => t.data_transacao <= toEnd)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.descricao.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'data_transacao') {
        cmp = a.data_transacao.localeCompare(b.data_transacao)
      } else {
        cmp = a.valor - b.valor
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [transacoes, filterTipo, filterCategoria, filterDateFrom, filterDateTo, searchQuery, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedData = filteredData.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  )

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const handleOpenCreate = () => {
    setEditingTransacao(null)
    setShowModal(true)
  }

  const handleOpenEdit = (t: Transacao) => {
    setEditingTransacao(t)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingTransacao(null)
  }

  const handleSaved = useCallback(() => {
    setShowModal(false)
    setEditingTransacao(null)
    router.refresh()
    // Refetch via API para atualizar UI imediatamente
    api.transacoes
      .list({ limit: 500 })
      .then((data) => setTransacoes(data))
      .catch(() => {
        // Falha na refetch nao deveria bloquear a UI — router.refresh() cobre
      })
  }, [router])

  // Lazy update: remove da UI imediatamente; se o backend recusar, restaura.
  const handleDelete = async () => {
    if (!deletingTransacao) return
    const id = deletingTransacao.id_transacao
    const snapshot = transacoes
    setTransacoes((prev) => prev.filter((t) => t.id_transacao !== id))
    setDeletingTransacao(null)
    try {
      await api.transacoes.delete(id)
      router.refresh()
    } catch (err) {
      console.error('Falha ao excluir transacao — revertendo:', err)
      setTransacoes(snapshot)
    }
  }

  const resetFilters = () => {
    setFilterTipo('All')
    setFilterCategoria('All')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    filterTipo !== 'All' ||
    filterCategoria !== 'All' ||
    filterDateFrom !== '' ||
    filterDateTo !== '' ||
    searchQuery !== ''

  return (
    <>
      {/* Filter Bar */}
      <div className="card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-edge-2 bg-surface-3 py-2 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Tipo filter */}
          <select
            value={filterTipo}
            onChange={(e) => {
              setFilterTipo(e.target.value as 'All' | TipoTransacao)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">Todos os Tipos</option>
            <option value="Entrada">Entrada</option>
            <option value="Saida">Saída</option>
          </select>

          {/* Categoria filter */}
          <select
            value={filterCategoria}
            onChange={(e) => {
              setFilterCategoria(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">Todas as Categorias</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => {
              setFilterDateFrom(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <span className="text-zinc-500 text-sm">até</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-edge-2 bg-surface-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:border-edge-3 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}

          {/* New transaction button */}
          <button
            onClick={handleOpenCreate}
            className="btn-primary ml-auto flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-2xl overflow-hidden">
        {filteredData.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3 mb-4">
              <Inbox className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="text-lg font-medium text-zinc-300">
              Nenhuma transação encontrada
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou limpar a busca.'
                : 'Clique em "Nova Transação" para adicionar a primeira.'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={handleOpenCreate}
                className="btn-primary mt-4 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Transação
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge-1 text-left">
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <button
                        onClick={() => toggleSort('data_transacao')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        Data
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Tipo</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Categoria</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Descrição</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      <button
                        onClick={() => toggleSort('valor')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        Valor
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Conta</th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-1">
                  {paginatedData.map((t) => (
                    <tr
                      key={t.id_transacao}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                        {formatDate(t.data_transacao)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.tipo === 'Entrada'
                              ? 'bg-emerald-500/[0.08] text-emerald-400'
                              : 'bg-rose-500/[0.08] text-rose-400'
                          }`}
                        >
                          {t.tipo === 'Entrada' ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {t.tipo === 'Entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{t.categoria}</td>
                      <td className="px-4 py-3 text-zinc-100 max-w-[200px] truncate">
                        {t.descricao}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold font-mono-nums whitespace-nowrap ${
                          t.tipo === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.tipo === 'Entrada' ? '+' : '-'}
                        {formatCurrency(Math.abs(t.valor))}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {contaLabelMap[t.id_conta] ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-white/[0.04] transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTransacao(t)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-edge-1">
              {paginatedData.map((t) => (
                <div key={t.id_transacao} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.tipo === 'Entrada'
                          ? 'bg-emerald-500/[0.08] text-emerald-400'
                          : 'bg-rose-500/[0.08] text-rose-400'
                      }`}
                    >
                      {t.tipo === 'Entrada' ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {t.tipo === 'Entrada' ? 'Entrada' : 'Saída'}
                    </span>
                    <span
                      className={`font-semibold font-mono-nums ${
                        t.tipo === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.tipo === 'Entrada' ? '+' : '-'}
                      {formatCurrency(Math.abs(t.valor))}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{t.descricao}</p>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>
                      {t.categoria} &middot; {formatDate(t.data_transacao)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTransacao(t)}
                        className="rounded-lg p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-edge-1 px-4 py-3">
              <p className="text-xs text-zinc-500">
                Mostrando {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredData.length)} de{' '}
                {filteredData.length} transações
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - safeCurrentPage) <= 1
                  )
                  .map((page, idx, arr) => (
                    <span key={page}>
                      {idx > 0 && arr[idx - 1] !== page - 1 && (
                        <span className="px-1 text-zinc-600">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] rounded-lg px-2 py-1 text-sm transition-colors ${
                          page === safeCurrentPage
                            ? 'bg-emerald-500 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <TransacaoModal
          contas={contas}
          transacao={editingTransacao}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {deletingTransacao && (
        <DeleteConfirmModal
          descricao={deletingTransacao.descricao}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTransacao(null)}
        />
      )}
    </>
  )
}
