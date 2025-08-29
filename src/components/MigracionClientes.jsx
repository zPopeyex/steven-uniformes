// ===== OPCIÓN 1: Script para consola del navegador =====
// Ve a tu app en el navegador → F12 → Console → pega este código:

(async () => {
  try {
    console.log("🔄 Iniciando migración de clientes...");

    // Usar las funciones de Firestore que ya están cargadas en tu app
    const { collection, getDocs, updateDoc, doc } =
      window.firebase?.firestore || window.firebase;
    const db = window.db; // Asumiendo que tienes db disponible globalmente

    const clientesSnap = await getDocs(collection(db, "clientes"));
    let actualizados = 0;

    for (const clienteDoc of clientesSnap.docs) {
      const cliente = clienteDoc.data();

      if (!cliente.nombreLower && cliente.nombre) {
        const nombreLower = cliente.nombre.toLowerCase().trim();

        await updateDoc(doc(db, "clientes", clienteDoc.id), {
          nombreLower: nombreLower,
        });

        console.log(`✅ Actualizado: ${cliente.nombre} → ${nombreLower}`);
        actualizados++;
      }
    }

    console.log(
      `🎉 Migración completada. ${actualizados} clientes actualizados.`
    );
  } catch (error) {
    console.error("❌ Error en la migración:", error);
    console.log("💡 Prueba con la OPCIÓN 2 (componente React)");
  }
})();
