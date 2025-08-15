// 📄 src/pages/Modistas.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext.jsx";
import { FaUserTie, FaFilter, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import ModistaForm from "../components/ModistaForm";
import "../styles/inventario.css";

const removeDiacritics = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N");

const norm = (s) =>
  removeDiacritics(
    String(s || "")
      .trim()
      .toLowerCase()
  );

const Modistas = () => {
  const [modistas, setModistas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingModista, setEditingModista] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const { role } = useAuth();

  const cargarModistas = async () => {
    try {
      const q = query(collection(db, "modistas"), orderBy("nombre"));
      const snap = await getDocs(q);
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setModistas(docs);
    } catch (error) {
      console.error("Error cargando modistas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarModistas();
  }, []);

  const handleAgregarModista = async (modistaData) => {
    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }

    try {
      await addDoc(collection(db, "modistas"), {
        ...modistaData,
        fechaCreacion: new Date(),
      });
      cargarModistas();
      setShowForm(false);
      alert("Modista agregada correctamente");
    } catch (error) {
      console.error("Error agregando modista:", error);
      alert("Error al agregar modista");
    }
  };

  const handleEditarModista = async (modistaData) => {
    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }

    try {
      const docRef = doc(db, "modistas", editingModista.id);
      await updateDoc(docRef, {
        ...modistaData,
        fechaActualizacion: new Date(),
      });
      cargarModistas();
      setShowForm(false);
      setEditingModista(null);
      alert("Modista actualizada correctamente");
    } catch (error) {
      console.error("Error actualizando modista:", error);
      alert("Error al actualizar modista");
    }
  };

  const handleEliminarModista = async (id) => {
    if (role !== "Admin") {
      alert("Acceso restringido");
      return;
    }

    if (
      window.confirm(
        "¿Estás seguro de eliminar esta modista? Esta acción no se puede deshacer."
      )
    ) {
      try {
        await deleteDoc(doc(db, "modistas", id));
        cargarModistas();
        alert("Modista eliminada correctamente");
      } catch (error) {
        console.error("Error eliminando modista:", error);
        alert("Error al eliminar modista");
      }
    }
  };

  const openAddForm = () => {
    setEditingModista(null);
    setShowForm(true);
  };

  const openEditForm = (modista) => {
    setEditingModista(modista);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingModista(null);
  };

  const filteredModistas = useMemo(() => {
    const terms = norm(search).split(/\s+/).filter(Boolean);
    if (!terms.length) return modistas;
    return modistas.filter((modista) => {
      const haystack = [
        modista.nombre,
        modista.telefono,
        modista.direccion,
        ...modista.habilidades.map((h) => h.nombre),
      ]
        .map(norm)
        .join(" ");
      return terms.every((t) => haystack.includes(t));
    });
  }, [modistas, search]);

  const handleFilterClick = () => {
    inputRef.current?.focus();
  };

  const stats = useMemo(() => {
    const totalHabilidades = modistas.reduce(
      (sum, m) => sum + m.habilidades.length,
      0
    );
    const promedioHabilidades =
      modistas.length > 0 ? (totalHabilidades / modistas.length).toFixed(1) : 0;
    return {
      total: modistas.length,
      totalHabilidades,
      promedioHabilidades,
    };
  }, [modistas]);

  if (loading) {
    return (
      <div className="st-inv-page">
        <div
          style={{
            fontWeight: "bold",
            fontSize: "18px",
            backgroundColor: "#f4f4f4",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          ⏳ Cargando modistas...
        </div>
      </div>
    );
  }

  return (
    <div className="st-inv-page">
      {/* Estadísticas */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaUserTie />
          <h2 className="st-inv-card-title">Estadísticas de Modistas</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0052CC, #0040A3)",
              color: "white",
              padding: "20px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2em", fontWeight: "bold" }}>
              {stats.total}
            </div>
            <div style={{ opacity: 0.9 }}>Total Modistas</div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #21ba45, #16a330)",
              color: "white",
              padding: "20px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2em", fontWeight: "bold" }}>
              {stats.totalHabilidades}
            </div>
            <div style={{ opacity: 0.9 }}>Total Habilidades</div>
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #f39c12, #e67e22)",
              color: "white",
              padding: "20px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2em", fontWeight: "bold" }}>
              {stats.promedioHabilidades}
            </div>
            <div style={{ opacity: 0.9 }}>Promedio por Modista</div>
          </div>
        </div>
      </div>

      {/* Formulario de Modista */}
      {showForm && (
        <div className="st-inv-card">
          <div className="st-inv-card-header">
            <FaUserTie />
            <h2 className="st-inv-card-title">
              {editingModista ? "Editar Modista" : "Agregar Nueva Modista"}
            </h2>
          </div>
          <ModistaForm
            modista={editingModista}
            onSubmit={
              editingModista ? handleEditarModista : handleAgregarModista
            }
            onCancel={closeForm}
          />
        </div>
      )}

      {/* Lista de Modistas */}
      <div className="st-inv-card">
        <div className="st-inv-card-header">
          <FaUserTie />
          <h2 className="st-inv-card-title">Gestión de Modistas</h2>
        </div>

        <div className="st-inv-history-bar">
          <div className="st-inv-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar modista por nombre, teléfono o habilidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="st-inv-field"
            />
          </div>
          <button
            type="button"
            className="st-inv-btn-outline"
            onClick={handleFilterClick}
          >
            <FaFilter /> Filtrar
          </button>
          {role === "Admin" && (
            <button
              type="button"
              className="st-inv-btn-primary"
              onClick={openAddForm}
            >
              <FaPlus /> Agregar Modista
            </button>
          )}
        </div>

        <div className="st-inv-table-wrapper">
          {filteredModistas.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#666",
              }}
            >
              {search
                ? "No se encontraron modistas"
                : "No hay modistas registradas"}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredModistas.map((modista) => (
                <div
                  key={modista.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--st-border)",
                    borderLeft: "4px solid var(--st-primary)",
                    borderRadius: "var(--st-radius)",
                    padding: "20px",
                    boxShadow: "var(--st-shadow)",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "15px",
                      paddingBottom: "15px",
                      borderBottom: "2px solid #f8f9fa",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        color: "var(--st-primary)",
                        fontSize: "1.2em",
                      }}
                    >
                      {modista.nombre}
                    </h3>
                    {role === "Admin" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="st-inv-btn-outline"
                          onClick={() => openEditForm(modista)}
                          style={{ padding: "6px 12px", fontSize: "0.8em" }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="st-inv-btn-delete"
                          onClick={() => handleEliminarModista(modista.id)}
                          style={{ padding: "6px 12px", fontSize: "0.8em" }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Información */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "15px",
                    }}
                  >
                    {modista.telefono && (
                      <div>
                        <strong style={{ color: "#666", fontSize: "0.9em" }}>
                          📞 Teléfono:
                        </strong>
                        <br />
                        {modista.telefono}
                      </div>
                    )}
                    {modista.direccion && (
                      <div>
                        <strong style={{ color: "#666", fontSize: "0.9em" }}>
                          📍 Dirección:
                        </strong>
                        <br />
                        {modista.direccion}
                      </div>
                    )}
                  </div>

                  {/* Habilidades */}
                  <div>
                    <strong
                      style={{
                        color: "#333",
                        marginBottom: "10px",
                        display: "block",
                      }}
                    >
                      🧵 Habilidades y Precios
                    </strong>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                      }}
                    >
                      {modista.habilidades.map((habilidad, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "#f8f9fa",
                            padding: "8px 12px",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ fontWeight: "500" }}>
                            {habilidad.nombre}
                          </span>
                          <span
                            style={{
                              color: "var(--st-success)",
                              fontWeight: "600",
                            }}
                          >
                            ${habilidad.precio.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modistas;
