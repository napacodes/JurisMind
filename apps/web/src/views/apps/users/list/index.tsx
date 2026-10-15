'use client'

// Component Imports
import { Card } from '@/components/ui/card'
import { UserPagination } from './user-pagination'
import { UserTable } from './user-table'
import { UserTableFilters } from './user-table-filters'
import { UserTableToolbar } from './user-table-toolbar'

// Hook Imports
import { useUserApp } from '@/hooks/use-user-app'

const UserListApp = () => {
  const {
    filters,
    paginatedUsers,
    totalPages,
    totalFilteredCount,
    showingFrom,
    showingTo,
    rowsPerPage,
    currentPage,
    sorting,
    handleFilterChange,
    handleSearchChange,
    handleRowsPerPageChange,
    handlePageChange,
    handleSortingChange
  } = useUserApp()

  return (
    <div className='flex flex-col gap-3 lg:gap-6'>
      <Card className='py-0 shadow-none'>
        <div className='w-full'>
          <div className='border-b'>
            <UserTableFilters filters={filters} onFilterChange={handleFilterChange} />
            <UserTableToolbar
              search={filters.search}
              rowsPerPage={rowsPerPage}
              onSearch={handleSearchChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
            <UserTable
              paginatedUsers={paginatedUsers}
              totalPages={totalPages}
              sorting={sorting}
              onSortingChange={handleSortingChange}
            />
          </div>

          <UserPagination
            showingFrom={showingFrom}
            showingTo={showingTo}
            total={totalFilteredCount}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </Card>
    </div>
  )
}

export default UserListApp
