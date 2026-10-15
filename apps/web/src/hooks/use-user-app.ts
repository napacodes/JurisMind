'use client'

// React Imports
import { useCallback, useMemo, useState } from 'react'

// Type Imports
import type {
  AppUser,
  UserFilters,
  UserFormData,
  UserSheetMode,
  UserSortColumn,
  UserSorting,
  UserStatus
} from '@/types/apps/user-types'

// Data Imports
import { users as seedUsers } from '@/fake-db/apps/users'

const DEFAULT_FILTERS: UserFilters = {
  role: 'all',
  plan: 'all',
  status: 'all',
  search: ''
}

const DEFAULT_ROWS_PER_PAGE = 10
const DEFAULT_CURRENT_PAGE = 1

const filterUsers = (users: AppUser[], filters: UserFilters): AppUser[] => {
  const normalizedSearch = filters.search.trim().toLowerCase()

  return users.filter(user => {
    if (filters.role !== 'all' && user.role !== filters.role) {
      return false
    }

    if (filters.plan !== 'all' && user.plan !== filters.plan) {
      return false
    }

    if (filters.status !== 'all' && user.status !== filters.status) {
      return false
    }

    if (normalizedSearch) {
      const matchesName = user.name.toLowerCase().includes(normalizedSearch)
      const matchesEmail = user.email.toLowerCase().includes(normalizedSearch)

      if (!matchesName && !matchesEmail) {
        return false
      }
    }

    return true
  })
}

const compareUsers = (a: AppUser, b: AppUser, column: UserSortColumn): number => {
  switch (column) {
    case 'user':
      return a.name.localeCompare(b.name)
    case 'role':
      return a.role.localeCompare(b.role)
    case 'plan':
      return a.plan.localeCompare(b.plan)
    case 'billing':
      return a.billing.localeCompare(b.billing)
    case 'status':
      return a.status.localeCompare(b.status)
    case 'joinedDate':
      return new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime()
    default:
      return 0
  }
}

const sortUsers = (users: AppUser[], sorting: UserSorting | null): AppUser[] => {
  if (!sorting) {
    return users
  }

  return [...users].sort((a, b) => {
    const comparison = compareUsers(a, b, sorting.id)

    return sorting.desc ? -comparison : comparison
  })
}

const buildNewUser = (data: UserFormData): AppUser => ({
  id: crypto.randomUUID(),
  name: data.name.trim(),
  email: data.email.trim(),
  role: data.role,
  plan: data.plan,
  status: data.status,
  billing: 'Manual',
  company: data.company?.trim() || undefined,
  country: data.country?.trim() || undefined,
  contact: data.contact?.trim() || undefined,
  joinedDate: new Date().toISOString()
})

const removeIdsFromSelection = (selectedUserIds: string[], ids: string[]): string[] => {
  const idSet = new Set(ids)

  return selectedUserIds.filter(id => !idSet.has(id))
}

