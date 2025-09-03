/* eslint react-refresh/only-export-components: "off" */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, GoogleAuthProvider } from "../firebase/firebaseConfig";

// ---- Permisos base por rol (actualizado para todas las páginas) ----
const ALL_PERM_KEYS = [
  "inventario",
  "stock",
  "ventas",
  "catalogo",
  "modistas",
  "reportes_modistas",
  "usuarios",
  "proveedores",
  "gastos",
  "clientes_pedidos",
];

const DEFAULT_PERMISSIONS = {
  Admin: [...ALL_PERM_KEYS],
  Vendedor: ["ventas"],
  Usuario: [],
};

const emptyPermisos = () =>
  ALL_PERM_KEYS.reduce((acc, k) => {
    acc[k] = false;
    return acc;
  }, {});

const arrayToPermisos = (arr = []) => {
  const p = emptyPermisos();
  (arr || []).forEach((key) => {
    const normalized = key === "reportes" ? "reportes_modistas" : key;
    if (normalized in p) p[normalized] = true;
  });
  return p;
};

const permisosToArray = (permisosObj = {}) =>
  ALL_PERM_KEYS.filter((k) => !!permisosObj[k]);

const normalizeRole = (role) => {
  if (!role) return null;
  const lowered = role.toLowerCase();
  if (lowered === "admin") return "Admin";
  if (lowered === "vendedor") return "Vendedor";
  if (lowered === "usuario") return "Usuario";
  return role;
};

const getDefaultPermissions = (userRole) => {
  const normalized = normalizeRole(userRole);
  return DEFAULT_PERMISSIONS[normalized] ?? [];
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]); // array (legacy/back-compat)
  const [permisos, setPermisos] = useState({}); // objeto booleano por página
  const [name, setName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // 🔽 Pasa todo el código async a esta función:
      const handleUser = async () => {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          try {
            const snap = await getDoc(userRef);
            const data = snap.exists() ? snap.data() : {};
            let userRole = normalizeRole(data.role);
            let userPermissions = data.permissions;
            let userPermisos = data.permisos;
            const userName =
              data.name || data.nickname || currentUser.displayName || "";

            // Asigna permisos si es Admin o faltan permisos
            // Build permisos object
            if (userRole === "Admin") {
              userPermisos = ALL_PERM_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
              userPermissions = DEFAULT_PERMISSIONS.Admin;
            } else {
              if (!userPermisos) {
                userPermisos = arrayToPermisos(userPermissions || getDefaultPermissions(userRole));
              } else {
                // ensure all keys present
                userPermisos = { ...emptyPermisos(), ...userPermisos };
              }
              userPermissions = permisosToArray(userPermisos);
            }

            // Persist migration if needed
            await setDoc(
              userRef,
              { role: userRole, permissions: userPermissions, permisos: userPermisos },
              { merge: true }
            );

            setRole(userRole);
            setPermisos(userPermisos);
            setPermissions(userPermissions);
            setName(userName);
          } catch (error) {
            if (error.code === "permission-denied") {
              console.warn(
                "Insufficient permissions to fetch user data. Using defaults."
              );
              const fallbackRole = "Usuario";
              const defaultPerms = getDefaultPermissions(fallbackRole);
              setRole(fallbackRole);
              setPermisos(arrayToPermisos(defaultPerms));
              setPermissions(defaultPerms);
              setName(currentUser?.displayName || "");
              try {
                await setDoc(
                  userRef,
                  {
                    role: fallbackRole,
                    permissions: defaultPerms,
                    permisos: arrayToPermisos(defaultPerms),
                    name: currentUser?.displayName || "",
                    email: currentUser?.email || "",
                  },
                  { merge: true }
                );
              } catch (writeError) {
                console.warn("Unable to create user document:", writeError);
              }
            } else {
              console.error("Error fetching user data:", error);
            }
          }
        } else {
          setRole(null);
          setPermissions([]);
          setName(null);
          setUser(null);
        }
        setLoading(false);
      };

      handleUser();
    });
    return () => unsubscribe();
  }, []);

  // ---- Login normal ----
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // ---- Login con Google ----
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" }); // Fuerza selector de cuenta (prompt=select_account)
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userRef);

    let userRole = snap.exists() ? normalizeRole(snap.data().role) : "Vendedor";
    userRole = userRole || "Vendedor";
    let userPermissions = snap.exists() ? snap.data().permissions : undefined;
    let userPermisos = snap.exists() ? snap.data().permisos : undefined;
    let userName = snap.exists()
      ? snap.data().name || snap.data().nickname
      : result.user.displayName;

    if (userRole === "Admin") {
      userPermisos = ALL_PERM_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
      userPermissions = DEFAULT_PERMISSIONS.Admin;
      await setDoc(
        userRef,
        { role: userRole, permissions: userPermissions, permisos: userPermisos },
        { merge: true }
      );
    } else if (!snap.exists()) {
      userPermissions = getDefaultPermissions(userRole);
      userPermisos = arrayToPermisos(userPermissions);
      await setDoc(
        userRef,
        {
          role: userRole,
          permissions: userPermissions,
          permisos: userPermisos,
          name: userName || "",
          email: result.user.email,
        },
        { merge: true }
      );
    } else if (!userPermisos) {
      userPermissions = userPermissions || getDefaultPermissions(userRole);
      userPermisos = arrayToPermisos(userPermissions);
      await setDoc(userRef, { permissions: userPermissions, permisos: userPermisos }, { merge: true });
    } else if (!userName && result.user.displayName) {
      userName = result.user.displayName;
      await setDoc(userRef, { name: userName }, { merge: true });
    }

    setRole(userRole);
    setPermisos(userPermisos || arrayToPermisos(userPermissions));
    setPermissions(userPermissions || permisosToArray(userPermisos));
    await setDoc(
      userRef,
      { name: userName || "", email: result.user.email },
      { merge: true }
    );
    setName(userName || "");
  };

  // ---- Registro con email y contraseña ----
  const register = async (email, password, nameValue) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const role = "Usuario";
    const userPermissions = getDefaultPermissions(role);
    try {
      await setDoc(
        doc(db, "users", result.user.uid),
        {
          role,
          permissions: userPermissions,
          name: nameValue || "",
          email: result.user.email,
        },
        { merge: true }
      );
    } catch (error) {
      if (error.code === "permission-denied") {
        console.warn(
          "Insufficient permissions to create user document. Skipping Firestore write."
        );
      } else {
        throw error;
      }
    }
    setRole(role);
    setPermissions(userPermissions);
    setName(nameValue || "");
  };

  // ---- Reset de contraseña ----
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions, // legacy (array)
        permisos, // objeto de permisos por página
        loading,
        login,
        loginWithGoogle,
        register,
        resetPassword,
        logout,
        name,
        email: user?.email || null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
