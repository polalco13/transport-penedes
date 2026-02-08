import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findClosestOrigin,
  findRouteKey,
  getActiveCalendarKey,
  getFullScheduleTimes,
  getUpcomingBuses,
  parseHorarisData,
  type FullData,
  type Ruta,
} from './scheduleService.ts'

const baseData: FullData = {
  horarios_autobus: {
    ruta_1: {
      origen: 'Barcelona',
      destino: 'Vilafranca',
      paradas_orden: [
        "Estació d'autobusos Sants",
        'Av. Diagonal (Palau Reial)',
        "Estació d'autobusos Vilafranca",
      ],
      calendarios: {
        laborables_invierno: {
          descripcion: 'Feiners hivern',
          salidas: [
            { sants: '08:10', palau_reial: '08:20', vilafranca: '08:50' },
            { sants: '09:00', palau_reial: '09:10', vilafranca: '09:40' },
            { sants: '11:30', palau_reial: '11:40', vilafranca: '12:10' },
            { sants: '12:00', palau_reial: null, vilafranca: '12:40' },
          ],
        },
        laborables_agosto: {
          descripcion: 'Feiners agost',
          salidas: [{ sants: '10:00', palau_reial: '10:10', vilafranca: '10:40' }],
        },
        sabados_laborables: {
          descripcion: 'Dissabte',
          salidas: [{ sants: '07:30', palau_reial: '07:40', vilafranca: '08:10' }],
        },
        domingos_y_festivos: {
          descripcion: 'Diumenge',
          salidas: [{ sants: '08:30', palau_reial: '08:40', vilafranca: '09:10' }],
        },
      },
    },
  },
}

test('getActiveCalendarKey applies weekend and august rules', () => {
  assert.equal(getActiveCalendarKey('Diumenge', new Date('2026-01-11T09:00:00'), false), 'domingos_y_festivos')
  assert.equal(getActiveCalendarKey('Dissabte', new Date('2026-01-10T09:00:00'), false), 'sabados_laborables')
  assert.equal(getActiveCalendarKey('Dilluns', new Date('2026-08-03T09:00:00'), false), 'laborables_agosto')
})

test('getActiveCalendarKey applies festiu override on weekdays', () => {
  assert.equal(getActiveCalendarKey('Dimarts', new Date('2026-02-03T09:00:00'), true), 'domingos_y_festivos')
})

test('findRouteKey returns forward route only', () => {
  assert.equal(findRouteKey(baseData, "Estació d'autobusos Sants", "Estació d'autobusos Vilafranca"), 'ruta_1')
  assert.equal(findRouteKey(baseData, "Estació d'autobusos Vilafranca", "Estació d'autobusos Sants"), null)
})

test('getUpcomingBuses returns next 3 buses for today', () => {
  const result = getUpcomingBuses({
    data: baseData,
    origin: "Estació d'autobusos Sants",
    destination: "Estació d'autobusos Vilafranca",
    selectedDay: 'Dilluns',
    festiuBcn: false,
    now: new Date('2026-02-02T08:15:00'),
  })

  assert.equal(result.message, '')
  assert.deepEqual(
    result.buses.map((bus) => bus.hora_salida),
    ['09:00', '11:30', '12:00']
  )
  assert.ok(result.buses.every((bus) => bus.isToday))
})

test('getUpcomingBuses returns scheduled buses for non-today day', () => {
  const result = getUpcomingBuses({
    data: baseData,
    origin: "Estació d'autobusos Sants",
    destination: "Estació d'autobusos Vilafranca",
    selectedDay: 'Dimarts',
    festiuBcn: false,
    now: new Date('2026-02-02T12:15:00'),
  })

  assert.equal(result.message, '')
  assert.deepEqual(
    result.buses.map((bus) => bus.hora_salida),
    ['08:10', '09:00', '11:30']
  )
  assert.ok(result.buses.every((bus) => !bus.isToday))
})

test('getFullScheduleTimes returns sorted full list', () => {
  const result = getFullScheduleTimes({
    data: baseData,
    origin: "Estació d'autobusos Sants",
    destination: "Estació d'autobusos Vilafranca",
    selectedDay: 'Dilluns',
    festiuBcn: false,
    now: new Date('2026-02-02T08:00:00'),
  })

  assert.equal(result.message, '')
  assert.deepEqual(result.times, ['08:10', '09:00', '11:30', '12:00'])
})

test('parseHorarisData throws with malformed input', () => {
  assert.throws(
    () =>
      parseHorarisData({
        horarios_autobus: {
          ruta_bad: {
            paradas_orden: 'wrong',
            calendarios: {},
          },
        },
      }),
    /paradas_orden/
  )
})

test('findClosestOrigin returns nearest route origin', () => {
  const routes: Ruta[] = [
    {
      id: 1,
      origen: 'Origin A',
      destino: 'X',
      latitud_origen: 41.0,
      longitud_origen: 2.0,
    },
    {
      id: 2,
      origen: 'Origin B',
      destino: 'Y',
      latitud_origen: 42.0,
      longitud_origen: 1.0,
    },
  ]

  assert.equal(findClosestOrigin(routes, 41.1, 2.1), 'Origin A')
})
