'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, Bus, Calendar, Search, MapPin, Clock, Moon, Sun } from 'lucide-react'
import horaris from './data/horaris.json'
import rutes from './data/rutes.json'

const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'] as const
type DayOfWeek = typeof daysOfWeek[number]

type Horari = {
  ruta_id: number;
  horarios: { [key in DayOfWeek]: string[] };
}

type Ruta = {
  id: number;
  origen: string;
  destino: string;
  latitud_origen: number;
  longitud_origen: number;
}

type BusResult = {
  ruta_id: number;
  hora_salida: string;
  dia_semana: DayOfWeek;
}

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

  useEffect(() => {
    // Comprobar la preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(prefersDark)

    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches)
    mediaQuery.addListener(handleChange)

    return () => mediaQuery.removeListener(handleChange)
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
    // Forzar la actualización de los destinos disponibles
    setTimeout(() => {
      setDestination(tempOrigin);
    }, 0);
  }, [origin, destination]);

  const getRutaIds = () => {
    return rutes
      .filter((ruta: Ruta) => ruta.origen === origin && ruta.destino === destination)
      .map(ruta => ruta.id)
  }

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

  const handleSearch = () => {
    const currentDate = new Date()
    const currentHour = currentDate.getHours()
    const currentMinute = currentDate.getMinutes()
    const today = daysOfWeek[currentDate.getDay()] as DayOfWeek
  
    const rutaIds = getRutaIds()
    if (rutaIds.length === 0) {
      setNoMoreBusesMessage("No se ha encontrado la ruta")
      setSchedule([])
      return
    }
  
    const results: BusResult[] = []
  
    horaris.forEach((horari: Horari) => {
      if (rutaIds.includes(horari.ruta_id)) {
        const horariosForDay = horari.horarios[today] || []
        
        horariosForDay.forEach(hora_salida => {
          const [hours, minutes] = hora_salida.split(':').map(Number)
          if (hours > currentHour || (hours === currentHour && minutes > currentMinute)) {
            results.push({
              ruta_id: horari.ruta_id,
              hora_salida: hora_salida,
              dia_semana: today
            })
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
      setNoMoreBusesMessage("No queden més autobusos disponibles per avui")
      setSchedule([])
    } else if (nextThreeBuses.length < 3) {
      setNoMoreBusesMessage("No quedan més autobusos disponibles")
      setSchedule(nextThreeBuses)
    } else {
      setNoMoreBusesMessage('')
      setSchedule(nextThreeBuses)
    }
  
    setShowFullSchedule(false)
  }

  const handleShowFullSchedule = () => {
    const rutaIds = getRutaIds()
    if (rutaIds.length === 0) {
      setFullSchedule([])
      return
    }
  
    const allHorarios = horaris
      .filter((horari: Horari) => rutaIds.includes(horari.ruta_id))
      .flatMap((horari: Horari) => horari.horarios[selectedDay] || [])
      .sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number)
        const [bHours, bMinutes] = b.split(':').map(Number)
        return aHours * 60 + aMinutes - (bHours * 60 + bMinutes)
      })
  
    setFullSchedule(allHorarios)
    setShowFullSchedule(!showFullSchedule)
  }

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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'} p-4`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Bus className={`w-12 h-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mr-4`} />
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Busos del Penedès</h1>
          </div>
          <Button onClick={toggleDarkMode} variant="ghost" size="icon" className={darkMode ? 'text-yellow-400' : 'text-gray-600'}>
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Select onValueChange={setOrigin} value={origin}>
              <SelectTrigger className={`w-full sm:w-40 border-gray-300 ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}>
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                {availableOrigins.map((origen) => (
                  <SelectItem key={origen} value={origen}>
                    {origen}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSwap}
              className={`p-3 ${darkMode ? 'bg-blue-900' : 'bg-blue-100'} rounded-full transition-colors duration-200 ${darkMode ? 'hover:bg-blue-800' : 'hover:bg-blue-200'}`}
              aria-label="Intercanviar origen i destinació"
            >
              <ArrowLeftRight className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </motion.button>

            <Select onValueChange={setDestination} value={destination} disabled={!origin}>
              <SelectTrigger className={`w-full sm:w-40 border-gray-300 ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}>
                <SelectValue placeholder="Destinació" />
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

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button onClick={handleSearch} className={`w-full ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors duration-200 text-lg py-6`}>
              <Search className="w-5 h-5 mr-2" />
              Troba els propers 3 autobusos
            </Button>
          </motion.div>

          <Select onValueChange={(value) => setSelectedDay(value as DayOfWeek)} value={selectedDay}>
            <SelectTrigger className={`w-full border-gray-300 ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900'} focus:ring-blue-500 focus:border-blue-500`}>
              <Calendar className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
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

          <AnimatePresence>
            {schedule.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Propers Autobusos</h2>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-4 rounded-lg ${darkMode ? 'border-gray-600' : 'border-blue-200'} border`}>
                  {schedule.map((bus, index) => (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-center mb-3 text-lg`}
                    >
                      <Clock className={`w-5 h-5 mr-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      {bus.hora_salida} - {bus.dia_semana}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {noMoreBusesMessage && (
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-4 text-center`}>{noMoreBusesMessage}</p>
          )}

          <div className="flex flex-col sm:flex-row justify-between mt-6 space-y-4 sm:space-y-0 sm:space-x-4">
            <Button onClick={handleShowFullSchedule} className={`w-full sm:w-auto ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} transition-colors duration-200 py-6`}>
              {showFullSchedule ? 'Amaga Horaris' : 'Mostra Horaris'}
            </Button>
            <Button onClick={detectLocation} className={`w-full sm:w-auto ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors duration-200 py-6`} disabled={loading}>
              <MapPin className="w-5 h-5 mr-2" />
              {loading ? 'Detectant...' : 'Detectar Ubicació'}
            </Button>
          </div>

          <AnimatePresence>
            {showFullSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Horari Complet</h2>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-4 rounded-lg ${darkMode ? 'border-gray-600' : 'border-blue-200'} border max-h-60 overflow-y-auto`}>
                  {fullSchedule.length > 0 ? (
                    fullSchedule.map((time, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-center mb-3 text-lg`}
                      >
                        <Clock className={`w-5 h-5 mr-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        {time} - {selectedDay}
                      </motion.p>
                    ))
                  ) : (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hi ha horaris complets disponibles</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}