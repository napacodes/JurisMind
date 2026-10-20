export const LOGIN_SUCCESS_TOAST_MESSAGE = 'Welcome back! You are now logged in. 🚀'

const STORAGE_KEY = 'jurismind:login-success-toast'
const SIGNAL_LIFETIME_MS = 60_000

export type LoginToastStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type LoginSuccessSignal = {
  destination: string
  expiresAt: number
}

export function queueLoginSuccessToast(
  destination: string,
  storage: LoginToastStorage = window.sessionStorage,
  now = Date.now(),
): void {
  try {
    const signal: LoginSuccessSignal = { destination, expiresAt: now + SIGNAL_LIFETIME_MS }
    storage.setItem(STORAGE_KEY, JSON.stringify(signal))
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function consumeLoginSuccessToast(
  currentRoute: string,
  storage: LoginToastStorage = window.sessionStorage,
  now = Date.now(),
): boolean {
  try {
    const serialized = storage.getItem(STORAGE_KEY)
    if (!serialized) return false

    let signal: LoginSuccessSignal
    try {
      signal = JSON.parse(serialized) as LoginSuccessSignal
    } catch {
      storage.removeItem(STORAGE_KEY)
      return false
    }

    if (typeof signal.destination !== 'string' || typeof signal.expiresAt !== 'number' || signal.expiresAt <= now) {
      storage.removeItem(STORAGE_KEY)
      return false
    }

    const destination = signal.destination.split('#', 1)[0]
    if (destination !== currentRoute) return false

    storage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}