# Sistema de gestión de uniformes

Aplicación web para administrar el flujo completo de uniformes de la empresa. Permite controlar inventario, registrar ventas y gestionar encargos de clientes desde una sola interfaz.

## Funcionalidades
- **Inventario**: alta, baja y modificación de prendas disponibles.
- **Ventas**: registro de ventas y emisión de códigos QR para los comprobantes.
- **Encargos**: seguimiento de pedidos y estado de preparación.

## Requisitos
- Node.js 18+
- npm 9+

## Configuración
1. Clonar el repositorio.
2. Crear un archivo `.env` con las credenciales de Firebase requeridas.
3. Instalar las dependencias:
   ```bash
   npm install
   ```

## Ejecución
- Levantar el servidor de desarrollo:
  ```bash
  npm run dev
  ```
  La aplicación se sirve en [http://localhost:5173](http://localhost:5173).

## Despliegue
- Generar la build de producción:
  ```bash
  npm run build
  ```
- Previsualizar la build localmente:
  ```bash
  npm run preview
  ```
- Para un despliegue en Vercel, use el script:
  ```bash
  npm run vercel-build
  ```
  y luego suba el directorio `dist/` a su cuenta de Vercel.

