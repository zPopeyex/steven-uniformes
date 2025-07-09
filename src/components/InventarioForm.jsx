import React, { useState } from 'react';
import Escaner from './Escaner';

const colegios = ['Inem', 'Camacho', 'Agustin Nieto', 'San Luis', 'Pedro de Valdivia'];
const prendas = ['Camibuso', 'Sudadera', 'Pantalón', 'Falda', 'Chaqueta'];

const InventarioForm = ({ onAgregar }) => {
  const [producto, setProducto] = useState({
    colegio: '',
    prenda: '',
    talla: '',
    cantidad: '',
    precio: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto({ ...producto, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { colegio, prenda, talla, cantidad, precio } = producto;

    if (colegio && prenda && talla && cantidad && precio) {
      const cantidadNum = parseInt(cantidad);
      const precioNum = parseFloat(precio);
      const total = cantidadNum * precioNum;

      const ahora = new Date();
      const fecha = ahora.toLocaleDateString();
      const hora = ahora.toLocaleTimeString();
      const timestamp = ahora.getTime(); // número grande: ideal para orden


      const productoFinal = {
  ...producto,
  cantidad: cantidadNum,
  precio: precioNum,
  total,
  fecha,
  hora,
  timestamp, // 👈 obligatorio para ordenar
};

      onAgregar(productoFinal);

      // Reiniciar el formulario
      setProducto({ colegio: '', prenda: '', talla: '', cantidad: '', precio: '' });
    } else {
      alert('Por favor completa todos los campos');
    }
  };

  const procesarCodigo = (codigo) => {
  try {
    // Supongamos que tus códigos están formateados como:
    // colegio-prenda-talla-precio
    const partes = codigo.split('-');

    const [colegio, prenda, talla, precio] = partes;

    setProducto({
      colegio: colegio || '',
      prenda: prenda || '',
      talla: talla || '',
      precio: precio || '',
    });

    setCantidad('');
  } catch (error) {
    console.error('Código inválido:', error);
  }
};

  return (
    <div >
      <Escaner onDetect={procesarCodigo} /> 
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>

      <select name="colegio" value={producto.colegio} onChange={handleChange}>
        <option value="">Nombre plantel</option>
        {colegios.map((c, i) => <option key={i} value={c}>{c}</option>)}
      </select>
      <select name="prenda" value={producto.prenda} onChange={handleChange}>
        <option value="">Producto</option>
        {prendas.map((p, i) => <option key={i} value={p}>{p}</option>)}
      </select>
      <input type="text" name="talla" placeholder="Talla" value={producto.talla} onChange={handleChange} />
      <input type="number" name="cantidad" placeholder="Cantidad" value={producto.cantidad} onChange={handleChange} />
      <input type="number" name="precio" placeholder="Vr. Unitario" value={producto.precio} onChange={handleChange} />
      <button type="submit" style={{
  padding: '5px 15px',
  borderRadius: '8px',
  border: '2px solid black',
  backgroundColor: '#f1f1f1',
  cursor: 'pointer'
}}>
  Agregar
</button>

    </form>
    </div>
    
  );
};

export default InventarioForm;