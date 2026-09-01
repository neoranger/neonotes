import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, User, Mail } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLoginMode) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al autenticar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <button className="toolbar-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-field">
            <label className="form-label">
              Nombre de usuario o Email
            </label>
            <div className="input-wrap">
              <input
                type="text"
                required
                className="with-icon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario o correo"
              />
              <User size={16} className="input-icon" />
            </div>
          </div>

          {!isLoginMode && (
            <div className="form-field">
              <label className="form-label">
                Correo Electrónico
              </label>
              <div className="input-wrap">
                <input
                  type="email"
                  required
                  className="with-icon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
                <Mail size={16} className="input-icon" />
              </div>
            </div>
          )}

          <div className="form-field">
            <label className="form-label">
              Contraseña
            </label>
            <div className="input-wrap">
              <input
                type="password"
                required
                minLength={8}
                className="with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres con letras y números"
              />
              <Lock size={16} className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={submitting} style={{ marginTop: '0.5rem' }}>
            {submitting ? 'Procesando...' : isLoginMode ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-switch">
          {isLoginMode ? '¿No tienes una cuenta? ' : '¿Ya tienes una cuenta? '}
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
          >
            {isLoginMode ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
