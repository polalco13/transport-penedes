import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

function App() {
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [resultados, setResultados] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [diaSemana, setDiaSemana] = useState('');
  const [horariosCompletos, setHorariosCompletos] = useState([]);

  const diasSemana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const response = await axios.get('http://localhost:8000/rutas');
        setRutas(response.data);
      } catch (error) {
        console.error('Error obtenint rutes', error);
      }
    };
    fetchRutas();
  }, []);

  const buscarProximoBus = async () => {
    const ara = new Date();
    const horaActual = ara.toTimeString().split(' ')[0].slice(0, 5); // "HH:MM"
    const diaActual = diasSemana[ara.getDay()];

    try {
      const response = await axios.get('http://localhost:8000/buscar', {
        params: {
          origen,
          destino,
          dia_semana: diaActual,
          hora: horaActual
        }
      });
      setResultados(response.data);
    } catch (error) {
      console.error('Error cercant horaris', error);
    }
  };

  const buscarHorariosCompletos = async () => {
    try {
      const response = await axios.get('http://localhost:8000/horarios', {
        params: {
          origen,
          destino,
          dia_semana: diaSemana
        }
      });
      setHorariosCompletos(response.data);
    } catch (error) {
      console.error('Error cercant horaris complets', error);
    }
  };

  return (
    <div className="App">
      <div className="App-header">
        <h1>Transport Públic del Penedès</h1>
        <div>
          <label>Origen:</label>
          <select value={origen} onChange={e => setOrigen(e.target.value)}>
            <option value="">Selecciona origen</option>
            {[...new Set(rutas.map(ruta => ruta.origen))].map((origen, index) => (
              <option key={index} value={origen}>{origen}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Destí:</label>
          <select value={destino} onChange={e => setDestino(e.target.value)}>
            <option value="">Selecciona destí</option>
            {[...new Set(rutas.map(ruta => ruta.destino))].map((destino, index) => (
              <option key={index} value={destino}>{destino}</option>
            ))}
          </select>
        </div>
        <button onClick={buscarProximoBus}>Buscar Pròxim Bus</button>
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
          <button onClick={buscarHorariosCompletos}>Mostrar Horaris</button>
        </div>
        <ul>
          {horariosCompletos.map((horario, index) => (
            <li key={index}>
              {horario.estacion} - {horario.hora_salida} ({horario.dia_semana})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
