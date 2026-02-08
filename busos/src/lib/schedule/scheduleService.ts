export const DAYS_OF_WEEK = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export type Salida = {
  [key: string]: string | null
}

export type Calendario = {
  descripcion: string
  salidas: Salida[]
}

export type Calendarios = {
  laborables_invierno?: Calendario
  laborables_agosto?: Calendario
  sabados_laborables?: Calendario
  domingos_y_festivos?: Calendario
}

export type CalendarKey = keyof Calendarios

export type RutaDef = {
  origen: string
  destino: string
  paradas_orden: string[]
  calendarios: Calendarios
}

export type HorariosAutobus = {
  [key: string]: RutaDef
}

export type FullData = {
  horarios_autobus: HorariosAutobus
}

export type BusResult = {
  hora_salida: string
  dia_semana: DayOfWeek
  ruta_key: string
  isToday: boolean
}

export type Ruta = {
  id: number
  origen: string
  destino: string
  latitud_origen: number
  longitud_origen: number
}

type SearchBaseParams = {
  data: FullData
  origin: string
  destination: string
  selectedDay: DayOfWeek
  festiuBcn: boolean
  now?: Date
}

type UpcomingResult = {
  buses: BusResult[]
  message: string
}

type FullScheduleResult = {
  times: string[]
  message: string
}

export const STOP_KEY_MAP: Record<string, string> = {
  "Estació d'autobusos Sants": 'sants',
  "Estació d'autobusos de Sants": 'sants',
  "Av. Diagonal (Mª Cristina)": 'ma_cristina',
  'Av. Diagonal (Palau Reial)': 'palau_reial',
  'Av. Diagonal (Zona Universitària)': 'zona_uni',
  "Estació d'autobusos Vilafranca": 'vilafranca',
  "Estació d'autobusos de Vilafranca": 'vilafranca',
}

const CALENDAR_LABELS: Record<CalendarKey, string> = {
  laborables_invierno: 'Feiners (hivern)',
  laborables_agosto: 'Feiners (agost)',
  sabados_laborables: 'Dissabtes feiners',
  domingos_y_festivos: 'Diumenges i festius',
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const parseTimeToMinutes = (time: string): number | null => {
  const [hoursRaw, minutesRaw] = time.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw)

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  return hours * 60 + minutes
}

const sortTimes = (times: string[]) =>
  [...times].sort((a, b) => {
    const aMinutes = parseTimeToMinutes(a)
    const bMinutes = parseTimeToMinutes(b)

    if (aMinutes === null && bMinutes === null) return 0
    if (aMinutes === null) return 1
    if (bMinutes === null) return -1

    return aMinutes - bMinutes
  })

const extractTimesForOrigin = (calendar: Calendario, originKey: string): string[] =>
  sortTimes(
    calendar.salidas
      .map((salida) => salida[originKey])
      .filter((time): time is string => isString(time))
  )

const validateCalendario = (calendar: unknown, context: string) => {
  if (!isObject(calendar)) {
    throw new Error(`${context} ha de ser un objecte`)
  }

  if (!isString(calendar.descripcion)) {
    throw new Error(`${context}.descripcion ha de ser text`)
  }

  if (!Array.isArray(calendar.salidas)) {
    throw new Error(`${context}.salidas ha de ser una llista`)
  }

  for (let index = 0; index < calendar.salidas.length; index += 1) {
    const salida = calendar.salidas[index]
    if (!isObject(salida)) {
      throw new Error(`${context}.salidas[${index}] ha de ser un objecte`)
    }

    for (const [key, value] of Object.entries(salida)) {
      if (value !== null && !isString(value)) {
        throw new Error(`${context}.salidas[${index}].${key} ha de ser text o null`)
      }
    }
  }
}

export const parseHorarisData = (input: unknown): FullData => {
  if (!isObject(input)) {
    throw new Error('El fitxer de horaris ha de ser un objecte')
  }

  if (!isObject(input.horarios_autobus)) {
    throw new Error('Falta horarios_autobus o no és vàlid')
  }

  for (const [routeKey, route] of Object.entries(input.horarios_autobus)) {
    if (!isObject(route)) {
      throw new Error(`horarios_autobus.${routeKey} ha de ser un objecte`)
    }

    if (!Array.isArray(route.paradas_orden) || !route.paradas_orden.every(isString)) {
      throw new Error(`horarios_autobus.${routeKey}.paradas_orden ha de ser una llista de text`)
    }

    if (!isObject(route.calendarios)) {
      throw new Error(`horarios_autobus.${routeKey}.calendarios ha de ser un objecte`)
    }

    for (const [calendarKey, calendarValue] of Object.entries(route.calendarios)) {
      validateCalendario(calendarValue, `horarios_autobus.${routeKey}.calendarios.${calendarKey}`)
    }
  }

  return input as FullData
}

