/** Auth cookie names — safe to import in edge (proxy) and node. No deps. */
export const ACCESS_COOKIE = 'svy_access'
export const REFRESH_COOKIE = 'svy_refresh'

/** Refresh-session lifetime in ms. Mirrors REFRESH_TOKEN_TTL (30 days) used by the JWT. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
