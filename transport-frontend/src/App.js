import { Analytics } from "@vercel/analytics/react";
import React, { useState, useEffect } from 'react';
import rutasData from './data/rutas.json';
import rutasAgostData from './data/rutasAgost.json';
import horariosData from './data/horarios.json';
import horariosAgostData from './data/horariosAgost.json';
import Maintenance from './manteniment';

import './styles.css';

function App() {

  //provisional
  const [isMaintenance, setIsMaintenance] = useState(true); // Estado para el modo de mantenimiento

  const [comentarios, setComentarios] = useState({});

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
  const [loading, setLoading] = useState(false);


  const diasSemana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  useEffect(() => {
    //canviar
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
    localStorage.setItem('favoritos', JSON.stringify(favoritos));
  }, [favoritos]);

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
    const horaActual = ara.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"
    const diaActual = diasSemana[ara.getDay()];

    const rutaIds = rutas
      .filter(ruta => ruta.origen === origenBus && ruta.destino === destinoBus)
      .map(ruta => ruta.id);

    let resultados = [];

    //canviar mes!
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

    //canviar mes!
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
                    origenCercano = ruta.origen;}
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

  const [showNotification, setShowNotification] = useState(true);

  const closeNotification = () => {
    setShowNotification(false);
  };

  const agregarComentario = (rutaId, comentario) => {
    setComentarios(prevComentarios => {
      const nuevosComentarios = { ...prevComentarios };
      if (!nuevosComentarios[rutaId]) {
        nuevosComentarios[rutaId] = [];
      }
      nuevosComentarios[rutaId].push(comentario);
      return nuevosComentarios;
    });
  };


    if (!isMaintenance) {
      return <Maintenance />; // Renderiza el componente de mantenimiento si está en modo de mantenimiento
    }

    return (
      <div className="App">
        <div className="App-header">
          <h1>Transport Públic del Penedès</h1>
          {showNotification && (
            <div className="notification">
              <p>h1oraris d'Agost actualitzats.</p>
              <button className="close-button" onClick={closeNotification}>❌</button>
            </div>
          )}
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
          
          {/*<img src={require('./img/VilaMCristina.png')} alt="Your Image" className="responsive-image"/>*/}

        </div>
        <button onClick={() => buscarProximoBus(origen, destino)}>Buscar següents busos</button>
        {mensajeNoMasBuses && <p>{mensajeNoMasBuses}</p>}

        

        {/* Renderización de resultados */}
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