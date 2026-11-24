"use client"

import { useState, useCallback } from "react"

interface UseFormSubmitOptions {
  onSuccess?: (data: unknown) => void
  onError?: (error: string) => void
}

interface UseFormSubmitReturn {
  isLoading: boolean
  error: string | null
  success: string | null
  setError: (error: string | null) => void
  setSuccess: (success: string | null) => void
  clearMessages: () => void
  submitForm: <T>(
    url: string,
    data: unknown,
    options?: {
      method?: "POST" | "PUT" | "PATCH" | "DELETE"
      successMessage?: string
    }
  ) => Promise<T | null>
}

/**
 * Form submission hook with loading, error, and success state management
 *
 * Eliminates duplicated form submission logic across editor components
 */
export function useFormSubmit(options: UseFormSubmitOptions = {}): UseFormSubmitReturn {
  const { onSuccess, onError } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const submitForm = useCallback(
    async <T>(
      url: string,
      data: unknown,
      submitOptions: {
        method?: "POST" | "PUT" | "PATCH" | "DELETE"
        successMessage?: string
      } = {}
    ): Promise<T | null> => {
      const { method = "POST", successMessage } = submitOptions

      setIsLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const responseData = await response.json()
          throw new Error(responseData.error || `Request failed with status ${response.status}`)
        }

        const responseData = await response.json()

        if (successMessage) {
          setSuccess(successMessage)
        }

        onSuccess?.(responseData)
        return responseData as T
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred"
        setError(errorMessage)
        onError?.(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [onSuccess, onError]
  )

  return {
    isLoading,
    error,
    success,
    setError,
    setSuccess,
    clearMessages,
    submitForm,
  }
}

/**
 * File upload hook for handling FormData submissions
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async <T>(
      url: string,
      formData: FormData
    ): Promise<T | null> => {
      setIsUploading(true)
      setError(null)

      try {
        const response = await fetch(url, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to upload file")
        }

        return await response.json()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred"
        setError(errorMessage)
        return null
      } finally {
        setIsUploading(false)
      }
    },
    []
  )

  const downloadFile = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error("Failed to download file")

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download file")
    }
  }, [])

  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete file")
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file")
      return false
    }
  }, [])

  return {
    isUploading,
    error,
    setError,
    uploadFile,
    downloadFile,
    deleteFile,
  }
}
