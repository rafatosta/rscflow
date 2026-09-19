import * as React from "react"

export function useUnsavedFormProtection(isDirty: boolean) {
  React.useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", protect)
    return () => window.removeEventListener("beforeunload", protect)
  }, [isDirty])
}
