'use client'

// React Imports
import { useState } from 'react'

// Component Imports
import { AddEditUserSheet } from '@/views/apps/users/dialogs/add-edit-user-sheet'
import { UserViewLeftPanel } from './user-view-left-panel'
import { UserViewTabs } from './user-view-tabs'

// Data Imports
import { users } from '@/fake-db/apps/users'

const STATIC_USER = users[0]

const UserViewApp = () => {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)

  return (
    <>
      <div className='relative grid grid-cols-1 gap-6 lg:grid-cols-[350px_minmax(0,1fr)]'>
        <UserViewLeftPanel user={STATIC_USER} onEdit={() => setIsEditSheetOpen(true)} />
        <UserViewTabs user={STATIC_USER} />
      </div>

      <AddEditUserSheet
        mode={isEditSheetOpen ? 'edit' : null}
        user={STATIC_USER}
        onClose={() => setIsEditSheetOpen(false)}
        onAdd={() => {}}
        onEdit={() => setIsEditSheetOpen(false)}
      />
    </>
  )
}

export default UserViewApp
