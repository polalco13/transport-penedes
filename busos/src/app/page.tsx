'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeftRight, Bus, Calendar, Search, MapPin, Clock } from 'lucide-react'
import horaris from './data/horaris.json'
import rutes from './data/rutes.json'

const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']

export default function BusScheduleApp() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedDay, setSelectedDay] = useState('')
  const [schedule, setSchedule] = useState([])
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [fullSchedule, setFullSchedule] = useState([])
  const [noMoreBusesMessage, setNoMoreBusesMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const availableOrigins = useMemo(() => Array.from(new Set(rutes.map(ruta => ruta.origen))), [])
  
  const availableDestinations = useMemo(() => {
    if (!origin) return []
    return Array.from(new Set(rutes.filter(ruta => ruta.origen === origin).map(ruta => ruta.destino)))
  }, [origin])

  const handleSwap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const getRutaId = () => {
    const ruta = rutes.find(
      (ruta) => ruta.origen === origin && ruta.destino === destination
    )
    return ruta ? ruta.id : null
  }

  useEffect(() => {
    const currentDate = new Date()
    const today = daysOfWeek[currentDate.getDay()]
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
    const currentHour = currentDate.toTimeString().slice(0, 5)
    const today = daysOfWeek[currentDate.getDay()]

    const rutaId = getRutaId()
    if (!rutaId) {
      setNoMoreBusesMessage("No s'ha trobat la ruta")
      setSchedule([])
      return
    }

    const horariForRuta = horaris.find((horari) => horari.ruta_id === rutaId)
    if (!horariForRuta) {
      setNoMoreBusesMessage("No s'han trobat horaris per aquesta ruta")
      setSchedule([])
      return
    }

    const horariosForDay = horariForRuta.horarios[selectedDay || today] || []

    const upcomingBuses = horariosForDay.filter((time) => time >= currentHour).slice(0, 3)

    setSchedule(upcomingBuses)
    setNoMoreBusesMessage(upcomingBuses.length === 0 ? 'No hi ha més autobusos per avui' : '')
    setShowFullSchedule(false)
  }

  const handleShowFullSchedule = () => {
    const rutaId = getRutaId()
    if (!rutaId) {
      setFullSchedule([])
      return
    }

    const horariForRuta = horaris.find((horari) => horari.ruta_id === rutaId)
    if (!horariForRuta) {
      setFullSchedule([])
      return
    }

    const horariosForDay = horariForRuta.horarios[selectedDay] || []

    setFullSchedule(horariosForDay)
    setShowFullSchedule(!showFullSchedule)
  }

  const detectLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords
        let closestOrigin = ''
        let minDistance = Infinity

        rutes.forEach((ruta) => {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg p-6 bg-white rounded-lg shadow-md"
      >
        <div className="flex items-center mb-8">
          <Bus className="w-12 h-12 text-blue-600 mr-4" />
          <h1 className="text-3xl font-bold text-blue-600">Busos del Penedès</h1>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Select onValueChange={setOrigin} value={origin}>
              <SelectTrigger className="w-full sm:w-40 border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500">
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
              className="p-3 bg-blue-100 rounded-full transition-colors duration-200 hover:bg-blue-200"
              aria-label="Intercanviar origen i destinació"
            >
              <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            </motion.button>

            <Select onValueChange={setDestination} value={destination} disabled={!origin}>
              <SelectTrigger className="w-full sm:w-40 border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500">
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
            <Button onClick={handleSearch} className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 text-lg py-6">
              <Search className="w-5 h-5 mr-2" />
              Troba els propers 3 autobusos
            </Button>
          </motion.div>

          <Select onValueChange={setSelectedDay} value={selectedDay}>
            <SelectTrigger className="w-full border-gray-300 bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
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
                <h2 className="text-xl font-semibold mb-4 text-blue-600">Propers Autobusos</h2>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {schedule.map((time, index) => (
                    <motion.p
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-gray-800 flex items-center mb-3 text-lg"
                    >
                      <Clock className="w-5 h-5 mr-3 text-blue-600" />
                      {time}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {noMoreBusesMessage && (
            <p className="text-gray-600 mt-4 text-center">{noMoreBusesMessage}</p>
          )}

          <div className="flex flex-col sm:flex-row justify-between mt-6 space-y-4 sm:space-y-0 sm:space-x-4">
            <Button onClick={handleShowFullSchedule} className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors duration-200 py-6">
              {showFullSchedule ? 'Amaga Horaris' : 'Mostra Horaris'}
            </Button>
            <Button onClick={detectLocation} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 py-6" disabled={loading}>
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
                <h2 className="text-xl font-semibold mb-4 text-blue-600">Horari Complet</h2>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 max-h-60 overflow-y-auto">
                  {fullSchedule.length > 0 ? (
                    fullSchedule.map((time, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="text-gray-800 flex items-center mb-3 text-lg"
                      >
                        <Clock className="w-5 h-5 mr-3 text-blue-600" />
                        {time}
                      </motion.p>
                    ))
                  ) : (
                    <p className="text-gray-600">No hi ha horaris complets disponibles</p>
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