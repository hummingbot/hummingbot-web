"use client"

import { useState, useCallback } from "react"

/**
 * Generic form data management hook
 *
 * Eliminates duplicated form state management across editor components
 */
export function useFormData<T extends Record<string, unknown>>(initialData: T) {
  const [formData, setFormData] = useState<T>(initialData)
  const [isDirty, setIsDirty] = useState(false)

  /**
   * Handle input change for standard inputs
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target
      const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value

      setFormData((prev) => ({
        ...prev,
        [name]: newValue,
      }))
      setIsDirty(true)
    },
    []
  )

  /**
   * Set a specific field value
   */
  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setIsDirty(true)
  }, [])

  /**
   * Set multiple field values at once
   */
  const setFields = useCallback((fields: Partial<T>) => {
    setFormData((prev) => ({
      ...prev,
      ...fields,
    }))
    setIsDirty(true)
  }, [])

  /**
   * Reset form to initial data
   */
  const reset = useCallback(() => {
    setFormData(initialData)
    setIsDirty(false)
  }, [initialData])

  /**
   * Reset dirty state (e.g., after save)
   */
  const clearDirty = useCallback(() => {
    setIsDirty(false)
  }, [])

  return {
    formData,
    setFormData,
    handleChange,
    setField,
    setFields,
    reset,
    isDirty,
    clearDirty,
  }
}

/**
 * Convert comma-separated string to array
 */
export function parseArrayField(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Convert array to comma-separated string
 */
export function formatArrayField(value: string[]): string {
  return value.join(", ")
}
