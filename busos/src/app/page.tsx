"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, Bus, Calendar, Search, MapPin, Moon, Sun, Loader2, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Countdown } from '@/components/Countdown'
import {
  DAYS_OF_WEEK,
  findClosestOrigin,
  getActiveCalendarKey,
  getActiveLabel,
  getCurrentDay,
  getFullScheduleTimes,
  getUpcomingBuses,
  parseHorarisData,
  type BusResult,
  type DayOfWeek,
  type Ruta,
} from '@/lib/schedule/scheduleService'
import horarisData from './data/horaris.json'
import rutes from './data/rutes.json'

const fullData = parseHorarisData(horarisData)
const STORAGE_KEYS = {
  origin: 'busos:origin',
  destination: 'busos:destination',
  day: 'busos:day',
  festiu: 'busos:festiu',
  theme: 'busos:theme',
} as const

const isValidDay = (value: string | null): value is DayOfWeek =>
  Boolean(value) && DAYS_OF_WEEK.includes(value as DayOfWeek)

const parseBoolean = (value: string | null): boolean | null => {
  if (value === null) return null
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return null
}

export default function BusScheduleApp() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Dilluns')
  const [schedule, setSchedule] = useState<BusResult[]>([])
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [fullSchedule, setFullSchedule] = useState<string[]>([])
  const [noMoreBusesMessage, setNoMoreBusesMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [darkMode, setDarkMode] = useState(true)
  const [festiuBcn, setFestiuBcn] = useState(false)
  const [busStatuses, setBusStatuses] = useState<Record<string, 'green' | 'orange' | 'red'>>({})

  // Derived from rutes.json which we updated to contain valid pairs
  const availableOrigins = useMemo(() => Array.from(new Set(rutes.map((ruta: Ruta) => ruta.origen))), [])
  const getDestinationsForOrigin = useCallback(
    (originValue: string) => Array.from(new Set(rutes.filter((ruta: Ruta) => ruta.origen === originValue).map((ruta) => ruta.destino))),
    []
  )

  const availableDestinations = useMemo(() => {
    if (!origin) return []
    return getDestinationsForOrigin(origin)
  }, [origin, getDestinationsForOrigin])

  const resetSearchState = useCallback(() => {
    setSchedule([])
    setFullSchedule([])
    setNoMoreBusesMessage('')
    setShowFullSchedule(false)
    setBusStatuses({})
  }, [])

  const handleOriginChange = useCallback((newOrigin: string) => {
    setOrigin(newOrigin)
    setDestination('')
    resetSearchState()
  }, [resetSearchState])

  const handleSwap = useCallback(() => {
    if (!origin || !destination) return
    const tempOrigin = origin
    const tempDestination = destination
    setOrigin(tempDestination)
    setDestination(tempOrigin)
    resetSearchState()
  }, [origin, destination, resetSearchState])

  const handleResetFilters = useCallback(() => {
    setOrigin('')
    setDestination('')
    setSelectedDay(getCurrentDay())
    setFestiuBcn(false)
    setLocationError('')
    resetSearchState()
  }, [resetSearchState])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const query = new URLSearchParams(window.location.search)
    const queryOrigin = query.get('o')
    const queryDestination = query.get('d')
    const queryDay = query.get('day')
    const queryFestiu = query.get('festiu')
    const queryTheme = query.get('theme')

    const storedOrigin = localStorage.getItem(STORAGE_KEYS.origin)
    const storedDestination = localStorage.getItem(STORAGE_KEYS.destination)
    const storedDay = localStorage.getItem(STORAGE_KEYS.day)
    const storedFestiu = localStorage.getItem(STORAGE_KEYS.festiu)
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme)

    const preferredOrigin = queryOrigin ?? storedOrigin
    const initialOrigin = preferredOrigin && availableOrigins.includes(preferredOrigin) ? preferredOrigin : ''

    const destinationOptions = initialOrigin ? getDestinationsForOrigin(initialOrigin) : []
    const preferredDestination = queryDestination ?? storedDestination
    const initialDestination = preferredDestination && destinationOptions.includes(preferredDestination) ? preferredDestination : ''

    const preferredDay = queryDay ?? storedDay
    const initialDay = isValidDay(preferredDay) ? preferredDay : getCurrentDay()

    const festiu = parseBoolean(queryFestiu ?? storedFestiu) ?? false

    const preferredTheme = queryTheme ?? storedTheme
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDarkMode = preferredTheme === 'dark' ? true : preferredTheme === 'light' ? false : systemPrefersDark

    setOrigin(initialOrigin)
    setDestination(initialDestination)
    setSelectedDay(initialDay)
    setFestiuBcn(festiu)
    setDarkMode(initialDarkMode)
    setIsInitialized(true)
  }, [availableOrigins, getDestinationsForOrigin])

  const handleSearch = () => {
    resetSearchState()
    const { buses, message } = getUpcomingBuses({
      data: fullData,
      origin,
      destination,
      selectedDay,
      festiuBcn,
    })

    if (message) {
      setNoMoreBusesMessage(message)
      return
    }

    setSchedule(buses)
  }

  const handleShowFullSchedule = useCallback(() => {
    if (showFullSchedule) {
      setShowFullSchedule(false)
      return
    }

    if (!origin || !destination) {
      setNoMoreBusesMessage("Selecciona origen i destinació per veure l'horari complet")
      setFullSchedule([])
      setShowFullSchedule(false)
      return
    }

    const { times, message } = getFullScheduleTimes({
      data: fullData,
      origin,
      destination,
      selectedDay,
      festiuBcn,
    })

    if (message) {
      setNoMoreBusesMessage(message)
      setFullSchedule([])
      setShowFullSchedule(false)
      return
    }

    setNoMoreBusesMessage('')
    setFullSchedule(times)
    setShowFullSchedule(true)

  }, [origin, destination, selectedDay, festiuBcn, showFullSchedule]);

  const detectLocation = () => {
    setLoading(true)
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('El teu navegador no permet geolocalització')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords
      const closestOrigin = findClosestOrigin(rutes as Ruta[], latitude, longitude)

      if (!closestOrigin) {
        setLocationError("No s'ha pogut determinar una parada propera")
        setLoading(false)
        return
      }

      setOrigin(closestOrigin)
      setDestination('')
      resetSearchState()
      setLoading(false)
    }, (error) => {
      const geolocationMessage = {
        1: "Has denegat l'accés a la ubicació",
        2: "No s'ha pogut obtenir la ubicació",
        3: "S'ha esgotat el temps per obtenir la ubicació",
      }[error.code] ?? "No s'ha pogut obtenir la ubicació"

      setLocationError(geolocationMessage)
      setLoading(false)
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    })
  }

  const toggleDarkMode = () => setDarkMode(!darkMode)

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    if (typeof window !== 'undefined' && isInitialized) {
      localStorage.setItem(STORAGE_KEYS.theme, darkMode ? 'dark' : 'light')
    }
  }, [darkMode, isInitialized])

  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return

    if (origin) localStorage.setItem(STORAGE_KEYS.origin, origin)
    else localStorage.removeItem(STORAGE_KEYS.origin)

    if (destination) localStorage.setItem(STORAGE_KEYS.destination, destination)
    else localStorage.removeItem(STORAGE_KEYS.destination)

    localStorage.setItem(STORAGE_KEYS.day, selectedDay)
    localStorage.setItem(STORAGE_KEYS.festiu, festiuBcn ? '1' : '0')

    const params = new URLSearchParams(window.location.search)

    if (origin) params.set('o', origin)
    else params.delete('o')

    if (destination) params.set('d', destination)
    else params.delete('d')

    params.set('day', selectedDay)

    if (festiuBcn) params.set('festiu', '1')
    else params.delete('festiu')

    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname
    const currentUrl = `${window.location.pathname}${window.location.search}`

    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, '', nextUrl)
    }
  }, [origin, destination, selectedDay, festiuBcn, isInitialized])

  const canSearch = Boolean(origin && destination)
  const canReset = Boolean(origin || destination || festiuBcn || selectedDay !== getCurrentDay())
  const routeSummary = origin && destination
    ? `${origin} → ${destination}`
    : 'Selecciona un origen i una destinació'

  const dayInfo = useMemo(() => {
    const now = new Date()
    const today = getCurrentDay(now)
    const selectedKey = getActiveCalendarKey(selectedDay, now, festiuBcn)
    const dateStr = now.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long' })
    return {
      today,
      dateStr,
      isSelectedToday: selectedDay === today,
      selectedCategory: getActiveLabel(selectedKey),
    }
  }, [selectedDay, festiuBcn])

  const getBadgeStyles = (status: 'green' | 'orange' | 'red' | 'scheduled') => {
    switch (status) {
      case 'red':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      case 'orange':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      case 'scheduled':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300'
      default:
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
    }
  }

  const getBadgeText = (status: 'green' | 'orange' | 'red' | 'scheduled') => {
    switch (status) {
      case 'red':
        return 'Imminent'
      case 'orange':
        return 'Aviat'
      case 'scheduled':
        return 'Programat'
      default:
        return 'En hora'
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="fixed inset-0 -z-20 app-mesh-background" />
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-8%] left-[-8%] h-[480px] w-[480px] rounded-full bg-primary/20 blur-[120px] dark:bg-primary/10 animate-pulse-slow" />
        <div className="absolute bottom-[-8%] right-[-8%] h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[130px] dark:bg-cyan-400/10 animate-pulse-slow delay-1000" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8 sm:px-6 app-fade-in">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary backdrop-blur-sm">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Busos Penedès</h1>
              <p className="text-xs text-muted-foreground">Horaris actualitzats</p>
              <p className="mt-1 inline-flex max-w-[270px] truncate rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {routeSummary}
              </p>
            </div>
          </div>
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-primary/5"
            aria-label={darkMode ? 'Canvia a mode clar' : 'Canvia a mode fosc'}
            title={darkMode ? 'Canvia a mode clar' : 'Canvia a mode fosc'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </header>

        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-black/45">
          <div className="mb-6 rounded-2xl border border-border/60 bg-background/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Consulta activa</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{routeSummary}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Origen</label>
              <Select onValueChange={handleOriginChange} value={origin}>
                <SelectTrigger aria-label="Selecciona origen" className="h-12 rounded-2xl border-0 bg-background/50 px-4 shadow-sm backdrop-blur-sm transition-all hover:bg-background/80 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/20 backdrop-blur-xl">
                  {availableOrigins.map((origen) => (
                    <SelectItem key={origen} value={origen} className="rounded-lg focus:bg-primary/10">
                      {origen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex justify-center py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40"></div>
              </div>
              <Button
                onClick={handleSwap}
                variant="outline"
                size="icon"
                className="relative h-10 w-10 rounded-full border border-border/40 bg-background shadow-sm transition-transform hover:scale-110 hover:bg-background"
                aria-label="Intercanvia origen i destinació"
                title="Intercanvia origen i destinació"
              >
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Destinació</label>
              <Select onValueChange={setDestination} value={destination} disabled={!origin}>
                <SelectTrigger aria-label="Selecciona destinació" className="h-12 rounded-2xl border-0 bg-background/50 px-4 shadow-sm backdrop-blur-sm transition-all hover:bg-background/80 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder={origin ? 'Selecciona destinació' : 'Primer escull origen'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/20 backdrop-blur-xl">
                  {availableDestinations.map((destino) => (
                    <SelectItem key={destino} value={destino} className="rounded-lg focus:bg-primary/10">
                      {destino}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Dia del viatge</span>
              </div>
              <Select onValueChange={(value) => setSelectedDay(value as DayOfWeek)} value={selectedDay}>
                <SelectTrigger aria-label="Selecciona dia del viatge" className="h-9 w-[140px] rounded-lg border-0 bg-background/50 shadow-none backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day} className="rounded-lg">
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                <span>Festiu a BCN?</span>
              </div>
              <Switch aria-label="Marcar com festiu a Barcelona" checked={festiuBcn} onCheckedChange={setFestiuBcn} />
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              <p>Avui és <span className="font-medium text-foreground">{dayInfo.today}</span> ({dayInfo.dateStr})</p>
              <p>Consulta: <span className="font-medium text-foreground">{selectedDay}</span> · <span className="font-medium text-foreground">{dayInfo.selectedCategory}</span></p>
              {!dayInfo.isSelectedToday && (
                <p>Per dies futurs només es mostra l&apos;hora programada (sense compte enrere).</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Button
              onClick={handleSearch}
              aria-label="Cerca els propers busos"
              className="h-12 w-full rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
              disabled={!canSearch}
            >
              <Search className="mr-2 h-5 w-5" />
              Cercar Busos
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleShowFullSchedule}
                variant="secondary"
                className="h-10 rounded-xl bg-secondary/50 hover:bg-secondary/80"
                disabled={!canSearch}
              >
                {showFullSchedule ? 'Amagar Tot' : 'Veure Tot'}
              </Button>
              <Button
                onClick={detectLocation}
                variant="secondary"
                className="h-10 rounded-xl bg-secondary/50 hover:bg-secondary/80"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                <span className="ml-2">Ubicació</span>
              </Button>
            </div>
            <Button
              onClick={handleResetFilters}
              variant="ghost"
              className="h-9 rounded-xl border border-border/50 bg-background/40 text-xs hover:bg-background/70"
              disabled={!canReset}
            >
              Reinicia filtres
            </Button>
            {locationError && (
              <p role="alert" aria-live="assertive" className="px-1 text-xs text-red-600 dark:text-red-400">{locationError}</p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {schedule.length > 0 && (
            <div className="space-y-3 app-fade-up">
              <h3 className="px-1 text-sm font-medium text-muted-foreground">Propers busos</h3>

              {schedule.map((bus, index) => {
                const statusKey = `${bus.hora_salida}-${index}`
                const badgeStatus = bus.isToday ? (busStatuses[statusKey] || 'green') : 'scheduled'

                return (
                  <div
                    key={`${bus.hora_salida}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/45 px-5 py-4 shadow-sm backdrop-blur-md dark:bg-white/5 app-fade-up"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          {bus.isToday ? (
                            <>
                              <Countdown
                                targetTime={bus.hora_salida}
                                onStatusChange={(status) =>
                                  setBusStatuses((prev) => {
                                    if (prev[statusKey] === status) return prev
                                    return { ...prev, [statusKey]: status }
                                  })
                                }
                              />
                              <span className="text-xs text-muted-foreground">({bus.hora_salida})</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold tabular-nums tracking-tight">{bus.hora_salida}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{bus.dia_semana}</p>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-medium ${getBadgeStyles(badgeStatus)}`}>
                      {getBadgeText(badgeStatus)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {noMoreBusesMessage && (
            <div role="status" aria-live="polite" className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center app-fade-up">
              <p className="text-sm text-muted-foreground">{noMoreBusesMessage}</p>
            </div>
          )}

          {schedule.length === 0 && !noMoreBusesMessage && !showFullSchedule && (
            <div className="rounded-2xl border border-border/60 bg-background/60 p-6 text-center app-fade-up">
              <p className="text-sm font-medium text-foreground">Escull trajecte i prem Cercar Busos</p>
              <p className="mt-1 text-xs text-muted-foreground">També pots usar Ubicació per seleccionar l&apos;origen automàticament.</p>
            </div>
          )}

          {showFullSchedule && (
            <div className="overflow-hidden rounded-3xl border border-white/30 bg-white/60 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/40 app-fade-up">
              <div className="p-6">
                <h3 className="mb-4 font-semibold">Horari Complet</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {fullSchedule.map((time, i) => (
                    <div key={i} className="rounded-lg bg-background/50 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
                      {time}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground/60">
            Dades locals. Sense connexió amb servidor.
          </p>
        </footer>
      </main>
    </div>
  )
}