export const getCurrentDay = (date: Date = new Date()): DayOfWeek =>
  DAYS_OF_WEEK[date.getDay()] as DayOfWeek

export const getActiveCalendarKey = (day: DayOfWeek, date: Date, festiuBcn: boolean): CalendarKey => {
  if (day === 'Diumenge') return 'domingos_y_festivos'
  if (day === 'Dissabte') return 'sabados_laborables'
  if (festiuBcn) return 'domingos_y_festivos'

  const month = date.getMonth() + 1
  return month === 8 ? 'laborables_agosto' : 'laborables_invierno'
}

export const getActiveLabel = (key: CalendarKey): string => CALENDAR_LABELS[key]

export const findRouteKey = (data: FullData, origin: string, destination: string): string | null => {
  for (const [key, ruta] of Object.entries(data.horarios_autobus)) {
    const originIndex = ruta.paradas_orden.indexOf(origin)
    const destinationIndex = ruta.paradas_orden.indexOf(destination)
    if (originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex) {
      return key
    }
  }

  return null
}

const getCalendarAndOriginKey = ({
  data,
  origin,
  destination,
  selectedDay,
  festiuBcn,
  now,
}: SearchBaseParams): { calendar: Calendario; routeKey: string; originKey: string; isToday: boolean } | { message: string } => {
  const routeKey = findRouteKey(data, origin, destination)
  if (!routeKey) return { message: "No s'ha trobat cap ruta per a aquest trajecte" }

  const referenceDate = now ?? new Date()
  const calendarKey = getActiveCalendarKey(selectedDay, referenceDate, festiuBcn)
  const calendar = data.horarios_autobus[routeKey].calendarios[calendarKey]
  if (!calendar) return { message: "No hi ha horaris per a aquest dia" }

  const originKey = STOP_KEY_MAP[origin]
  if (!originKey) return { message: 'Error intern: parada desconeguda' }

  return {
    calendar,
    routeKey,
    originKey,
    isToday: selectedDay === getCurrentDay(referenceDate),
  }
}

export const getUpcomingBuses = (params: SearchBaseParams): UpcomingResult => {
  const resolved = getCalendarAndOriginKey(params)
  if ('message' in resolved) {
    return { buses: [], message: resolved.message }
  }

  const { calendar, routeKey, originKey, isToday } = resolved
  const times = extractTimesForOrigin(calendar, originKey)
  const referenceDate = params.now ?? new Date()
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes()

  const futureTimes = isToday
    ? times.filter((time) => {
        const minutes = parseTimeToMinutes(time)
        return minutes !== null && minutes > nowMinutes
      })
    : times

  const buses = futureTimes.slice(0, 3).map((time) => ({
    hora_salida: time,
    dia_semana: params.selectedDay,
    ruta_key: routeKey,
    isToday,
  }))

  if (buses.length === 0) {
    return {
      buses: [],
      message: isToday ? 'No queden més autobusos disponibles per avui' : 'No hi ha autobusos disponibles',
    }
  }

  return { buses, message: '' }
}

export const getFullScheduleTimes = (params: SearchBaseParams): FullScheduleResult => {
  const resolved = getCalendarAndOriginKey(params)
  if ('message' in resolved) {
    return { times: [], message: resolved.message }
  }

  const times = extractTimesForOrigin(resolved.calendar, resolved.originKey)
  if (times.length === 0) {
    return { times: [], message: 'No hi ha autobusos disponibles' }
  }

  return { times, message: '' }
}

export const findClosestOrigin = (routes: Ruta[], latitude: number, longitude: number): string | null => {
  let closestOrigin: string | null = null
  let minDistance = Number.POSITIVE_INFINITY

  for (const route of routes) {
    const distance = Math.sqrt(
      Math.pow(route.latitud_origen - latitude, 2) + Math.pow(route.longitud_origen - longitude, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closestOrigin = route.origen
    }
  }

  return closestOrigin
}
