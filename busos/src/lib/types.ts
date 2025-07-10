export const daysOfWeek = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'] as const;
export type DayOfWeek = typeof daysOfWeek[number];

export type Horari = {
  ruta_id: number;
  horarios: { [key in DayOfWeek]: string[] };
};

export type Ruta = {
  id: number;
  origen: string;
  destino: string;
  latitud_origen: number;
  longitud_origen: number;
};

export type BusResult = {
  ruta_id: number;
  hora_salida: string;
  dia_semana: DayOfWeek;
};

export type FavoriteRoute = {
  origin: string;
  destination: string;
};

export type ServiceAlert = {
  id: string;
  message: string;
  active: boolean;
  createdAt: string;
};

// Type for the raw alert data as stored in alerts.json (managed by admin)
// Could be the same as ServiceAlert if admin also manages 'active' and 'createdAt' directly
export type AdminManagedAlert = ServiceAlert;
