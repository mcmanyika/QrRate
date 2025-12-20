'use client'

import { useEffect } from 'react'

export default function ErrorSuppressor() {
  useEffect(() => {
    // Suppress MetaMask connection errors from browser extensions
    const originalError = window.console.error
    const originalWarn = window.console.warn

    window.console.error = function(...args: any[]) {
      const message = args.join(' ')
      // Ignore MetaMask connection errors (these come from browser extensions, not our app)
      if (
        message.includes('Failed to connect to MetaMask') ||
        (message.includes('MetaMask') && message.includes('connect')) ||
        message.includes('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn')
      ) {
        return
      }
      originalError.apply(console, args)
    }

    window.console.warn = function(...args: any[]) {
      const message = args.join(' ')
      // Ignore MetaMask warnings
      if (
        message.includes('MetaMask') ||
        message.includes('chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn')
      ) {
        return
      }
      originalWarn.apply(console, args)
    }

    // Also catch unhandled promise rejections from MetaMask
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || '')
      if (
        message.includes('Failed to connect to MetaMask') ||
        message.includes('MetaMask') ||
        message.includes('ethereum')
      ) {
        event.preventDefault()
        return false
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.console.error = originalError
      window.console.warn = originalWarn
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}

