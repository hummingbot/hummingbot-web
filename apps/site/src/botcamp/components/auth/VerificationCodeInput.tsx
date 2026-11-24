"use client"

import { useState, useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from "react"
import { Input } from "@/botcamp/components/ui/input"
import { cn } from "@/botcamp/lib/utils"

interface VerificationCodeInputProps {
  length?: number
  onComplete: (code: string) => void
  disabled?: boolean
}

export function VerificationCodeInput({
  length = 6,
  onComplete,
  disabled = false,
}: VerificationCodeInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(0, 1)

    const newValues = [...values]
    newValues[index] = digit
    setValues(newValues)

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if complete
    if (newValues.every((v) => v !== "") && newValues.length === length) {
      onComplete(newValues.join(""))
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (values[index]) {
        // Clear current field
        const newValues = [...values]
        newValues[index] = ""
        setValues(newValues)
      } else if (index > 0) {
        // Move to previous field
        inputRefs.current[index - 1]?.focus()
      }
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)

    if (pasteData.length > 0) {
      const newValues = [...values]
      pasteData.split("").forEach((char, i) => {
        if (i < length) {
          newValues[i] = char
        }
      })
      setValues(newValues)

      // Focus last filled input or first empty one
      const lastFilledIndex = pasteData.length - 1
      if (lastFilledIndex < length - 1) {
        inputRefs.current[lastFilledIndex + 1]?.focus()
      } else {
        inputRefs.current[lastFilledIndex]?.focus()
      }

      // Check if complete
      if (newValues.every((v) => v !== "") && newValues.length === length) {
        onComplete(newValues.join(""))
      }
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-semibold",
            "focus:ring-2 focus:ring-primary"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}
