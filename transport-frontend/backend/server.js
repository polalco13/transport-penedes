const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8000;

app.use(cors());

const cargarDatos = () => {
  const rutas = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rutas.json')));
  const horarios = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'horarios.json')));
  return { rutas, horarios };
};

app.get('/rutas', (req, res) => {
  const { rutas } = cargarDatos();
  res.json(rutas);
});

app.get('/buscar', (req, res) => {
  const { origen, destino, dia_semana, hora } = req.query;
  console.log('Paràmetres de cerca:', { origen, destino, dia_semana, hora });

  const { rutas, horarios } = cargarDatos();

  const rutaIds = rutas
    .filter(ruta => ruta.origen === origen && ruta.destino === destino)
    .map(ruta => ruta.id);

  console.log('Rutes trobades:', rutaIds);

  let resultados = [];

  horarios.forEach(horario => {
    if (rutaIds.includes(horario.ruta_id) && horario.horarios[dia_semana]) {
      const proximosHorarios = horario.horarios[dia_semana].filter(hora_salida => hora_salida >= hora);
      if (proximosHorarios.length > 0) {
        resultados.push({
          ruta_id: horario.ruta_id,
          estacion: horario.estacion,
          hora_salida: proximosHorarios[0],
          dia_semana: dia_semana
        });
      }
    }
  });

  const proximoBus = resultados.length > 0 ? [resultados[0]] : [];

  console.log('Pròxim bus trobat:', proximoBus);
  res.json(proximoBus);
});

app.get('/horarios', (req, res) => {
  const { origen, destino, dia_semana } = req.query;
  console.log('Paràmetres per a horaris complets:', { origen, destino, dia_semana });

  const { rutas, horarios } = cargarDatos();

  const rutaIds = rutas
    .filter(ruta => ruta.origen === origen && ruta.destino === destino)
    .map(ruta => ruta.id);

  console.log('Rutes trobades:', rutaIds);

  let resultados = [];

  horarios.forEach(horario => {
    if (rutaIds.includes(horario.ruta_id) && horario.horarios[dia_semana]) {
      horario.horarios[dia_semana].forEach(hora_salida => {
        resultados.push({
          ruta_id: horario.ruta_id,
          estacion: horario.estacion,
          hora_salida: hora_salida,
          dia_semana: dia_semana
        });
      });
    }
  });

  console.log('Horaris complets trobats:', resultados);
  res.json(resultados);
});

app.listen(port, () => {
  console.log(`Servidor escoltant a http://localhost:${port}`);
});
