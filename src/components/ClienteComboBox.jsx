import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import ClientModal from "./clients/ClientModal";

const ClienteComboBox = ({
  selectedCliente,
  onClienteChange,
  placeholder = "Buscar cliente...",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Form para nuevo cliente
  const [clientForm, setClientForm] = useState({
    nombre: "",
    cedulaNit: "",
    telefono: "",
    direccion: "",
    notas: "",
  });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced search
  const debouncedSearch = useCallback((term) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchClientes(term);
    }, 250);
  }, []);

  // Buscar clientes en Firestore
  const searchClientes = async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const term = searchValue.toLowerCase().trim();
      const results = [];

      // Buscar por nombre (prefijo)
      const nombreQuery = query(
        collection(db, "clientes"),
        where("nombreLower", ">=", term),
        where("nombreLower", "<=", term + "\uf8ff")
      );
      const nombreSnap = await getDocs(nombreQuery);

      // Buscar por teléfono
      let telefonoResults = [];
      if (/^\d/.test(term)) {
        // Si empieza con número
        const telefonoQuery = query(
          collection(db, "clientes"),
          where("telefono", ">=", term),
          where("telefono", "<=", term + "\uf8ff")
        );
        const telefonoSnap = await getDocs(telefonoQuery);
        telefonoResults = telefonoSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Buscar por documento exacto
      let documentoResults = [];
      if (/^\d+$/.test(term)) {
        // Si es solo números
        // Buscar en ambos campos para compatibilidad
        const [documentoQuery1, documentoQuery2] = await Promise.all([
          getDocs(
            query(collection(db, "clientes"), where("cedulaNit", "==", term))
          ),
          getDocs(
            query(collection(db, "clientes"), where("documento", "==", term))
          ),
        ]);

        const docs1 = documentoQuery1.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const docs2 = documentoQuery2.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Combinar y eliminar duplicados
        const allDocs = [...docs1, ...docs2];
        documentoResults = allDocs.reduce((acc, current) => {
          const existing = acc.find((item) => item.id === current.id);
          if (!existing) acc.push(current);
          return acc;
        }, []);
      }

      // Combinar y ordenar resultados
      const nombreResults = nombreSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        score: 1,
      }));
      const telefonoScored = telefonoResults.map((doc) => ({
        ...doc,
        score: 2,
      }));
      const documentoScored = documentoResults.map((doc) => ({
        ...doc,
        score: 3,
      }));

      // Eliminar duplicados y ordenar por score
      const allResults = [
        ...nombreResults,
        ...telefonoScored,
        ...documentoScored,
      ];
      const uniqueResults = allResults.reduce((acc, current) => {
        const existing = acc.find((item) => item.id === current.id);
        if (!existing || current.score < existing.score) {
          return acc.filter((item) => item.id !== current.id).concat(current);
        }
        return acc;
      }, []);

      // Ordenar por score y limitar a 8 resultados
      results.push(
        ...uniqueResults.sort((a, b) => a.score - b.score).slice(0, 8)
      );

      setSuggestions(results);
    } catch (error) {
      console.error("Error buscando clientes:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio en input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    setHighlightedIndex(-1);

    if (value.trim()) {
      debouncedSearch(value);
    } else {
      setSuggestions([]);
      if (selectedCliente) {
        onClienteChange(null);
      }
    }
  };

  // Seleccionar cliente
  const selectCliente = (cliente) => {
    setSearchTerm(cliente.nombre);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onClienteChange({
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono || "",
      documento: cliente.cedulaNit || cliente.documento || "",
    });
  };

  // Manejar teclado
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          selectCliente(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Manejar focus del input
  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#0052cc";
    e.target.style.boxShadow = "0 0 0 3px rgba(0, 82, 204, 0.1)";
    if (searchTerm) {
      setIsOpen(true);
    }
  };

  // Manejar blur del input
  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#d1d5db";
    e.target.style.boxShadow = "none";
  };

  // Crear nuevo cliente
  const handleSaveClient = async () => {
    if (!clientForm.nombre || !clientForm.telefono) {
      alert("Por favor complete nombre y teléfono");
      return;
    }

    try {
      const nuevoCliente = {
        nombre: clientForm.nombre.trim(),
        nombreLower: clientForm.nombre.trim().toLowerCase(),
        telefono: clientForm.telefono.trim(),
        cedulaNit: clientForm.cedulaNit.trim() || null,
        direccion: clientForm.direccion.trim() || null,
        notas: clientForm.notas.trim() || null,
        fechaCreacion: serverTimestamp(),
        activo: true,
      };

      const docRef = await addDoc(collection(db, "clientes"), nuevoCliente);

      // Seleccionar el cliente recién creado
      const clienteCreado = {
        id: docRef.id,
        nombre: nuevoCliente.nombre,
        telefono: nuevoCliente.telefono,
        documento: nuevoCliente.documento || "",
      };

      selectCliente(clienteCreado);

      // Resetear formulario y cerrar modal
      setClientForm({
        nombre: "",
        cedulaNit: "",
        telefono: "",
        direccion: "",
        notas: "",
      });
      setShowModal(false);

      alert("Cliente creado exitosamente");
    } catch (error) {
      console.error("Error creando cliente:", error);
      alert("Error al crear cliente");
    }
  };

  // Efectos
  useEffect(() => {
    if (selectedCliente?.nombre && searchTerm !== selectedCliente.nombre) {
      setSearchTerm(selectedCliente.nombre);
    }
  }, [selectedCliente]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        listRef.current &&
        !listRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="cliente-combobox" style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            style={{
              width: "250px",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "12px",
              fontSize: "14px",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
              marginRight: "5px",
            }}
            aria-label="Buscar cliente"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            role="combobox"
          />

          {loading && (
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6b7280",
              }}
            >
              ⏳
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#0052cc",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            whiteSpace: "nowrap",
            transition: "background-color 0.2s",
            minWidth: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#0040a3")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#0052cc")}
          aria-label="Crear nuevo cliente"
        >
          <span style={{ fontSize: "14px" }}>+</span>
          <span>Nuevo</span>
        </button>
      </div>

      {/* Lista de sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #d1d5db",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((cliente, index) => (
            <div
              key={cliente.id}
              role="option"
              aria-selected={highlightedIndex === index}
              style={{
                padding: "12px 16px",
                cursor: "pointer",
                borderBottom:
                  index < suggestions.length - 1 ? "1px solid #f3f4f6" : "none",
                backgroundColor:
                  highlightedIndex === index ? "#f8faff" : "white",
                transition: "background-color 0.1s",
              }}
              onClick={() => selectCliente(cliente)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "2px",
                }}
              >
                {cliente.nombre}
                {cliente.telefono && ` — ${cliente.telefono}`}
                {(cliente.cedulaNit || cliente.documento) &&
                  ` — ${cliente.cedulaNit || cliente.documento}`}
              </div>
              {cliente.createdAt && (
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                  Creado:{" "}
                  {cliente.createdAt.toDate?.()?.toLocaleDateString() ||
                    "Fecha no disponible"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para nuevo cliente */}
      <ClientModal
        open={showModal}
        editingClient={null}
        clientForm={clientForm}
        setClientForm={setClientForm}
        onClose={() => {
          setShowModal(false);
          setClientForm({
            nombre: "",
            cedulaNit: "",
            telefono: "",
            direccion: "",
            notas: "",
          });
        }}
        onSave={handleSaveClient}
      />
    </div>
  );
};

export default ClienteComboBox;
