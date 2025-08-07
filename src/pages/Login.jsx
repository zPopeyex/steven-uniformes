import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Login.module.css";

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
      setAuthError("Error de autenticación. Verifica tus datos.");
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
      setAuthError("Error al iniciar sesión con Google.");
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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {mode === "register"
            ? "Crear cuenta"
            : mode === "reset"
            ? "Recuperar contraseña"
            : "Iniciar sesión"}
        </h1>
        <p className={styles.subtitle}>
          {mode === "register"
            ? "Bienvenido, completa los datos para registrarte."
            : mode === "reset"
            ? "Ingresa tu correo para restablecer la contraseña."
            : "Bienvenido de nuevo"}
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              value={formData.email}
              onChange={handleChange}
              onBlur={validate}
              required
            />
            {errors.email && (
              <span className={styles.error} role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {mode !== "reset" && (
            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Contraseña
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={validate}
                  required={mode !== "reset"}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && (
                <span className={styles.error} role="alert">
                  {errors.password}
                </span>
              )}
            </div>
          )}

          {mode === "register" && (
            <div className={styles.inputGroup}>
              <label htmlFor="nickname" className={styles.label}>
                Apodo (opcional)
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                className={styles.input}
                value={formData.nickname}
                onChange={handleChange}
              />
            </div>
          )}

          {authError && (
            <div className={styles.error} role="alert">
              {authError}
            </div>
          )}
          {message && (
            <div className={styles.success} role="status">
              {message}
            </div>
          )}

          <button
            type="submit"
            className={styles.button}
            disabled={!canSubmit() || loading}
            aria-busy={loading}
          >
            {mode === "reset" ? "Enviar" : "Continuar"}
          </button>
        </form>

        {mode !== "reset" && (
          <button
            type="button"
            className={styles.googleButton}
            onClick={handleGoogle}
            disabled={loading}
            aria-label="Iniciar sesión con Google"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className={styles.googleIcon}
            />
            Continuar con Google
          </button>
        )}

        <div className={styles.options}>
          {mode === "login" && (
            <>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => switchMode("reset")}
              >
                ¿Olvidaste tu contraseña?
              </button>
              <div className={styles.smallText}>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => switchMode("register")}
                >
                  Regístrate
                </button>
              </div>
            </>
          )}
          {mode === "register" && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => switchMode("login")}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => switchMode("login")}
            >
              Volver al inicio de sesión
            </button>
          )}
        </div>

        <footer className={styles.footer}>
          <a href="#" target="_blank" rel="noopener noreferrer">
            Términos
          </a>
          {" "}·{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">
            Política de Privacidad
          </a>
        </footer>

        {loading && (
          <div className={styles.loaderOverlay}>
            <div className={styles.loader} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

