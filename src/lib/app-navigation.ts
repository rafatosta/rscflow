function normalizeBasePath(basePath: string) {
  const path = basePath.replace(/^\/+|\/+$/g, "")
  return path ? `/${path}/` : "/"
}

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL)

export function appHref(path: string, basePath = APP_BASE_PATH) {
  const base = normalizeBasePath(basePath)
  return path === "/" ? base : `${base}${path.replace(/^\/+/, "")}`
}

export function appPathname(pathname: string, basePath = APP_BASE_PATH) {
  const base = normalizeBasePath(basePath)
  if (base === "/") return pathname

  const baseWithoutTrailingSlash = base.slice(0, -1)
  if (pathname === base || pathname === baseWithoutTrailingSlash) return "/"
  if (pathname.startsWith(base)) return `/${pathname.slice(base.length)}`
  return pathname
}
