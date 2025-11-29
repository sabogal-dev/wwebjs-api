# Multi-User Authentication System - WWebJS API

## 📋 Descripción

Sistema de autenticación multi-usuario que permite a diferentes usuarios gestionar múltiples sesiones de WhatsApp con control de acceso, límites de API y persistencia en MySQL.

## 🚀 Características

- ✅ **Autenticación JWT** - Login seguro con tokens de sesión
- ✅ **Multi-sesiones por usuario** - Cada usuario puede tener hasta N sesiones WhatsApp
- ✅ **Control de acceso** - Los usuarios solo pueden acceder a sus propias sesiones
- ✅ **Límites de API** - Control de uso mensual por usuario
- ✅ **Persistencia MySQL** - Datos de usuarios y sesiones en base de datos
- ✅ **Compatibilidad total** - Endpoints legacy siguen funcionando

## 📦 Instalación

### 1. Instalar dependencias

Las dependencias ya están instaladas si ejecutaste:
```bash
npm install
```

Dependencias agregadas:
- `knex` - Query builder para MySQL
- `mysql2` - Driver MySQL
- `bcryptjs` - Hash de contraseñas
- `jsonwebtoken` - Autenticación JWT

### 2. Configurar MySQL

Crea la base de datos:
```sql
CREATE DATABASE wwebjs_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configurar variables de entorno

Copia `.env.example` y actualiza los valores:

```bash
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=wwebjs_api

# Multi-User Authentication
ENABLE_MULTI_USER=true
JWT_SECRET=cambia-esto-por-una-clave-super-secreta-en-produccion
JWT_EXPIRES_IN=30d
MAX_SESSIONS_PER_USER=5
DEFAULT_API_CALLS_LIMIT=1000
```

### 4. Iniciar el servidor

```bash
npm start
```

El servidor automáticamente:
- ✅ Conectará a MySQL
- ✅ Creará las tablas necesarias si no existen
- ✅ Iniciará en modo multi-usuario

## 📊 Estructura de Base de Datos

### Tabla `users`
```sql
- id (INT, PK)
- username (VARCHAR, UNIQUE)
- email (VARCHAR)
- password_hash (VARCHAR)
- api_calls_used (INT)
- api_calls_limit (INT)
- limit_reset_date (DATE)
- created_at (TIMESTAMP)
```

### Tabla `whatsapp_sessions`
```sql
- id (INT, PK)
- user_id (INT, FK → users.id)
- session_id (VARCHAR, UNIQUE)
- name (VARCHAR)
- status (ENUM: active, inactive, terminated)
- created_at (TIMESTAMP)
- last_active (TIMESTAMP)
```

### Tabla `api_usage_log`
```sql
- id (INT, PK)
- user_id (INT, FK → users.id)
- endpoint (VARCHAR)
- method (VARCHAR)
- timestamp (TIMESTAMP)
```

## 🔐 Endpoints de Autenticación

### Registrar usuario

```http
POST /auth/register
Content-Type: application/json

