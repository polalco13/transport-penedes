"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, Bus, Calendar, Search, MapPin, Clock, Moon, Sun, Loader2, Info } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Countdown } from '@/components/Countdown'
import horarisData from './data/horaris.json'
import rutes from './data/rutes.json'

// --- Types for new data structure ---

type Salida = {
  [key: string]: string | null;
}

type Calendario = {
  descripcion: string;
  salidas: Salida[];
}

type Calendarios = {
  laborables_invierno?: Calendario;
  laborables_agosto?: Calendario;
  sabados_laborables?: Calendario;
  domingos_y_festivos?: Calendario;
}

type RutaDef = {
  origen: string;
  destino: string;
  paradas_orden: string[];
  calendarios: Calendarios;
}

type HorariosAutobus = {
  [key: string]: RutaDef;
}

type FullData = {
  horarios_autobus: HorariosAutobus;
}

// Cast imported JSON to the correct type
const fullData = horarisData as FullData;

// --- App Logic ---

const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'] as const
type DayOfWeek = typeof daysOfWeek[number]

type BusResult = {
  hora_salida: string;
  dia_semana: DayOfWeek;
  ruta_key: string;
}

type Ruta = {
  id: number;
  origen: string;
  destino: string;
  latitud_origen: number;
  longitud_origen: number;
}

const stopKeyMap: { [key: string]: string } = {
  "Estació d'autobusos Sants": "sants",
  "Estació d'autobusos de Sants": "sants",
  "Av. Diagonal (Mª Cristina)": "ma_cristina",
  "Av. Diagonal (Palau Reial)": "palau_reial",
  "Av. Diagonal (Zona Universitària)": "zona_uni",
  "Estació d'autobusos Vilafranca": "vilafranca",
  "Estació d'autobusos de Vilafranca": "vilafranca"
};

