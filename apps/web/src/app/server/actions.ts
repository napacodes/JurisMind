/**
 * ! The server actions below are used to fetch the static data from the fake-db. If you're using an ORM
 * ! (Object-Relational Mapping) or a database, you can swap the code below with your own database queries.
 */
'use server'

// Data Imports
import { db as calendarDb } from '@/fake-db/apps/calendar'
import { db as mailDb } from '@/fake-db/apps/mail'
import { db as userProfileDb } from '@/fake-db/pages/user-profile'

// Calendar App Actions
export const getCalendarData = async () => {
  return calendarDb
}

// Mail App Actions
export const getMailData = async () => {
  return mailDb
}

// User Profile Actions
export const getProfileData = async () => userProfileDb
