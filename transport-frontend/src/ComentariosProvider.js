import React, { useState, useEffect, useContext } from 'react';

// Crear un contexto para los comentarios
const ComentariosContext = React.createContext();

export const useComentarios = () => {
  return useContext(ComentariosContext);
};

const ComentariosProvider = ({ children }) => {
  const [comentarios, setComentarios] = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      setComentarios(prevComentarios => {
        const ahora = Date.now();
        const nuevosComentarios = { ...prevComentarios };

        Object.keys(nuevosComentarios).forEach(ruta => {
          nuevosComentarios[ruta] = nuevosComentarios[ruta].filter(
            comentario => (ahora - new Date(comentario.timestamp)) < 3600000
          );
          if (nuevosComentarios[ruta].length === 0) {
            delete nuevosComentarios[ruta];
          }
        });

        return nuevosComentarios;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const addComentario = (ruta, comentario) => {
    setComentarios(prevComentarios => {
      const nuevosComentarios = { ...prevComentarios };
      if (!nuevosComentarios[ruta]) {
        nuevosComentarios[ruta] = [];
      }
      nuevosComentarios[ruta].push(comentario);
      return nuevosComentarios;
    });
  };

  return (
    <ComentariosContext.Provider value={{ comentarios, addComentario }}>
      {children}
    </ComentariosContext.Provider>
  );
};

export default ComentariosProvider;