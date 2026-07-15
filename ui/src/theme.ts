import { createContext, useContext } from 'react'

export interface BadgeTheme {
  bg: string
  fg: string
  border: string
}

export interface Theme {
  name: 'light' | 'dark'
  bg: string
  grid: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  pillBg: string
  pillBorder: string
  pillText: string
  plate: string
  plateOpacity: number
  gwBase: string
  gwCap: string
  gwEdge: string
  gwRing: string
  statusOk: string
  statusWarn: string
  statusCrash: string
  crashBadge: BadgeTheme
  pendingBadge: BadgeTheme
  shadowOpacity: number
  ambient: number
}

export const light: Theme = {
  name: 'light',
  bg: '#f6f6f3',
  grid: '#e4e3de',
  textPrimary: '#37352f',
  textSecondary: '#6f6e69',
  textMuted: '#9b9a94',
  pillBg: '#ffffff',
  pillBorder: '#e8e7e2',
  pillText: '#6f6e69',
  plate: '#ffffff',
  plateOpacity: 0.85,
  gwBase: '#ffffff',
  gwCap: '#37352f',
  gwEdge: '#d8d7d2',
  gwRing: '#c9c8c2',
  statusOk: '#1a7f52',
  statusWarn: '#8a6d1a',
  statusCrash: '#b3261e',
  crashBadge: { bg: '#fdf0ef', fg: '#b3261e', border: '#f2d5d2' },
  pendingBadge: { bg: '#fdf8ec', fg: '#8a6d1a', border: '#efe3c0' },
  shadowOpacity: 0.12,
  ambient: 0.75,
}

export const dark: Theme = {
  name: 'dark',
  bg: '#16181d',
  grid: '#262a32',
  textPrimary: '#e8e8e5',
  textSecondary: '#a4a49e',
  textMuted: '#73736e',
  pillBg: '#1e2127',
  pillBorder: '#2e323a',
  pillText: '#b9b9b3',
  plate: '#ffffff',
  plateOpacity: 0.06,
  gwBase: '#2a2e36',
  gwCap: '#d8d7d2',
  gwEdge: '#3a3f48',
  gwRing: '#3a3f48',
  statusOk: '#4fbf85',
  statusWarn: '#d9b04c',
  statusCrash: '#ff7a6c',
  crashBadge: { bg: '#3a201c', fg: '#ff8a7a', border: '#5a2c25' },
  pendingBadge: { bg: '#36301e', fg: '#d9b04c', border: '#514729' },
  shadowOpacity: 0.35,
  ambient: 0.95,
}

export const ThemeContext = createContext<Theme>(light)
export const useTheme = () => useContext(ThemeContext)
