/**
 * Navigation item and route definitions.
 */

import React from 'react'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  badge?: string
  description?: string
}

export type RoutePath =
  | '/'
  | '/login'
  | '/dashboard'
  | '/ask'
  | '/explain'
  | '/quiz'
  | '/summary'
  | '/learn'
  | '/settings'
