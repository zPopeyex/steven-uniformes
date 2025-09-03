import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaExclamationCircle, FaCheckCircle } from "react-icons/fa";
import LogoImage from "../assets/Logo.jpg";
import "../styles/login.css";

const Login = () => {
  const { login, loginWithGoogle, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nickname: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Correo inválido";
    }
    if (mode !== "reset" && formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setFormData({ email: "", password: "", nickname: "" });
    setErrors({});
    setAuthError("");
    setMessage("");
  };

  const translateFirebaseError = (error) => {
    const errorCode = error.code;
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/email-already-in-use':
        return 'El correo ya está en uso';
      case 'auth/weak-password':
        return 'La contraseña es muy débil';
      case 'auth/invalid-email':
        return 'Correo electrónico inválido';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet';
      default:
        return 'Error de autenticación. Verifica tus datos';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setMessage("");
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
        navigate("/");
      } else if (mode === "register") {
        await register(formData.email, formData.password, formData.nickname);
        navigate("/");
      } else if (mode === "reset") {
        await resetPassword(formData.email);
        setMessage("Se envió un correo para restablecer la contraseña.");
      }
    } catch (error) {
      console.error("Error de autenticación:", error);
      setAuthError(translateFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setAuthError("");
    setMessage("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (error) {
      console.error("Error con Google:", error);
      setAuthError(translateFirebaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    if (mode === "reset") {
      return formData.email && !errors.email;
    }
    return (
      formData.email &&
      formData.password &&
      !errors.email &&
      !errors.password
    );
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img 
          src={LogoImage} 
          alt="Steven Uniformes Logo" 
          className="login-logo"
        />
        
        <div className="login-header">
          <h1 className="login-title">
            {mode === "register"
              ? "Crear cuenta"
              : mode === "reset"
              ? "Recuperar contraseña"
              : "Iniciar sesión"}
          </h1>
          <p className="login-subtitle">
            {mode === "register"
              ? "Completa los datos para registrarte"
              : mode === "reset"
              ? "Ingresa tu correo para restablecer la contraseña"
              : "Bienvenido de nuevo al sistema"}
          </p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className={`login-form ${loading ? 'loading' : ''}`} 
          noValidate
        >
          <div className={`login-input-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="email" className="login-label">
              Correo electrónico
            </label>
            <div className="login-input-wrapper login-input-icon">
              <FaEnvelope className="login-input-icon-el" />
              <input
                id="email"
                name="email"
                type="email"
                className="login-input"
                value={formData.email}
                onChange={handleChange}
                onBlur={validate}
                placeholder="tucorreo@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <div className="login-error" role="alert">
                <FaExclamationCircle />
                {errors.email}
              </div>
            )}
          </div>

          {mode !== "reset" && (
            <div className={`login-input-group ${errors.password ? 'has-error' : ''}`}>
              <label htmlFor="password" className="login-label">
                Contraseña
              </label>
              <div className="login-input-wrapper login-input-icon">
                <FaLock className="login-input-icon-el" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={validate}
                  placeholder="Ingresa tu contraseña"
                  required={mode !== "reset"}
                  autoComplete="current-password"
                  style={{ paddingRight: '50px' }}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <div className="login-error" role="alert">
                  <FaExclamationCircle />
                  {errors.password}
                </div>
              )}
            </div>
          )}

          {mode === "register" && (
            <div className="login-input-group">
              <label htmlFor="nickname" className="login-label">
                Apodo (opcional)
              </label>
              <div className="login-input-wrapper">
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  className="login-input"
                  value={formData.nickname}
                  onChange={handleChange}
                  placeholder="Tu nombre en el sistema"
                  autoComplete="nickname"
                />
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="login-checkbox-group">
              <input
                id="remember"
                type="checkbox"
                className="login-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="login-checkbox-label">
                Recordarme
              </label>
            </div>
          )}

          {authError && (
            <div className="login-form-error" role="alert">
              <FaExclamationCircle />
              {authError}
            </div>
          )}
          
          {message && (
            <div className="login-form-success" role="status">
              <FaCheckCircle />
              {message}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={!canSubmit() || loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <div className="login-button-spinner"></div>
                Procesando...
              </>
            ) : (
              <>
                {mode === "register" ? "Crear cuenta" : 
                 mode === "reset" ? "Enviar correo" : "Ingresar"}
              </>
            )}
          </button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="login-divider">o continúa con</div>
            <button
              type="button"
              className="login-google-button"
              onClick={handleGoogle}
              disabled={loading}
              aria-label="Iniciar sesión con Google"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                className="login-google-icon"
              />
              Google
            </button>
          </>
        )}

        <div className="login-options">
          {mode === "login" && (
            <>
              <button
                type="button"
                className="login-link"
                onClick={() => switchMode("reset")}
              >
                ¿Olvidaste tu contraseña?
              </button>
              <div className="login-small-text">
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  className="login-link"
                  onClick={() => switchMode("register")}
                >
                  Regístrate aquí
                </button>
              </div>
            </>
          )}
          {mode === "register" && (
            <div className="login-small-text">
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="login-link"
                onClick={() => switchMode("login")}
              >
                Inicia sesión
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="login-link"
              onClick={() => switchMode("login")}
            >
              ← Volver al inicio de sesión
            </button>
          )}
        </div>

        <footer className="login-footer">
          <a href="#" target="_blank" rel="noopener noreferrer">
            Términos de Servicio
          </a>
          {" "}·{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">
            Política de Privacidad
          </a>
        </footer>

        {loading && (
          <div className="login-loader-overlay">
            <div className="login-loader"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

