"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, Bus, Calendar, Search, MapPin, Clock, Moon, Sun, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import horaris from './data/horaris.json'
import rutes from './data/rutes.json'

const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'] as const
type DayOfWeek = typeof daysOfWeek[number]

type BusResult = {
  ruta_id: number;
  hora_salida: string;
  dia_semana: DayOfWeek;
}

type SpecialKeys =
  | 'laborables_excepte_agost_i_festius_bcn'
  | 'laborables_agost'
  | 'dissabtes_feiners'
  | 'diumenges_i_festius_excepte_bcn'
  | 'festius_locals_bcn'

type Horari = {
  ruta_id: number;
  estacion?: string;
  horarios?: { [key in DayOfWeek]: string[] };
  especial?: { [key in SpecialKeys]?: string[] };
  arribades?: { [key in SpecialKeys]?: string[] };
}

type Ruta = {
  id: number;
  origen: string;
  destino: string;
  latitud_origen: number;
  longitud_origen: number;
}

export default function BusScheduleApp() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Dilluns')
  const [schedule, setSchedule] = useState<BusResult[]>([])
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [fullSchedule, setFullSchedule] = useState<string[]>([])
  const [fullArrivals, setFullArrivals] = useState<string[]>([])
  const [noMoreBusesMessage, setNoMoreBusesMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [festiuBcn, setFestiuBcn] = useState(false)
  const [maintenance, setMaintenance] = useState(true)

  useEffect(() => {
    // Preferència del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mediaQuery.addEventListener ? mediaQuery.addEventListener('change', handleChange) : mediaQuery.addListener(handleChange)
    return () => {
      mediaQuery.removeEventListener ? mediaQuery.removeEventListener('change', handleChange) : mediaQuery.removeListener(handleChange)
    }
  }, [])

  const availableOrigins = useMemo(() => Array.from(new Set(rutes.map((ruta: Ruta) => ruta.origen))), [])
  
  const availableDestinations = useMemo(() => {
    if (!origin) return []
    return Array.from(new Set(rutes.filter((ruta: Ruta) => ruta.origen === origin).map(ruta => ruta.destino)))
  }, [origin])

  const handleSwap = useCallback(() => {
    const tempOrigin = origin;
    const tempDestination = destination;
    setOrigin(tempDestination);
    setDestination(tempOrigin);
    // Forçar l'actualització dels destins disponibles
    setTimeout(() => {
      setDestination(tempOrigin);
    }, 0);
  }, [origin, destination]);

  const getRutaIds = useCallback(() => {
    return rutes
      .filter((ruta: Ruta) => ruta.origen === origin && ruta.destino === destination)
      .map(ruta => ruta.id)
  }, [origin, destination])

  useEffect(() => {
    const currentDate = new Date()
    const today = daysOfWeek[currentDate.getDay()] as DayOfWeek
    setSelectedDay(today)
  }, [])

  useEffect(() => {
    setDestination('')
    setSchedule([])
    setFullSchedule([])
    setFullArrivals([])
    setNoMoreBusesMessage('')
    setShowFullSchedule(false)
  }, [origin])

  // Helper per obtenir la categoria activa segons dia/mes/switch
  const getActiveSpecialKey = useCallback((day: DayOfWeek, date: Date): SpecialKeys | null => {
    if (festiuBcn) return 'festius_locals_bcn'
    if (day === 'Dissabte') return 'dissabtes_feiners'
    if (day === 'Diumenge') return 'diumenges_i_festius_excepte_bcn'
    const month = date.getMonth() + 1 // 1..12
    if (month === 8) return 'laborables_agost'
    return 'laborables_excepte_agost_i_festius_bcn'
  }, [festiuBcn])

  const getActiveLabel = (key: SpecialKeys): string => {
    switch (key) {
      case 'laborables_excepte_agost_i_festius_bcn': return 'Feiners (excepte agost i festius BCN)'
      case 'laborables_agost': return 'Feiners (agost)'
      case 'dissabtes_feiners': return 'Dissabtes feiners'
      case 'diumenges_i_festius_excepte_bcn': return 'Diumenges i festius'
      case 'festius_locals_bcn': return 'Festius locals de Barcelona'
    }
  }

  const collectTimesForDay = useCallback((h: Horari, day: DayOfWeek, date: Date): string[] => {
    const specialKey = getActiveSpecialKey(day, date)
    if (h.especial && specialKey && h.especial[specialKey] && h.especial[specialKey]!.length) {
      return h.especial[specialKey] as string[]
    }
    // Fallback a esquema antic per dia
    return (h.horarios?.[day] ?? []) as string[]
  }, [getActiveSpecialKey])

  const collectArrivalsForDay = useCallback((h: Horari, day: DayOfWeek, date: Date): string[] => {
    const specialKey = getActiveSpecialKey(day, date)
    if (h.arribades && specialKey && h.arribades[specialKey] && h.arribades[specialKey]!.length) {
      return h.arribades[specialKey] as string[]
    }
    return []
  }, [getActiveSpecialKey])

  const handleSearch = () => {
    const currentDate = new Date()
    const currentHour = currentDate.getHours()
    const currentMinute = currentDate.getMinutes()
    const today = daysOfWeek[currentDate.getDay()] as DayOfWeek

    const rutaIds = getRutaIds()
    if (rutaIds.length === 0) {
      setNoMoreBusesMessage("No s'ha trobat cap ruta")
      setSchedule([])
      return
    }

    const results: BusResult[] = []

    ;(horaris as unknown as Horari[]).forEach((horari) => {
      if (rutaIds.includes(horari.ruta_id)) {
        const horariosForDay = collectTimesForDay(horari, today, currentDate)
        horariosForDay.forEach(hora_salida => {
          const [hours, minutes] = hora_salida.split(':').map(Number)
          if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
            results.push({ ruta_id: horari.ruta_id, hora_salida, dia_semana: today })
          }
        })
      }
    })
  
    results.sort((a, b) => {
      const [aHours, aMinutes] = a.hora_salida.split(':').map(Number)
      const [bHours, bMinutes] = b.hora_salida.split(':').map(Number)
      return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes)
    })
  
    const nextThreeBuses = results.slice(0, 3)
  
    if (nextThreeBuses.length === 0) {
      setNoMoreBusesMessage('No queden més autobusos disponibles per avui')
      setSchedule([])
    } else if (nextThreeBuses.length < 3) {
      setNoMoreBusesMessage('No queden més autobusos disponibles')
      setSchedule(nextThreeBuses)
    } else {
      setNoMoreBusesMessage('')
      setSchedule(nextThreeBuses)
    }
  
    setShowFullSchedule(false)
  }

  const handleShowFullSchedule = useCallback(() => {
    const rutaIds = getRutaIds()
    if (rutaIds.length === 0) {
      setFullSchedule([])
      setFullArrivals([])
      return
    }

    const refDate = new Date()
    const dayForView = selectedDay

    const allHorarios = (horaris as unknown as Horari[])
      .filter((h) => rutaIds.includes(h.ruta_id))
      .flatMap((h) => collectTimesForDay(h, dayForView, refDate))
      .sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number)
        const [bHours, bMinutes] = b.split(':').map(Number)
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes)
      })

    const allArrivals = (horaris as unknown as Horari[])
      .filter((h) => rutaIds.includes(h.ruta_id))
      .flatMap((h) => collectArrivalsForDay(h, dayForView, refDate))
      .sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number)
        const [bHours, bMinutes] = b.split(':').map(Number)
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes)
      })

    setFullSchedule(allHorarios)
    setFullArrivals(allArrivals)
    setShowFullSchedule(!showFullSchedule)
  }, [selectedDay, showFullSchedule, getRutaIds, collectTimesForDay, collectArrivalsForDay])

  // Force update when festiuBcn changes to refresh schedules
  useEffect(() => {
    if (showFullSchedule) {
      handleShowFullSchedule()
    }
  }, [festiuBcn, showFullSchedule, handleShowFullSchedule])

  const detectLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        let closestOrigin = ''
        let minDistance = Infinity

        rutes.forEach((ruta: Ruta) => {
          const distance = Math.sqrt(
            Math.pow(ruta.latitud_origen - latitude, 2) + Math.pow(ruta.longitud_origen - longitude, 2)
          )
          if (distance < minDistance) {
            minDistance = distance
            closestOrigin = ruta.origen
          }
        })
        setOrigin(closestOrigin)
        setLoading(false)
      }, () => setLoading(false))
    } else {
      setLoading(false)
    }
  }

  const toggleDarkMode = () => setDarkMode(!darkMode)

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  const canSearch = origin && destination

  // Informació d'avui per orientar l'usuari
  const todayInfo = useMemo(() => {
    const now = new Date()
    const today = daysOfWeek[now.getDay()] as DayOfWeek
    const key = getActiveSpecialKey(today, now)
    const category = key ? getActiveLabel(key) : today
    const dateStr = now.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long' })
    return { today, category, dateStr }
  }, [festiuBcn, getActiveSpecialKey])

  if (maintenance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="max-w-md rounded-xl border bg-card/80 p-6 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70">
          <h2 className="mb-4 text-lg font-semibold">Manteniment en curs</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Actualment estem realitzant tasques de manteniment. Si us plau, torna més tard.
          </p>
          <Button onClick={() => setMaintenance(false)} className="w-full">
            Tornar a l&apos;aplicació
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-background">
      {/* Fondo decorativo sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute inset-0 bg-[radial-gradient(20rem_20rem_at_10%_10%,hsl(var(--primary)/0.08),transparent),radial-gradient(24rem_24rem_at_90%_20%,hsl(var(--chart-2)/0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12"
      >
        {/* Encabezado */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Bus className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Busos del Penedès</h1>
              <p className="text-sm text-muted-foreground">Consulta horaris i planifica els teus trajectes.</p>
            </div>
          </div>
          <Button onClick={toggleDarkMode} variant="ghost" size="icon" aria-label="Canviar mode de color">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {/* Tarjeta principal */}
        <section className="rounded-2xl border bg-card/80 p-5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            {/* Origen */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="origen">Origen</label>
              <Select onValueChange={setOrigin} value={origin}>
                <SelectTrigger id="origen" className="h-11 w-full">
                  <SelectValue placeholder="Selecciona origen" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrigins.map((origen) => (
                    <SelectItem key={origen} value={origen}>
                      {origen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botón de intercambio */}
            <div className="flex justify-center sm:self-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSwap}
                className="mt-1 grid h-11 w-11 place-items-center rounded-full border bg-secondary text-primary shadow-sm transition-colors hover:bg-secondary/80"
                aria-label="Intercanviar origen i destinació"
              >
                <ArrowLeftRight className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="desti">Destinació</label>
              <Select onValueChange={setDestination} value={destination} disabled={!origin}>
                <SelectTrigger id="desti" className="h-11 w-full">
                  <SelectValue placeholder={origin ? 'Selecciona destinació' : 'Primer escull origen'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDestinations.map((destino) => (
                    <SelectItem key={destino} value={destino}>
                      {destino}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Día y acciones */}
          <div className="mt-4 space-y-3">
            {/* Fila 1: Selector de día */}
            <div>
              <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="dia">Dia</label>
              <Select onValueChange={(value) => setSelectedDay(value as DayOfWeek)} value={selectedDay}>
                <SelectTrigger id="dia" className="h-11 w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Selecciona un dia" />
                </SelectTrigger>
                <SelectContent>
                  {daysOfWeek.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Switch id="festiu-bcn" checked={festiuBcn} onCheckedChange={setFestiuBcn} />
                <label htmlFor="festiu-bcn">Festius locals BCN</label>
              </div>

              {/* Indicador d'avui i categoria activa */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center rounded-md border bg-muted/30 px-2.5 py-1">
                  <Calendar className="mr-2 h-4 w-4" /> Avui: {todayInfo.today} · {todayInfo.dateStr}
                </span>
                <span className="inline-flex items-center rounded-md border bg-muted/30 px-2.5 py-1">
                  <Clock className="mr-2 h-4 w-4" /> Categoria: {todayInfo.category}
                </span>
                <span className="inline-flex items-center rounded-md border bg-muted/30 px-2.5 py-1">
                  <Sun className="mr-2 h-4 w-4" /> Festiu BCN: {festiuBcn ? 'Sí' : 'No'}
                </span>
              </div>
            </div>

            {/* Fila 2: Botones de acciones */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Button
                onClick={handleShowFullSchedule}
                variant="outline"
                className="h-11 w-full"
              >
                {showFullSchedule ? 'Amaga horaris' : 'Mostra horaris'}
              </Button>

              <Button
                onClick={detectLocation}
                className="h-11 w-full"
                variant="secondary"
                disabled={loading}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {loading ? (
                  <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detectant…</span>
                ) : (
                  'Detectar ubicació'
                )}
              </Button>

              <Button
                onClick={handleSearch}
                className="h-11 w-full"
                disabled={!canSearch}
              >
                <Search className="mr-2 h-4 w-4" />
                Troba els propers 3 autobusos
              </Button>
            </div>
          </div>

          {/* Resultados próximos */}
          <AnimatePresence>
            {schedule.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                <h2 className="mb-3 text-lg font-semibold">Propers autobusos</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {schedule.map((bus, index) => (
                    <motion.div
                      key={`${bus.hora_salida}-${index}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-sm"
                    >
                      <span className="inline-flex items-center font-medium"><Clock className="mr-2 h-4 w-4 text-primary" />{bus.hora_salida}</span>
                      <span className="text-muted-foreground">{bus.dia_semana}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mensaje informativo */}
          {noMoreBusesMessage && (
            <p role="status" aria-live="polite" className="mt-4 text-center text-sm text-muted-foreground">{noMoreBusesMessage}</p>
          )}

          {/* Horario completo */}
          <AnimatePresence>
            {showFullSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                <h2 className="mb-3 text-lg font-semibold">
                  {(() => {
                    const key = getActiveSpecialKey(selectedDay, new Date())
                    return key ? `Horari complet (${getActiveLabel(key)})` : `Horari complet (${selectedDay})`
                  })()}
                </h2>
                {/* Sortides */}
                <div className="mb-3 text-sm font-medium text-muted-foreground">Sortides</div>
                <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
                  {fullSchedule.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {fullSchedule.map((time, index) => (
                        <motion.span
                          key={`${time}-${index}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm"
                        >
                          <Clock className="mr-2 h-4 w-4 text-primary" /> {time}
                        </motion.span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hi ha horaris disponibles</p>
                  )}
                </div>

                {/* Arribades de referència */}
                {fullArrivals.length > 0 && (
                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium text-muted-foreground">
                      Arribades (referència){destination ? ` · a ${destination}` : ''}
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {fullArrivals.map((time, index) => (
                          <motion.span
                            key={`arr-${time}-${index}`}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm"
                          >
                            <Clock className="mr-2 h-4 w-4 text-primary" /> {time}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Pie de página sutil */}
        <p className="mt-6 text-center text-xs text-muted-foreground">Dades locals. Sense connexió amb servidor.</p>
      </motion.main>
    </div>
  )
}