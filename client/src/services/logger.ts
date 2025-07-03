class Logger {
  private static instance: Logger
  private debugEnabled: boolean

  private constructor() {
    // Default based on environment
    const isDevelopment = import.meta.env.MODE === 'development'
    this.debugEnabled = isDevelopment
    
    // Load from localStorage if available
    const savedSetting = localStorage.getItem('debug-logging-enabled')
    if (savedSetting !== null) {
      this.debugEnabled = savedSetting === 'true'
    }
    
    console.log(`🐛 Debug logging ${this.debugEnabled ? 'enabled' : 'disabled'} (environment: ${import.meta.env.MODE})`)
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled
    localStorage.setItem('debug-logging-enabled', enabled.toString())
    console.log(`🐛 Debug logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  isDebugEnabled(): boolean {
    return this.debugEnabled
  }

  // Game-specific logging methods
  gameStateChange(data: any): void {
    if (this.debugEnabled) {
      console.log('🔄 State changed:', data)
    }
  }

  gameComponentUpdate(data: any): void {
    if (this.debugEnabled) {
      console.log('🔄 Game component received state update:', data)
    }
  }

  gamePhaseChange(oldPhase: string | undefined, newPhase: string): void {
    if (this.debugEnabled) {
      console.log(`🎮 Game phase changed: ${oldPhase} → ${newPhase}`)
    }
  }

  gameMounted(): void {
    if (this.debugEnabled) {
      console.log('🎮 Game component mounted, setting up state subscription')
    }
  }

  gameUnmounted(): void {
    if (this.debugEnabled) {
      console.log('🎮 Game component unmounting, cleaning up subscriptions')
    }
  }

  computedProperty(name: string, value: any): void {
    if (this.debugEnabled) {
      console.log(`🔢 ${name} computed:`, value)
    }
  }

  clickSent(): void {
    if (this.debugEnabled) {
      console.log('🖱️ Click sent to server')
    }
  }

  clickIgnored(): void {
    if (this.debugEnabled) {
      console.log('⚠️ Click ignored - game not in playing phase or not connected')
    }
  }

  // General logging methods
  info(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data) {
        console.log(message, data)
      } else {
        console.log(message)
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.debugEnabled) {
      if (data) {
        console.warn(message, data)
      } else {
        console.warn(message)
      }
    }
  }

  error(message: string, data?: any): void {
    // Errors are always logged regardless of debug setting
    if (data) {
      console.error(message, data)
    } else {
      console.error(message)
    }
  }
}

export const logger = Logger.getInstance()