export default function BusScheduleApp() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Dilluns')
  const [schedule, setSchedule] = useState<BusResult[]>([])
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [fullSchedule, setFullSchedule] = useState<string[]>([])
  const [noMoreBusesMessage, setNoMoreBusesMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [festiuBcn, setFestiuBcn] = useState(false)
  const [busStatuses, setBusStatuses] = useState<Record<string, 'green' | 'orange' | 'red'>>({})

  useEffect(() => {
    // Check system preference initially
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(isDark);
    }
  }, [])

  // Derived from rutes.json which we updated to contain valid pairs
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
  }, [origin, destination]);

  useEffect(() => {
    const currentDate = new Date()
    const today = daysOfWeek[currentDate.getDay()] as DayOfWeek
    setSelectedDay(today)
  }, [])

  useEffect(() => {
    setDestination('')
    setSchedule([])
    setFullSchedule([])
    setNoMoreBusesMessage('')
    setShowFullSchedule(false)
  }, [origin])

  // Helper to get the active calendar key
  const getActiveCalendarKey = useCallback((day: DayOfWeek, date: Date): keyof Calendarios => {
    if (day === 'Diumenge') return 'domingos_y_festivos';
    if (day === 'Dissabte') return 'sabados_laborables';

    if (festiuBcn) return 'domingos_y_festivos';

    const month = date.getMonth() + 1; // 1..12
    if (month === 8) return 'laborables_agosto';

    return 'laborables_invierno';
  }, [festiuBcn]);

  const getActiveLabel = (key: keyof Calendarios): string => {
    switch (key) {
      case 'laborables_invierno': return 'Feiners (hivern)';
      case 'laborables_agosto': return 'Feiners (agost)';
      case 'sabados_laborables': return 'Dissabtes feiners';
      case 'domingos_y_festivos': return 'Diumenges i festius';
      default: return key;
    }
  }

  const findRouteKey = useCallback((origin: string, destination: string): string | null => {
    for (const [key, ruta] of Object.entries(fullData.horarios_autobus)) {
      const originIndex = ruta.paradas_orden.indexOf(origin);
      const destIndex = ruta.paradas_orden.indexOf(destination);

      if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
        return key;
      }
    }
    return null;
  }, []);

  const handleSearch = () => {
    const currentDate = new Date()
    const currentHour = currentDate.getHours()
    const currentMinute = currentDate.getMinutes()

    const isToday = selectedDay === daysOfWeek[currentDate.getDay()];
    const calendarKey = getActiveCalendarKey(selectedDay, currentDate);

    const routeKey = findRouteKey(origin, destination);

    if (!routeKey) {
      setNoMoreBusesMessage("No s'ha trobat cap ruta per a aquest trajecte");
      setSchedule([]);
      return;
    }

    const ruta = fullData.horarios_autobus[routeKey];
    const calendar = ruta.calendarios[calendarKey];

    if (!calendar) {
      setNoMoreBusesMessage("No hi ha horaris per a aquest dia");
      setSchedule([]);
      return;
    }

    const originKey = stopKeyMap[origin];
    if (!originKey) {
      setNoMoreBusesMessage("Error intern: parada desconeguda");
      return;
    }

    const results: BusResult[] = [];

    calendar.salidas.forEach(salida => {
      const time = salida[originKey];
      if (time) {
        if (isToday) {
          const [hours, minutes] = time.split(':').map(Number);
          if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
            results.push({ hora_salida: time, dia_semana: selectedDay, ruta_key: routeKey });
          }
        } else {
          results.push({ hora_salida: time, dia_semana: selectedDay, ruta_key: routeKey });
        }
      }
    });

    results.sort((a, b) => {
      const [aHours, aMinutes] = a.hora_salida.split(':').map(Number);
      const [bHours, bMinutes] = b.hora_salida.split(':').map(Number);
      return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
    });

    const nextThreeBuses = results.slice(0, 3);

    if (nextThreeBuses.length === 0) {
      setNoMoreBusesMessage(isToday ? 'No queden més autobusos disponibles per avui' : 'No hi ha autobusos disponibles');
      setSchedule([]);
    } else {
      setNoMoreBusesMessage('');
      setSchedule(nextThreeBuses);
    }

    setShowFullSchedule(false);
  }

  const handleShowFullSchedule = useCallback(() => {
    const routeKey = findRouteKey(origin, destination);
    if (!routeKey) {
      setFullSchedule([]);
      return;
    }

    const refDate = new Date();
    const calendarKey = getActiveCalendarKey(selectedDay, refDate);
    const ruta = fullData.horarios_autobus[routeKey];
    const calendar = ruta.calendarios[calendarKey];

    if (!calendar) {
      setFullSchedule([]);
      setShowFullSchedule(!showFullSchedule);
      return;
    }

    const originKey = stopKeyMap[origin];
    if (!originKey) {
      setFullSchedule([]);
      return;
    }

    const times = calendar.salidas
      .map(s => s[originKey])
      .filter((t): t is string => t !== null && t !== undefined)
      .sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number);
        const [bHours, bMinutes] = b.split(':').map(Number);
        return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
      });

    setFullSchedule(times);
    setShowFullSchedule(!showFullSchedule);

  }, [origin, destination, selectedDay, showFullSchedule, findRouteKey, getActiveCalendarKey]);

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

  const todayInfo = useMemo(() => {
    const now = new Date()
    const today = daysOfWeek[now.getDay()] as DayOfWeek
    const key = getActiveCalendarKey(today, now)
    const category = getActiveLabel(key)
    const dateStr = now.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long' })
    return { today, category, dateStr }
  }, [getActiveCalendarKey])

  const getBadgeStyles = (status: 'green' | 'orange' | 'red') => {
    switch (status) {
      case 'red':
        return 'bg-red-500/10 text-red-600 dark:text-red-400'
      case 'orange':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
      default:
        return 'bg-green-500/10 text-green-600 dark:text-green-400'
    }
  }

  const getBadgeText = (status: 'green' | 'orange' | 'red') => {
    switch (status) {
      case 'red':
        return 'Imminent'
      case 'orange':
        return 'Aviat'
      default:
        return 'En hora'
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/20">
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] mix-blend-screen dark:bg-primary/10 dark:mix-blend-normal animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px] mix-blend-screen dark:bg-blue-500/10 dark:mix-blend-normal animate-pulse-slow delay-1000" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8 sm:px-6"
      >
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary backdrop-blur-sm">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Busos Penedès</h1>
              <p className="text-xs text-muted-foreground">Horaris actualitzats</p>
            </div>
          </div>
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-primary/5"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </header>

        {/* Main Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 p-6 shadow-2xl backdrop-blur-xl dark:border-white/5 dark:bg-black/40">

          {/* Route Selection */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Origen</label>
              <Select onValueChange={setOrigin} value={origin}>
                <SelectTrigger className="h-12 rounded-2xl border-0 bg-background/50 px-4 shadow-sm backdrop-blur-sm transition-all hover:bg-background/80 focus:ring-2 focus:ring-primary/20">
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
              >
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Destinació</label>
              <Select onValueChange={setDestination} value={destination} disabled={!origin}>
                <SelectTrigger className="h-12 rounded-2xl border-0 bg-background/50 px-4 shadow-sm backdrop-blur-sm transition-all hover:bg-background/80 focus:ring-2 focus:ring-primary/20">
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

          {/* Settings & Info */}
          <div className="mt-6 space-y-4 rounded-2xl bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Dia del viatge</span>
              </div>
              <Select onValueChange={(value) => setSelectedDay(value as DayOfWeek)} value={selectedDay}>
                <SelectTrigger className="h-9 w-[140px] rounded-lg border-0 bg-background/50 shadow-none backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {daysOfWeek.map((day) => (
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
              <Switch checked={festiuBcn} onCheckedChange={setFestiuBcn} />
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              <p>Avui és <span className="font-medium text-foreground">{todayInfo.today}</span> ({todayInfo.dateStr})</p>
              <p>Horari aplicat: <span className="font-medium text-foreground">{todayInfo.category}</span></p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 grid gap-3">
            <Button
              onClick={handleSearch}
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
          </div>

        </div>

        {/* Results Section */}
        <div className="mt-6 space-y-4">
          <AnimatePresence mode="wait">
            {schedule.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-3"
              >
                <h3 className="px-1 text-sm font-medium text-muted-foreground">Propers busos</h3>

                {schedule.map((bus, index) => (
                  <motion.div
                    key={`${bus.hora_salida}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/40 px-5 py-4 shadow-sm backdrop-blur-md dark:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Bus className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <Countdown 
                            targetTime={bus.hora_salida} 
                            onStatusChange={(status) => setBusStatuses(prev => ({ ...prev, [`${bus.hora_salida}-${index}`]: status }))}
                          />
                          <span className="text-xs text-muted-foreground">({bus.hora_salida})</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{bus.dia_semana}</p>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-medium ${getBadgeStyles(busStatuses[`${bus.hora_salida}-${index}`] || 'green')}`}>
                      {getBadgeText(busStatuses[`${bus.hora_salida}-${index}`] || 'green')}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {noMoreBusesMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/30 p-6 text-center"
            >
              <p className="text-sm text-muted-foreground">{noMoreBusesMessage}</p>
            </motion.div>
          )}

          <AnimatePresence>
            {showFullSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-3xl border border-white/20 bg-white/60 shadow-xl backdrop-blur-xl dark:bg-black/40"
              >
                <div className="p-6">
                  <h3 className="mb-4 font-semibold">Horari Complet</h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {fullSchedule.map((time, i) => (
                      <div key={i} className="rounded-lg bg-background/50 py-2 text-center text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
                        {time}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground/60">
            Dades locals. Sense connexió amb servidor.
          </p>
        </footer>
      </motion.main>
    </div>
  )
}