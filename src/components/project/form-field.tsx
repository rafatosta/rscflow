import * as React from "react"
import type { FieldError } from "react-hook-form"

export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: FieldError; children: React.ReactElement<{ "aria-invalid"?: boolean }> }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required && <span className="text-destructive"> *</span>}</span>{React.cloneElement(children, { "aria-invalid": Boolean(error) })}{error && <span className="text-sm text-destructive">{error.message}</span>}</label>
}
