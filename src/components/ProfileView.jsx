import { useState } from "react";
import { User, KeyRound, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { toast } from "./Toast";
import "../styles/components/profile-view.css";

export default function ProfileView({ user, roleLabel, onUpdateUser, onCancel }) {
  const [nombre, setNombre] = useState(user.nombre_completo || "");
  const [passActual, setPassActual] = useState("");
  const [passNueva, setPassNueva] = useState("");
  const [passRepetir, setPassRepetir] = useState("");

  const [showPassActual, setShowPassActual] = useState(false);
  const [showPassNueva, setShowPassNueva] = useState(false);
  const [showPassRepetir, setShowPassRepetir] = useState(false);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (passNueva || passRepetir) {
      if (!passActual) {
        toast.error("Debes ingresar tu contraseña actual");
        return;
      }
      if (passNueva !== passRepetir) {
        toast.error("Las contraseñas nuevas no coinciden");
        return;
      }
      if (passNueva.length < 4) {
        toast.error("La nueva contraseña debe tener mínimo 4 caracteres");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { nombre_completo: nombre.trim() };
      if (passNueva) {
        payload.pass = passNueva;
        payload.passActual = passActual;
      }

      const res = await api.updatePerfil(user.id, payload);
      toast.success("Perfil actualizado correctamente");
      onUpdateUser(res.usuario);
      onCancel();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-view">
      <div className="card">
        {/* Header */}
        <div className="profile-view__header">
          <div className="profile-view__avatar">
            <User size={24} />
          </div>
          <div>
            <h2 className="profile-view__title">Datos Generales</h2>
            <div className="profile-view__meta">
              <div className="profile-view__chip">
                <span className="profile-view__chip-label">Código:</span>
                <span className="profile-view__chip-val">{user.codigo || "N/A"}</span>
              </div>
              <div className="profile-view__chip">
                <span className="profile-view__chip-label">Rol:</span>
                <span className="profile-view__chip-val profile-view__chip-val--role">
                  {roleLabel || "Usuario"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={user.nombre_completo}
              required
            />
          </div>

          <hr className="profile-view__divider" />

          <h3 className="profile-view__section-title">
            <KeyRound size={18} /> Cambiar Contraseña (Opcional)
          </h3>

          {/* Contraseña actual */}
          <div className="form-group">
            <label className="form-label">Contraseña actual</label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPassActual ? "text" : "password"}
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Escribe tu contraseña actual"
                style={{ paddingRight: "2.5rem" }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassActual(!showPassActual)}>
                {showPassActual ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="form-group">
            <label className="form-label">Nueva contraseña</label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPassNueva ? "text" : "password"}
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                style={{ paddingRight: "2.5rem" }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassNueva(!showPassNueva)}>
                {showPassNueva ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Repetir nueva contraseña */}
          <div className="form-group">
            <label className="form-label">Repetir nueva contraseña</label>
            <div className="password-input-wrap">
              <input
                className="form-input"
                type={showPassRepetir ? "text" : "password"}
                value={passRepetir}
                onChange={(e) => setPassRepetir(e.target.value)}
                placeholder="Repite la nueva contraseña"
                style={{ paddingRight: "2.5rem" }}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassRepetir(!showPassRepetir)}>
                {showPassRepetir ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-view__actions">
            <button
              type="button"
              className="btn"
              style={{ flex: 1, background: "var(--gray-100)", color: "var(--gray-800)" }}
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? <div className="spinner" /> : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
