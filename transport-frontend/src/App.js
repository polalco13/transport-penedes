import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect } from 'react';
import rutasAgostData from './data/rutasAgost.json';
import horariosAgostData from './data/horariosAgost.json';
import './styles.css';

function App() {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [destinosDisponibles, setDestinosDisponibles] = useState([]);
  const [diaSemana, setDiaSemana] = useState('');
  const [horariosCompletos, setHorariosCompletos] = useState([]);
  const [mostrarHorarios, setMostrarHorarios] = useState(false);
  const [mensajeNoMasBuses, setMensajeNoMasBuses] = useState('');
  const [rutaPredeterminada, setRutaPredeterminada] = useState('');
  const [loading, setLoading] = useState(false);
  const diasSemana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  useEffect(() => {
    setRutas(rutasAgostData);
  }, []);

  useEffect(() => {
    if (origen) {
      const destinos = rutas
        .filter(ruta => ruta.origen === origen)
        .map(ruta => ruta.destino);
      setDestinosDisponibles([...new Set(destinos)]);
    } else {
      setDestinosDisponibles([]);
    }
  }, [origen, rutas]);

  useEffect(() => {
    localStorage.setItem('rutaPredeterminada', rutaPredeterminada);
  }, [rutaPredeterminada]);

  useEffect(() => {
    if (origen && destino) {
      buscarProximoBus(origen, destino);
      if (mostrarHorarios) {
        buscarHorariosCompletos(origen, destino);
      }
    } else {
      setResultados([]);
      setHorariosCompletos([]);
      setMostrarHorarios(false);
      setMensajeNoMasBuses('');
    }
  }, [origen, destino, diaSemana, mostrarHorarios]);

  const buscarProximoBus = (origenBus, destinoBus) => {
    const ara = new Date();
    const horaActual = ara.toTimeString().split(' ')[0].slice(0, 5);
    const diaActual = diasSemana[ara.getDay()];

    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    let resultados = [];

    horariosAgostData.forEach(horario => {
      if (rutaIds.includes(horario.ruta_id) && horario.horarios[diaActual]) {
        const proximosHorarios = horario.horarios[diaActual].filter(hora_salida => {
          const [horaSalidaHours, horaSalidaMinutes] = hora_salida.split(':').map(Number);
          const [horaActualHours, horaActualMinutes] = horaActual.split(':').map(Number);

          const horaSalidaDate = new Date();
          horaSalidaDate.setHours(horaSalidaHours, horaSalidaMinutes, 0, 0);

          const horaActualDate = new Date();
          horaActualDate.setHours(horaActualHours, horaActualMinutes, 0, 0);

          return horaSalidaDate >= horaActualDate;
        });

        proximosHorarios.forEach(hora_salida => {
          resultados.push({
            ruta_id: horario.ruta_id,
            estacion: horario.estacion,
            hora_salida: hora_salida,
            dia_semana: diaActual
          });
        });
      }
    });

    resultados.sort((a, b) => {
      const [aHours, aMinutes] = a.hora_salida.split(':').map(Number);
      const [bHours, bMinutes] = b.hora_salida.split(':').map(Number);

      const aDate = new Date();
      aDate.setHours(aHours, aMinutes, 0, 0);

      const bDate = new Date();
      bDate.setHours(bHours, bMinutes, 0, 0);

      return aDate - bDate;
    });

    const proximosBuses = resultados.slice(0, 3);

    setResultados(proximosBuses);
    setMensajeNoMasBuses(proximosBuses.length === 0 ? 'No hi ha més autobusos per avui' : '');
  };

  const buscarHorariosCompletos = (origenBus, destinoBus) => {
    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    let resultados = [];

    horariosAgostData.forEach(horario => {
      if (rutaIds.includes(horario.ruta_id) && horario.horarios[diaSemana]) {
        horario.horarios[diaSemana].forEach(hora_salida => {
          resultados.push({
            ruta_id: horario.ruta_id,
            estacion: horario.estacion,
            hora_salida: hora_salida,
            dia_semana: diaSemana
          });
        });
      }
    });

    setHorariosCompletos(resultados);
  };

  const intercambiarOrigenDestino = () => {
    const nuevoOrigen = destino;
    const nuevoDestino = origen;
    setOrigen(nuevoOrigen);
    setDestino(nuevoDestino);
  };

  const toggleMostrarHorarios = () => {
    setMostrarHorarios(!mostrarHorarios);
  };

  const detectarUbicacion = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        let distanciaMinima = Infinity;
        let origenCercano = '';

        rutasAgostData.forEach(ruta => {
          const distancia = Math.sqrt(
            Math.pow(ruta.latitud_origen - latitude, 2) + Math.pow(ruta.longitud_origen - longitude, 2)
          );
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            origenCercano = ruta.origen;
          }
        });
        setOrigen(origenCercano);
        setLoading(false);
      }, () => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="App-header">
        <h1>Transport Públic del Penedès</h1>
        <div className="form-group">
          <div className="form-fields">
            <div className="form-field">
              <label>Origen:</label>
              <select value={origen} onChange={e => setOrigen(e.target.value)}>
                <option value="">Selecciona</option>
                {[...new Set(rutas.map(ruta => ruta.origen))].sort().map((origen, index) => (
                  <option key={index} value={origen}>{origen}</option>
                ))}
              </select>
              <button onClick={detectarUbicacion} disabled={loading}>
                Detectar ubicació propera
              </button>
              {loading && <div className="spinner"></div>}
            </div>
            <div className="form-field">
              <label>Destí:</label>
              <select value={destino} onChange={e => setDestino(e.target.value)} disabled={!origen}>
                <option value="">Selecciona</option>
                {destinosDisponibles.sort().map((destino, index) => (
                  <option key={index} value={destino}>{destino}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="swap-button" onClick={intercambiarOrigenDestino}>⇄</button>
        </div>
        <button onClick={() => buscarProximoBus(origen, destino)}>Buscar següents busos</button>
        {mensajeNoMasBuses && <p>{mensajeNoMasBuses}</p>}
        {resultados.length > 0 && (
          <div>
            <h2>Pròxims busos</h2>
            <ul>
              {resultados.map((resultado, index) => (
                <li key={index}>
                  {resultado.estacion} - {resultado.hora_salida} ({resultado.dia_semana})
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <label>Dia de la setmana:</label>
          <select value={diaSemana} onChange={e => setDiaSemana(e.target.value)}>
            <option value="">Selecciona dia</option>
            {diasSemana.map((dia, index) => (
              <option key={index} value={dia}>{dia}</option>
            ))}
          </select>
          <button onClick={toggleMostrarHorarios}>
            {mostrarHorarios ? 'Amagar Horaris' : 'Mostrar Horaris'}
          </button>
        </div>
        {mostrarHorarios && (
          <ul>
            {horariosCompletos.map((horario, index) => (
              <li key={index}>
                {horario.estacion} - {horario.hora_salida} ({horario.dia_semana})
              </li>
            ))}
          </ul>
        )}
      </div>
      <Analytics />
    </div>
  );
}

export default App;