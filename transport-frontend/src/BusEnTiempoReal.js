import React, { useState } from 'react';
import { useComentarios } from './ComentariosProvider';

const BusEnTiempoReal = () => {
  const { comentarios, addComentario } = useComentarios();
  const [nuevaRuta, setNuevaRuta] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');

  const handleAddComentario = () => {
    const comentario = {
      text: nuevoComentario,
      timestamp: new Date().toISOString(),
    };
    addComentario(nuevaRuta, comentario);
    setNuevoComentario('');
  };

  return (
    <div className="bus-en-tiempo-real">
      <h2>Bus en Tiempo Real</h2>
      <div>
        <input
          type="text"
          placeholder="Ruta"
          value={nuevaRuta}
          onChange={(e) => setNuevaRuta(e.target.value)}
        />
        <input
          type="text"
          placeholder="Comentario"
          value={nuevoComentario}
          onChange={(e) => setNuevoComentario(e.target.value)}
        />
        <button onClick={handleAddComentario}>Añadir Comentario</button>
      </div>
      <div>
        {Object.keys(comentarios).map(ruta => (
          <div key={ruta}>
            <h3>Ruta: {ruta}</h3>
            {comentarios[ruta].map((comentario, index) => (
              <p key={index}>{comentario.text}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusEnTiempoReal;