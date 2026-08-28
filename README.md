# NeoNotes 📝

**NeoNotes** es una aplicación web moderna y elegante para tomar notas en **Markdown**, organizar mediante **carpetas**, sincronizar entre múltiples dispositivos, utilizar **offline** y desplegar fácilmente mediante **Docker**.

---

## ✨ Características Clave

- 📁 **Organización en Carpetas**: Crea, renombra, personaliza colores y organiza tus notas en carpetas.
- ✍️ **Editor Markdown Completo**: Vista previa en vivo (Split view), resaltado de sintaxis, tablas, listas de tareas, citas y exportación a archivos `.md`.
- 🔄 **Sincronización Multi-Equipo**: Algoritmo de sincronización en tiempo real basado en resolución de conflictos LWW (Last-Write-Wins).
- 📶 **Soporte Offline (PWA & IndexedDB)**: Funciona sin conexión a internet. Crea y edita notas offline y se sincronizan automáticamente al reconectarse.
- 🔐 **Control de Usuarios**: Registro e Inicio de sesión con contraseñas cifradas con `bcrypt` y tokens `JWT`.
- 🌓 **Tema Claro y Oscuro**: Alterna entre interfaz oscura estilizada con glassmorphism o interfaz clara con un clic.
- 🐳 **Dockerizado**: Despliegue con 1 solo comando mediante `docker-compose`.

---

## 🚀 Despliegue con Docker Compose (Recomendado)

En la raíz del proyecto, ejecuta:

```bash
docker-compose up --build -d
```

Acceso a la aplicación:
- **Frontend (Web App)**: `http://localhost:4500`
- **Backend API**: `http://localhost:7000`

### ⚠️ Configuración del secreto JWT (obligatorio en producción)

El backend firma los tokens con `JWT_SECRET`. Para entornos de producción debes
definirlo en un archivo `.env` (ya excluido del repo) antes de levantar los contenedores:

```bash
cp .env.example .env
# Edita .env y genera un secreto fuerte:
# openssl rand -base64 48
```

Si no se define, se usa un valor por defecto SOLO para desarrollo local (el backend mostrará una advertencia).

---

## 💻 Desarrollo Local (Sin Docker)

### 1. Iniciar el Backend (Puerto 7000)
```bash
cd backend
npm install
npm run dev
```

### 2. Iniciar el Frontend (Puerto 4000)
```bash
cd frontend
npm install
npm run dev
```

Abre tu navegador en `http://localhost:4000`.
