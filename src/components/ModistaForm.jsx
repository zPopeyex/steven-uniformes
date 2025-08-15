// 📄 src/components/ModistaForm.jsx
import React, { useState, useEffect } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";

const ModistaForm = ({ modista, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    habilidades: [{ nombre: "", precio: "" }],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (modista) {
      setFormData({
        nombre: modista.nombre || "",
        telefono: modista.telefono || "",
        direccion: modista.direccion || "",
        habilidades:
          modista.habilidades.length > 0
            ? modista.habilidades
            : [{ nombre: "", precio: "" }],
      });
    }
  }, [modista]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar error cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleHabilidadChange = (index, field, value) => {
    const newHabilidades = [...formData.habilidades];
    newHabilidades[index] = { ...newHabilidades[index], [field]: value };
    setFormData((prev) => ({ ...prev, habilidades: newHabilidades }));

    // Limpiar error de habilidades cuando el usuario empiece a escribir
    if (errors.habilidades) {
      setErrors((prev) => ({ ...prev, habilidades: "" }));
    }
  };

  const addHabilidad = () => {
    setFormData((prev) => ({
      ...prev,
      habilidades: [...prev.habilidades, { nombre: "", precio: "" }],
    }));
  };

  const removeHabilidad = (index) => {
    if (formData.habilidades.length > 1) {
      const newHabilidades = formData.habilidades.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, habilidades: newHabilidades }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio";
    }

    // Validar que al menos una habilidad esté completa
    const habilidadesValidas = formData.habilidades.filter(
      (h) => h.nombre.trim() && h.precio
    );

    if (habilidadesValidas.length === 0) {
      newErrors.habilidades = "Debe agregar al menos una habilidad con precio";
    }

    // Validar que todos los precios sean números válidos
    const preciosInvalidos = formData.habilidades.some(
      (h) =>
        h.nombre.trim() &&
        (!h.precio || isNaN(h.precio) || Number(h.precio) <= 0)
    );

    if (preciosInvalidos) {
      newErrors.habilidades =
        "Todos los precios deben ser números válidos mayores a 0";
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Filtrar solo las habilidades que tienen nombre y precio
    const habilidadesCompletas = formData.habilidades
      .filter((h) => h.nombre.trim() && h.precio)
      .map((h) => ({
        nombre: h.nombre.trim(),
        precio: Number(h.precio),
      }));

    const dataToSubmit = {
      nombre: formData.nombre.trim(),
      telefono: formData.telefono.trim(),
      direccion: formData.direccion.trim(),
      habilidades: habilidadesCompletas,
    };

    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="st-inv-form">
      <div style={{ display: "grid", gap: "20px" }}>
        {/* Información Personal */}
        <div>
          <h3 style={{ marginBottom: "15px", color: "var(--st-text)" }}>
            Información Personal
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Nombre Completo *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="st-inv-field"
                placeholder="Ej: María González"
                style={{ borderColor: errors.nombre ? "#dc2626" : "" }}
              />
              {errors.nombre && (
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: "0.8em",
                    marginTop: "4px",
                  }}
                >
                  {errors.nombre}
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="st-inv-field"
                placeholder="Ej: 300 123 4567"
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                  color: "var(--st-text)",
                }}
              >
                Dirección
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="st-inv-field"
                placeholder="Ej: Calle 123 #45-67"
              />
            </div>
          </div>
        </div>

        {/* Habilidades */}
        <div>
          <h3 style={{ marginBottom: "15px", color: "var(--st-text)" }}>
            Habilidades y Precios *
          </h3>
          <div
            style={{
              border: "2px solid var(--st-border)",
              borderRadius: "var(--st-radius)",
              padding: "20px",
              background: "#fafbfc",
            }}
          >
            {formData.habilidades.map((habilidad, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr auto",
                  gap: "12px",
                  alignItems: "end",
                  marginBottom: "15px",
                }}
              >
                <div>
                  {index === 0 && (
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        color: "var(--st-text)",
                        fontSize: "0.9em",
                      }}
                    >
                      Habilidad
                    </label>
                  )}
                  <input
                    type="text"
                    value={habilidad.nombre}
                    onChange={(e) =>
                      handleHabilidadChange(index, "nombre", e.target.value)
                    }
                    className="st-inv-field"
                    placeholder="Ej: Camibuso tipo polo"
                  />
                </div>

                <div>
                  {index === 0 && (
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontWeight: "500",
                        color: "var(--st-text)",
                        fontSize: "0.9em",
                      }}
                    >
                      Precio ($)
                    </label>
                  )}
                  <input
                    type="number"
                    value={habilidad.precio}
                    onChange={(e) =>
                      handleHabilidadChange(index, "precio", e.target.value)
                    }
                    className="st-inv-field"
                    placeholder="4500"
                    step="500"
                    min="0"
                  />
                </div>

                <div>
                  {formData.habilidades.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHabilidad(index)}
                      style={{
                        background: "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--st-radius)",
                        padding: "8px 12px",
                        cursor: "pointer",
                        height: "44px",
                      }}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addHabilidad}
              className="st-inv-btn-outline"
              style={{ marginTop: "10px" }}
            >
              <FaPlus /> Agregar Habilidad
            </button>

            {errors.habilidades && (
              <div
                style={{
                  color: "#dc2626",
                  fontSize: "0.9em",
                  marginTop: "8px",
                }}
              >
                {errors.habilidades}
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            paddingTop: "20px",
            borderTop: "1px solid var(--st-border)",
          }}
        >
          <button type="button" onClick={onCancel} className="st-inv-btn-ghost">
            Cancelar
          </button>
          <button type="submit" className="st-inv-btn-primary">
            {modista ? "Actualizar" : "Guardar"} Modista
          </button>
        </div>
      </div>
    </form>
  );
};

export default ModistaForm;
