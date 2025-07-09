import React, { useState, useEffect } from 'react';
import InventarioForm from '../components/InventarioForm';
import InventarioTable from '../components/InventarioTable';
import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';




const Inventario = () => {
  const [productos, setProductos] = useState([]);

  const cargarProductos = async () => {
    const productosRef = collection(db, 'inventario');
    const snapshot = await getDocs(productosRef);
const productosData = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .sort((a, b) => b.timestamp - a.timestamp); // 👈 orden descendente// orden descendente

    setProductos(productosData);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const agregarProducto = async (producto) => {
    const productosRef = collection(db, 'inventario');
    await addDoc(productosRef, producto);
    cargarProductos(); // recargar después de guardar
  };
  
const eliminarProducto = async (id) => {
  try {
    const ref = doc(db, 'inventario', id); // ✅ esta es la forma correcta
    await deleteDoc(ref);
    cargarProductos();
  } catch (error) {
    console.error('Error eliminando producto:', error);
  }
};


  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Inventario</h1>
      <InventarioForm onAgregar={agregarProducto} />
      <InventarioTable productos={productos} onEliminar={eliminarProducto} />
    </div>
  );
};

export default Inventario;
