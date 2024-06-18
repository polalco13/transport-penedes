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
  const [rutaPredeterminada, setRutaPredeterminada] = useState('');
  const [favoritos, setFavoritos] = useState([]);
  const [mostrarFavoritos, setMostrarFavoritos] = useState(false);

  const diasSemana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  useEffect(() => {
    setRutas(rutasData);

    const rutaGuardada = localStorage.getItem('rutaPredeterminada');
    if (rutaGuardada) {
      setRutaPredeterminada(rutaGuardada);
    }

    const favoritosGuardados = JSON.parse(localStorage.getItem('favoritos'));
    if (favoritosGuardados) {
      setFavoritos(favoritosGuardados);
    }
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
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
  }, [favoritos]);

  useEffect(() => {
    if (origen && destino) {
      console.log(`Buscando próximo bus de ${origen} a ${destino}`);
      buscarProximoBus(origen, destino);
      if (mostrarHorarios) {
        console.log(`Buscando horarios completos de ${origen} a ${destino} para el día ${diaSemana}`);
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
    const horaActual = ara.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"
    const diaActual = diasSemana[ara.getDay()];

    console.log(`Hora actual: ${horaActual}, Día actual: ${diaActual}`);

    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    console.log(`IDs de las rutas filtradas: ${rutaIds}`);

    let resultados = [];

    horariosData.forEach(horario => {
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

    console.log('Próximos buses encontrados:', proximosBuses);

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

    console.log(`Intercambiando: nuevoOrigen = ${nuevoOrigen}, nuevoDestino = ${nuevoDestino}`);

    setOrigen(nuevoOrigen);
    setDestino(nuevoDestino);
  };

  const toggleMostrarHorarios = () => {
    setMostrarHorarios(!mostrarHorarios);
  };

  const detectarUbicacion = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;

        let distanciaMinima = Infinity;
        let origenCercano = '';

        rutasData.forEach(ruta => {
          const distancia = Math.sqrt(
            Math.pow(ruta.latitud_origen - latitude, 2) + Math.pow(ruta.longitud_origen - longitude, 2)
          );

          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            origenCercano = ruta.origen;
          }
        });

        setOrigen(origenCercano);
      });
    } else {
      alert('Geolocalización no soportada por tu navegador');
    }
  };

  const agregarAFavoritos = () => {
    if (origen && destino) {
      const nuevaRutaFavorita = { origen, destino };
      if (!favoritos.some(fav => fav.origen === origen && fav.destino === destino)) {
        setFavoritos([...favoritos, nuevaRutaFavorita]);
      }
    }
  };

  const eliminarFavorito = (favorito) => {
    const nuevosFavoritos = favoritos.filter(fav => !(fav.origen === favorito.origen && fav.destino === favorito.destino));
    setFavoritos(nuevosFavoritos);
  };

  const seleccionarFavorito = (favorito) => {
    setOrigen(favorito.origen);
    setDestino(favorito.destino);
    setMostrarFavoritos(false);
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
              <button onClick={detectarUbicacion}>Detectar ubicació propera</button>
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

        {/* Renderización de resultados */}
        {resultados.length > 0 && (
          <div>
            <h2>Próximos buses</h2>
            <ul>
              {resultados.map((resultado, index) => (
                <li key={index}>
                  {resultado.estacion} - {resultado.hora_salida} ({resultado.dia_semana})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="favoritos-section">
          <button onClick={() => setMostrarFavoritos(!mostrarFavoritos)}>
            {mostrarFavoritos ? 'Amagar Favorits' : 'Mostrar Favorits'}
          </button>
          {mostrarFavoritos && (
            <ul>
              {favoritos.map((favorito, index) => (
                <li key={index}>
                  <button onClick={() => seleccionarFavorito(favorito)}>
                    {favorito.origen} - {favorito.destino}
                  </button>
                  <button onClick={() => eliminarFavorito(favorito)}>Eliminar</button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={agregarAFavoritos}>Afegir a favorits</button>
        </div>
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