export function useUserApp() {
  const [users, setUsers] = useState<AppUser[]>(seedUsers)
  const [filters, setFiltersState] = useState<UserFilters>(DEFAULT_FILTERS)
  const [rowsPerPage, setRowsPerPageState] = useState(DEFAULT_ROWS_PER_PAGE)
  const [currentPage, setCurrentPage] = useState(DEFAULT_CURRENT_PAGE)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [sorting, setSorting] = useState<UserSorting | null>(null)
  const [sheetMode, setSheetMode] = useState<UserSheetMode | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      activeUsers: users.filter(user => user.status === 'Active').length,
      pendingUsers: users.filter(user => user.status === 'Pending').length,
      paidUsers: users.filter(user => user.plan !== 'Basic').length
    }),
    [users]
  )

  const filteredUsers = useMemo(() => filterUsers(users, filters), [filters, users])

  const sortedUsers = useMemo(() => sortUsers(filteredUsers, sorting), [filteredUsers, sorting])

  const totalFilteredCount = sortedUsers.length

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalFilteredCount / rowsPerPage)),
    [rowsPerPage, totalFilteredCount]
  )

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage

    return sortedUsers.slice(startIndex, startIndex + rowsPerPage)
  }, [currentPage, rowsPerPage, sortedUsers])

  const showingFrom = totalFilteredCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1

  const showingTo = Math.min(currentPage * rowsPerPage, totalFilteredCount)

  const editingUser = useMemo(() => users.find(user => user.id === editingUserId) ?? null, [editingUserId, users])

  const paginatedUserIds = useMemo(() => paginatedUsers.map(user => user.id), [paginatedUsers])

  const isAllSelected = paginatedUsers.length > 0 && paginatedUserIds.every(id => selectedUserIds.includes(id))

  const isIndeterminate = paginatedUserIds.some(id => selectedUserIds.includes(id)) && !isAllSelected

  // Vars
  // Converts string[] → Record<string, boolean> for TanStack controlled selection
  const rowSelection = Object.fromEntries(selectedUserIds.map(id => [id, true]))

  const handleFilterChange = useCallback((nextFilters: Partial<UserFilters>) => {
    setFiltersState(prev => ({ ...prev, ...nextFilters }))
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setFiltersState(prev => ({ ...prev, search }))
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handleRowsPerPageChange = useCallback((n: number) => {
    setRowsPerPageState(n)
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSortingChange = useCallback((nextSorting: UserSorting | null) => {
    setSorting(nextSorting)
    setCurrentPage(DEFAULT_CURRENT_PAGE)
  }, [])

  const handleSelectUser = useCallback((id: string) => {
    setSelectedUserIds(prev => (prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]))
  }, [])

  const handleSelectAll = useCallback((userIds: string[]) => {
    setSelectedUserIds(prev => {
      const allSelected = userIds.length > 0 && userIds.every(id => prev.includes(id))

      if (allSelected) {
        return removeIdsFromSelection(prev, userIds)
      }

      return [...new Set([...prev, ...userIds])]
    })
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedUserIds([])
  }, [])

  const handleAddUser = useCallback((data: UserFormData) => {
    const newUser = buildNewUser(data)

    setUsers(prev => [...prev, newUser])
    setSheetMode(null)
    setEditingUserId(null)
  }, [])

  const handleUpdateUser = useCallback((id: string, data: Partial<UserFormData>) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === id
          ? {
              ...user,
              ...data,
              name: data.name?.trim() ?? user.name,
              email: data.email?.trim() ?? user.email,
              company: data.company?.trim() ?? user.company,
              country: data.country?.trim() ?? user.country,
              contact: data.contact?.trim() ?? user.contact
            }
          : user
      )
    )
    setSheetMode(null)
    setEditingUserId(null)
  }, [])

  const handleDeleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id))
    setSelectedUserIds(prev => removeIdsFromSelection(prev, [id]))
  }, [])

  const handleBulkDelete = useCallback(() => {
    setUsers(prev => prev.filter(user => !selectedUserIds.includes(user.id)))
    setSelectedUserIds(prev => removeIdsFromSelection(prev, selectedUserIds))
  }, [selectedUserIds])

  const handleUpdateStatus = useCallback((id: string, status: UserStatus) => {
    setUsers(prev => prev.map(user => (user.id === id ? { ...user, status } : user)))
  }, [])

  const handleBulkUpdateStatus = useCallback(
    (status: UserStatus) => {
      setUsers(prev => prev.map(user => (selectedUserIds.includes(user.id) ? { ...user, status } : user)))
    },
    [selectedUserIds]
  )

  const handleOpenAddSheet = useCallback(() => {
    setSheetMode('add')
    setEditingUserId(null)
  }, [])

  const handleOpenEditSheet = useCallback((userId: string) => {
    setSheetMode('edit')
    setEditingUserId(userId)
  }, [])

  const handleCloseSheet = useCallback(() => {
    setSheetMode(null)
    setEditingUserId(null)
  }, [])

  return {
    users,
    stats,
    filters,
    paginatedUsers,
    filteredUsers,
    sortedUsers,
    totalPages,
    totalFilteredCount,
    showingFrom,
    showingTo,
    rowsPerPage,
    currentPage,
    selectedUserIds,
    isAllSelected,
    isIndeterminate,
    rowSelection,
    sorting,
    sheetMode,
    editingUser,
    handleFilterChange,
    handleSearchChange,
    handleRowsPerPageChange,
    handlePageChange,
    handleSortingChange,
    handleSelectUser,
    handleSelectAll,
    handleClearSelection,
    handleAddUser,
    handleUpdateUser,
    handleDeleteUser,
    handleBulkDelete,
    handleUpdateStatus,
    handleBulkUpdateStatus,
    handleOpenAddSheet,
    handleOpenEditSheet,
    handleCloseSheet
  }
}
