# ADESE 🎓 `v3.0.0`

Una aplicación web moderna diseñada para registrar, controlar y gestionar de manera interactiva y centralizada la asistencia y el rendimiento de estudiantes en tiempo real. 

**Adese** (Asistencia Digital Estratégica para el Sector Educativo) cuenta con una arquitectura robusta multi-rol y multi-curso. Fue estructurado bajo un enfoque *Mobile-First* pensando en la facilidad para que los alumnos confirmen su presencia escaneando un código QR dinámico. Todo el sistema está orquestado mediante **Docker**, aislando de forma segura la Base de Datos, el API Backend y el Frontend.

## 🚀 Características y Funcionalidades Principales

* **Arquitectura Multi-Rol Avanzada:** Soporte unificado para 3 roles de usuario distintos:
  * **Administrador:** Panel de control (Dashboard) global. Capacidad de crear/editar usuarios, crear cursos y matricular a docentes y alumnos en múltiples cursos simultáneamente (soporta co-docencia: múltiples profesores en un mismo curso).
  * **Docente:** Control total de las sesiones de los cursos donde está asignado.
  * **Alumno:** Interfaz optimizada para escaneo rápido de asistencias e historial propio.
* **Estados de Asistencia Dinámicos:** Los profesores o administradores pueden personalizar los estados de asistencia (Puntual, Presente, Tarde, Falto, Justificado, etc.), asignando un color distintivo y un **puntaje numérico** a cada uno para evaluación de desempeño.
* **Control de Horario Flexible:** Límites de tiempo 100% configurables por el docente para cada sesión. El sistema bloquea inteligentemente el registro fuera de los horarios establecidos o aplica el estado "Tarde" o "Falto" automáticamente basándose en la hora exacta.
* **Escaneo de Código QR Activo:** La pantalla del profesor genera códigos interactivos (JWT) renovables cada pocos segundos, impidiendo que el alumno haga fraude con capturas de pantalla antiguas.
* **Interfaz "Glassmorphism" Premium:** Diseño UI/UX moderno, fluido y altamente responsivo. Incluye animaciones sutiles, efectos de cristal y una excelente adaptación a dispositivos móviles (pestañas deslizantes, menús flotantes).
* **Gestión en Tiempo Real:** 
  * Monitor en vivo de quién llegó, estado automático de asistencia y hora de registro.
  * Modificación manual, justificaciones y exportación de datos.

## 🛠️ Stack Tecnológico

La aplicación está construida sobre un stack moderno y eficiente:
* **Frontend:** React + Vite (Alojado en Node.js, interactivo mediante CSS Moderno).
* **Backend:** Express API + Node.js (RESTful y robusto).
* **Base de Datos:** PostgreSQL.
* **Contenedores:** Docker + Docker Compose, con soporte pgAdmin.
* **Librerías Adicionales:** Lucide-react (Íconos SVG), QRCode (Generador QR interactivo), JsonWebToken (Autenticación y tokens QR), React Hot Toast (Notificaciones).

## 📁 Estructura del Proyecto

```text
asistencia-app/
├── backend/                # API Express + Lógica de Base de Datos
│   ├── Dockerfile          # Configuración de imagen del backend
│   ├── index.js            # Punto de entrada de la API (Endpoints)
│   ├── init.sql            # Esquema central unificado (Tablas, Triggers)
│   └── package.json        # Dependencias del backend
├── src/                    # Aplicación React (Frontend UI)
│   ├── api/                # Cliente para peticiones HTTP
│   ├── components/         # Componentes UI reutilizables (Modales, Tablas)
│   ├── pages/              # Vistas principales (AdminPage, TeacherPage, StudentPage)
│   ├── styles/             # Sistema de diseño dividido (admin.css, teacher.css, etc.)
│   ├── App.jsx             # Enrutador principal y gestión de sesión global
│   └── main.jsx            # Punto de entrada de React
├── .gitignore              # Archivos y secretos excluidos de Git
├── docker-compose.yml      # Orquestación de contenedores y red interna
└── README.md               # Documentación general (Este archivo)
```

## 🎮 Guía de Inicio (Local)

Al usar Docker Compose, desplegar la aplicación completa requiere un solo comando.

1. Instala [Docker](https://www.docker.com/).
2. Clona este repositorio o sitúate en la raíz del proyecto.
3. Asegúrate de configurar tus variables de entorno si vas a desplegar en producción (como las contraseñas).
4. Levanta todos los servicios escribiendo:
   ```bash
   docker-compose up -d --build
   ```
5. El Frontend estará expuesto en el puerto `5173`, el Backend en `3000` y la base de datos en `5432`.

## 🗄️ Arquitectura de Base de Datos (Esquema Unificado)

* `roles`: Define los niveles de acceso (Admin, Docente, Alumno).
* `usuarios`: Tabla maestra que centraliza todos los perfiles de la plataforma usando su código/identificador y enlazando su rol respectivo.
* `cursos`: Catálogo de asignaturas o materias.
* `curso_usuarios`: Tabla de asignación (N:M) que funciona como "Matrícula". Vincula usuarios (tanto docentes como alumnos) a cursos específicos.
* `estados_asistencia`: Tipos de asistencia configurables (Puntual, Falto, etc.) parametrizados por profesor y con pesos de evaluación.
* `sesiones`: Manejo de clases individuales (abiertas, cerradas) pertenecientes a un curso, control de fechas y límites de tolerancia.
* `asistencias`: Registro transaccional que documenta el marcaje exacto de un alumno en una sesión y su estado dinámico calculado.
