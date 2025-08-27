import React from "react";
import { FaSave } from "react-icons/fa";

export default function ClientModal({
  open,
  editingClient,
  clientForm,
  setClientForm,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Tratamiento</label>
            <select
              className="form-select"
              value={clientForm.tratamiento || "Sr."}
              onChange={(e) =>
                setClientForm({ ...clientForm, tratamiento: e.target.value })
              }
            >
              <option>Sr.</option>
              <option>Sra.</option>
            </select>
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              className="form-input"
              value={clientForm.nombre}
              onChange={(e) =>
                setClientForm({ ...clientForm, nombre: e.target.value })
              }
              placeholder="Nombre completo del cliente"
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Cédula/NIT</label>
              <input
                type="text"
                className="form-input"
                value={clientForm.cedulaNit}
                onChange={(e) =>
                  setClientForm({ ...clientForm, cedulaNit: e.target.value })
                }
                placeholder="Identificación"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono *</label>
              <input
                type="tel"
                className="form-input"
                value={clientForm.telefono}
                onChange={(e) =>
                  setClientForm({ ...clientForm, telefono: e.target.value })
                }
                placeholder="Número de contacto"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input
              type="text"
              className="form-input"
              value={clientForm.direccion}
              onChange={(e) =>
                setClientForm({ ...clientForm, direccion: e.target.value })
              }
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={clientForm.notas}
              onChange={(e) =>
                setClientForm({ ...clientForm, notas: e.target.value })
              }
              placeholder="Notas adicionales sobre el cliente"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            <FaSave /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
