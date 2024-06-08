import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect } from 'react';
import rutasData from './data/rutas.json';
import horariosData from './data/horarios.json';
import Noticia3d8 from './noticies/Noticia3d8.jpg';

import './styles.css';

function Popup({ mostrar, onClose }) {
  
  if (!mostrar) {
    return null;
  }

  return (
    <div className="popup-overlay">
      <div className="popup">
        <button className="close-button" onClick={onClose}>X</button>
        <img src={Noticia3d8} alt="Noticia 3d8" />
      </div>
    </div>
  );
}

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
  const [mostrarPopup, setMostrarPopup] = useState(false);

  const diasSemana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  useEffect(() => {
    // Cargar rutas directamente desde el archivo JSON
    setRutas(rutasData);
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

  const buscarProximoBus = (origenBus, destinoBus) => {
    const ara = new Date();
    const horaActual = ara.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"
    const diaActual = diasSemana[ara.getDay()];

    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    let resultados = [];

    horariosData.forEach(horario => {
      if (rutaIds.includes(horario.ruta_id) && horario.horarios[diaActual]) {
        const proximosHorarios = horario.horarios[diaActual].filter(hora_salida => {
          const [horaSalidaHours, horaSalidaMinutes] = hora_salida.split(':').map(Number);
          const [horaActualHours, horaActualMinutes] = horaActual.split(':').map(Number);

          // Crear objetos Date para comparaciones
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

    // Ordenar los resultados por hora de salida
    resultados.sort((a, b) => {
      const [aHours, aMinutes] = a.hora_salida.split(':').map(Number);
      const [bHours, bMinutes] = b.hora_salida.split(':').map(Number);

      const aDate = new Date();
      aDate.setHours(aHours, aMinutes, 0, 0);

      const bDate = new Date();
      bDate.setHours(bHours, bMinutes, 0, 0);

      return aDate - bDate;
    });

    // Obtener los próximos tres buses
    const proximosBuses = resultados.slice(0, 3);

    setResultados(proximosBuses);
    if (proximosBuses.length === 0) {
      setMensajeNoMasBuses('No hi ha més autobusos per avui');
    } else {
      setMensajeNoMasBuses('');
    }
  };

  const buscarHorariosCompletos = (origenBus, destinoBus) => {
    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    let resultados = [];

    horariosData.forEach(horario => {
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

    if (nuevoOrigen) {
      const destinos = rutas
        .filter(ruta => ruta.origen === nuevoOrigen)
        .map(ruta => ruta.destino);
      setDestinosDisponibles([...new Set(destinos)]);
    } else {
      setDestinosDisponibles([]);
    }

    buscarProximoBus(nuevoOrigen, nuevoDestino); // Call buscarProximoBus with new origin and destination
    if (mostrarHorarios) {
      buscarHorariosCompletos(nuevoOrigen, nuevoDestino); // Update horarios completos if they are being shown
    }
  };

  const toggleMostrarHorarios = () => {
    setMostrarHorarios(!mostrarHorarios);
    if (!mostrarHorarios) {
      buscarHorariosCompletos(origen, destino);
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
                {[...new Set(rutas.map(ruta => ruta.origen))].map((origen, index) => (
                  <option key={index} value={origen}>{origen}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Destí:</label>
              <select value={destino} onChange={e => setDestino(e.target.value)} disabled={!origen}>
                <option value="">Selecciona</option>
                {destinosDisponibles.map((destino, index) => (
                  <option key={index} value={destino}>{destino}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="swap-button" onClick={intercambiarOrigenDestino}>⇄</button>
        </div>
        <button onClick={() => buscarProximoBus(origen, destino)}>Buscar següents busos</button>
        {mensajeNoMasBuses && <p>{mensajeNoMasBuses}</p>}
        <ul>
          {resultados.map((horario, index) => (
            <li key={index}>
              {horario.estacion} - {horario.hora_salida} ({horario.dia_semana})
            </li>
          ))}
        </ul>
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
      <button className="noticia-button" onClick={() => setMostrarPopup(true)}>Noticia 3d8</button>
      <Popup mostrar={mostrarPopup} onClose={() => setMostrarPopup(false)} />
      <Analytics />
    </div>
  );
}

export default App;