{
  "username": "juan_perez",
  "password": "miPassword123",
  "email": "juan@example.com"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "juan_perez",
    "email": "juan@example.com",
    "apiCallsLimit": 1000
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "juan_perez",
  "password": "miPassword123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "juan_perez",
    "email": "juan@example.com",
    "apiCallsUsed": 0,
    "apiCallsLimit": 1000,
    "limitResetDate": "2025-12-01"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Verificar token

```http
GET /auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 👤 Endpoints de Usuario

Todos requieren header `Authorization: Bearer <token>`

### Obtener perfil

```http
GET /users/me
```

**Respuesta:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "juan_perez",
    "email": "juan@example.com",
    "apiCallsUsed": 45,
    "apiCallsLimit": 1000,
    "limitResetDate": "2025-12-01",
    "sessionCount": 3,
    "maxSessions": 5
  }
}
```

### Ver estadísticas de uso

```http
GET /users/me/usage
```

**Respuesta:**
```json
{
  "success": true,
  "usage": {
    "used": 45,
    "limit": 1000,
    "remaining": 955,
    "resetDate": "2025-12-01",
    "percentage": "4.50"
  },
  "recentCalls": [...]
}
```

## 📱 Gestión de Sesiones WhatsApp

### Listar mis sesiones

```http
GET /users/me/sessions
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "sessionId": "ventas-01",
      "name": "WhatsApp Ventas",
      "status": "active",
      "isConnected": true,
      "clientState": "CONNECTED",
      "createdAt": "2025-11-27T10:00:00Z",
      "lastActive": "2025-11-27T15:30:00Z"
    }
  ],
  "total": 1,
  "maxSessions": 5
}
```

### Crear nueva sesión

```http
POST /users/me/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "sessionId": "mi-sesion-01",
  "name": "Mi WhatsApp Principal"
}
```

### Eliminar sesión

```http
DELETE /users/me/sessions/mi-sesion-01
Authorization: Bearer <token>
```

## 🔄 Operaciones WhatsApp Autenticadas

Todas las operaciones WhatsApp ahora están disponibles bajo rutas autenticadas:

### Formato de URL
```
/users/me/sessions/:sessionId/<operacion>
```

### Iniciar sesión WhatsApp

```http
GET /users/me/sessions/mi-sesion-01/start
Authorization: Bearer <token>
```

### Obtener código QR

```http
GET /users/me/sessions/mi-sesion-01/qr
Authorization: Bearer <token>
```

### Ver estado

```http
GET /users/me/sessions/mi-sesion-01/status
Authorization: Bearer <token>
```

### Enviar mensaje

```http
POST /users/me/sessions/mi-sesion-01/sendMessage
Authorization: Bearer <token>
Content-Type: application/json

{
  "chatId": "1234567890@c.us",
  "contentType": "string",
  "content": "Hola, este es un mensaje de prueba"
}
```

### Todas las operaciones disponibles:

- ✅ Todas las operaciones de `/session/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/client/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/message/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/chat/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/groupChat/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/contact/:sessionId/*` → `/users/me/sessions/:sessionId/*`
- ✅ Todas las operaciones de `/channel/:sessionId/*` → `/users/me/sessions/:sessionId/*`

## 🔒 Headers de Rate Limiting

Cada respuesta incluye headers informativos:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 955
X-RateLimit-Reset: 2025-12-01
```

## 🔄 Compatibilidad con Endpoints Legacy

Los endpoints originales **siguen funcionando** si `ENABLE_MULTI_USER=false` o para testing:

```http
# Endpoints legacy (sin autenticación)
GET /session/MI_SESION/start
POST /client/MI_SESION/sendMessage
```

## 📝 Ejemplo de Flujo Completo

### 1. Registro

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "juan",
    "password": "mipass123",
    "email": "juan@example.com"
  }'
```

### 2. Guardar token
```javascript
const response = await fetch('/auth/register', {...})
const { token } = await response.json()
localStorage.setItem('token', token)
```

### 3. Crear sesión WhatsApp
```bash
curl -X POST http://localhost:3000/users/me/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ventas-principal",
    "name": "WhatsApp Ventas"
  }'
```

### 4. Iniciar cliente WhatsApp
```bash
curl http://localhost:3000/users/me/sessions/ventas-principal/start \
  -H "Authorization: Bearer <token>"
```

### 5. Obtener QR
```bash
curl http://localhost:3000/users/me/sessions/ventas-principal/qr \
  -H "Authorization: Bearer <token>"
```

### 6. Enviar mensaje
```bash
curl -X POST http://localhost:3000/users/me/sessions/ventas-principal/sendMessage \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "1234567890@c.us",
    "contentType": "string",
    "content": "Hola desde API autenticada"
  }'
```

## 🛠️ Solución de Problemas

### Error: Failed to connect to database

**Solución:** Verifica que MySQL esté corriendo y las credenciales en `.env` sean correctas.

```bash
mysql -u root -p
CREATE DATABASE wwebjs_api;
```

### Error: Invalid token / Token expired

**Solución:** El token expiró o es inválido. Haz login nuevamente:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "tu_usuario", "password": "tu_password"}'
```

### Error: API call limit exceeded

**Solución:** Espera hasta el `resetDate` o contacta al administrador para aumentar tu límite.

### Error: Maximum session limit reached

**Solución:** Elimina sesiones inactivas:

```bash
curl -X DELETE http://localhost:3000/users/me/sessions/sesion-vieja \
  -H "Authorization: Bearer <token>"
```

## 🔧 Configuración Avanzada

### Cambiar límite de sesiones por usuario

```env
MAX_SESSIONS_PER_USER=10
```

### Cambiar límite de API calls

```env
DEFAULT_API_CALLS_LIMIT=5000
```

### Cambiar expiración de JWT

```env
JWT_EXPIRES_IN=7d  # 7 días
JWT_EXPIRES_IN=24h # 24 horas
JWT_EXPIRES_IN=90d # 90 días
```

## 📚 Documentación API Completa

Visita Swagger UI en: `http://localhost:3000/api-docs`

## 🤝 Soporte

Para más información, consulta la documentación original en `/api/ARQUITECTURA.md` y `/api/CONFIGURACION.md`.
