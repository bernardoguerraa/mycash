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
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()

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
    // Refetch client-side for immediate UI update
    const fetchData = async () => {
      const contaIds = contas.map((c) => c.id_conta)
      if (contaIds.length === 0) return
      const { data } = await supabase
        .from('transacoes')
        .select('*')
        .in('id_conta', contaIds)
        .order('data_transacao', { ascending: false })
      if (data) setTransacoes(data)
    }
    fetchData()
  }, [contas, router, supabase])

  const handleDelete = async () => {
    if (!deletingTransacao) return
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('id_transacao', deletingTransacao.id_transacao)

    if (!error) {
      setTransacoes((prev) =>
        prev.filter((t) => t.id_transacao !== deletingTransacao.id_transacao)
      )
    }
    setDeletingTransacao(null)
    router.refresh()
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
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por descricao..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-3 text-sm text-gray-100 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Tipo filter */}
          <select
            value={filterTipo}
            onChange={(e) => {
              setFilterTipo(e.target.value as 'All' | TipoTransacao)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="All">Todos os Tipos</option>
            <option value="Entrada">Entrada</option>
            <option value="Saida">Saida</option>
          </select>

          {/* Categoria filter */}
          <select
            value={filterCategoria}
            onChange={(e) => {
              setFilterCategoria(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <span className="text-gray-500 text-sm">ate</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => {
              setFilterDateTo(e.target.value)
              setCurrentPage(1)
            }}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}

          {/* New transaction button */}
          <button
            onClick={handleOpenCreate}
            className="ml-auto flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Transacao
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        {filteredData.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 mb-4">
              <Inbox className="h-8 w-8 text-gray-600" />
            </div>
            <p className="text-lg font-medium text-gray-300">
              Nenhuma transacao encontrada
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {hasActiveFilters
                ? 'Tente ajustar os filtros ou limpar a busca.'
                : 'Clique em "Nova Transacao" para adicionar a primeira.'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={handleOpenCreate}
                className="mt-4 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova Transacao
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 font-medium text-gray-400">
                      <button
                        onClick={() => toggleSort('data_transacao')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        Data
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-400">Tipo</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Categoria</th>
                    <th className="px-4 py-3 font-medium text-gray-400">Descricao</th>
                    <th className="px-4 py-3 font-medium text-gray-400">
                      <button
                        onClick={() => toggleSort('valor')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        Valor
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-400">Conta</th>
                    <th className="px-4 py-3 font-medium text-gray-400 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {paginatedData.map((t) => (
                    <tr
                      key={t.id_transacao}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatDate(t.data_transacao)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            t.tipo === 'Entrada'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {t.tipo === 'Entrada' ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {t.tipo === 'Entrada' ? 'Entrada' : 'Saida'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{t.categoria}</td>
                      <td className="px-4 py-3 text-gray-100 max-w-[200px] truncate">
                        {t.descricao}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold whitespace-nowrap ${
                          t.tipo === 'Entrada' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {t.tipo === 'Entrada' ? '+' : '-'}
                        {formatCurrency(Math.abs(t.valor))}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {contaLabelMap[t.id_conta] ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="rounded-lg p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTransacao(t)}
                            className="rounded-lg p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
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
            <div className="md:hidden divide-y divide-gray-800">
              {paginatedData.map((t) => (
                <div key={t.id_transacao} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.tipo === 'Entrada'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {t.tipo === 'Entrada' ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {t.tipo === 'Entrada' ? 'Entrada' : 'Saida'}
                    </span>
                    <span
                      className={`font-semibold ${
                        t.tipo === 'Entrada' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {t.tipo === 'Entrada' ? '+' : '-'}
                      {formatCurrency(Math.abs(t.valor))}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-100">{t.descricao}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {t.categoria} &middot; {formatDate(t.data_transacao)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTransacao(t)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
              <p className="text-xs text-gray-500">
                Mostrando {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredData.length)} de{' '}
                {filteredData.length} transacoes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                        <span className="px-1 text-gray-600">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[32px] rounded-lg px-2 py-1 text-sm transition-colors ${
                          page === safeCurrentPage
                            ? 'bg-green-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
