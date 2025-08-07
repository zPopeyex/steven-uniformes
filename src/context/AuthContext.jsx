/* eslint react-refresh/only-export-components: "off" */
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, GoogleAuthProvider } from "../firebase/firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          const data = snap.exists() ? snap.data() : {};
          setRole(data.role ?? null);
          setPermissions(data.permissions ?? []);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setRole(null);
          setPermissions([]);
        }
      } else {
        setRole(null);
        setPermissions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const userRef = doc(db, "users", result.user.uid);
  const snap = await getDoc(userRef);
  let userRole = "Vendedor";
  let userPermissions = ["ventas"];
  if (!snap.exists() || !snap.data().role) {
    await setDoc(
      userRef,
      { role: userRole, permissions: userPermissions },
      { merge: true }
    );
  } else {
    userRole = snap.data().role;
    userPermissions = snap.data().permissions || [];
  }
  setRole(userRole);
  setPermissions(userPermissions);
};


  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        permissions,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

