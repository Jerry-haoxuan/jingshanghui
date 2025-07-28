'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { getAutocompleteSuggestions } from '@/lib/locationData'

interface AutocompleteInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suggestions: string[]
  required?: boolean
  className?: string
}

export function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  required,
  className
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (value) {
      const filtered = getAutocompleteSuggestions(value, suggestions)
      setFilteredSuggestions(filtered)
      setIsOpen(filtered.length > 0)
    } else {
      setIsOpen(false)
    }
  }, [value, suggestions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setActiveSuggestionIndex(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => 
        Math.min(prev + 1, filteredSuggestions.length - 1)
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSuggestions[activeSuggestionIndex]) {
        onChange(filteredSuggestions[activeSuggestionIndex])
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === activeSuggestionIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="text-sm">
                {suggestion.split(new RegExp(`(${value})`, 'gi')).map((part, i) => (
                  <span key={i}>
                    {part.toLowerCase() === value.toLowerCase() ? (
                      <strong className="font-semibold text-blue-600">{part}</strong>
                    ) : (
                      part
                    )}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 