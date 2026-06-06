import { useState } from "react";
import { User, KeyRound, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import { toast } from "./Toast";

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
      onCancel(); // Go back
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    paddingRight: "2.5rem"
  };

  const eyeButtonStyle = {
    position: "absolute",
    right: "0.8rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--gray-400)",
    display: "flex",
    alignItems: "center",
    padding: "0"
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: 'var(--gray-50)', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', color: 'var(--primary)' 
          }}>
            <User size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--gray-800)' }}>Datos Generales</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                <span style={{ fontWeight: 600 }}>Código:</span>
                <span style={{ fontFamily: 'monospace', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', color: 'var(--gray-700)' }}>{user.codigo || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                <span style={{ fontWeight: 600 }}>Rol:</span>
                <span style={{ textTransform: 'capitalize', background: 'var(--primary-bg)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{roleLabel || 'Usuario'}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Nombre Completo</label>
            <input
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={user.nombre_completo}
              required
            />
          </div>



          <div style={{ margin: '2rem 0', borderTop: '1px solid var(--gray-100)' }} />

          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--gray-700)' }}>
            <KeyRound size={18} /> Cambiar Contraseña (Opcional)
          </h3>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Contraseña actual</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPassActual ? "text" : "password"}
                value={passActual}
                onChange={(e) => setPassActual(e.target.value)}
                placeholder="Escribe tu contraseña actual"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowPassActual(!showPassActual)} style={eyeButtonStyle}>
                {showPassActual ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Nueva contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPassNueva ? "text" : "password"}
                value={passNueva}
                onChange={(e) => setPassNueva(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                style={inputStyle}
              />
              <button type="button" onClick={() => setShowPassNueva(!showPassNueva)} style={eyeButtonStyle}>
                {showPassNueva ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Repetir nueva contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-input"
                type={showPassRepetir ? "text" : "password"}
                value={passRepetir}
                onChange={(e) => setPassRepetir(e.target.value)}
                placeholder="Repite la nueva contraseña"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn" style={{ flex: 1, background: 'var(--gray-100)', color: 'var(--gray-800)' }} onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? <div className="spinner" /> : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
