# 🚀 Inicio Rápido - Sistema Multi-Usuario

## Paso 1: Crear Base de Datos MySQL

### Opción A: Automática (recomendado)
```bash
mysql -u root -p < migrations/setup.sql
```

### Opción B: Manual
```sql
CREATE DATABASE wwebjs_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Paso 2: Configurar Variables de Entorno

El archivo `.env` ya está configurado con valores por defecto. Solo necesitas actualizar:

```env
DB_PASSWORD=tu_password_mysql
```

## Paso 3: Iniciar el Servidor

```bash
npm start
```

El servidor automáticamente:
- ✅ Conectará a MySQL
- ✅ Creará las tablas si no existen
- ✅ Iniciará en puerto 3000

## Paso 4: Probar el Sistema

### 1. Registrar un usuario

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "email": "test@example.com"
  }'
```

**Guarda el token que recibes en la respuesta**

### 2. Crear una sesión WhatsApp

```bash
curl -X POST http://localhost:3000/users/me/sessions \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "mi-whatsapp",
    "name": "Mi Primera Sesión"
  }'
```

### 3. Iniciar el cliente WhatsApp

```bash
curl http://localhost:3000/users/me/sessions/mi-whatsapp/start \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### 4. Obtener código QR

```bash
curl http://localhost:3000/users/me/sessions/mi-whatsapp/qr \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

O visita en el navegador:
```
http://localhost:3000/users/me/sessions/mi-whatsapp/qr/image
```
(Con el header Authorization en herramientas como Postman)

## 🎯 Endpoints Principales

```
POST   /auth/register              - Registrar usuario
POST   /auth/login                 - Login
GET    /auth/verify                - Verificar token

GET    /users/me                   - Mi perfil
GET    /users/me/usage             - Estadísticas de uso
GET    /users/me/sessions          - Listar mis sesiones
POST   /users/me/sessions          - Crear sesión
DELETE /users/me/sessions/:id      - Eliminar sesión

GET    /users/me/sessions/:id/start      - Iniciar WhatsApp
GET    /users/me/sessions/:id/qr         - Obtener QR
GET    /users/me/sessions/:id/status     - Ver estado
POST   /users/me/sessions/:id/sendMessage - Enviar mensaje
```

## 📊 Usuario Demo (si ejecutaste setup.sql)

```
Username: demo
Password: demo123
```

## 🔧 Solución Rápida de Problemas

### Error: Database connection failed
```bash
# Verifica que MySQL esté corriendo
mysql -u root -p

# Verifica las credenciales en .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
```

### Error: Port 3000 already in use
```env
# Cambia el puerto en .env
PORT=3001
```

### Ver logs del servidor
```bash
# El servidor muestra logs en consola
# Nivel de log configurable en .env
LOG_LEVEL=debug
```

## 📚 Documentación Completa

- **Setup detallado**: Ver `MULTI_USER_SETUP.md`
- **API Reference**: http://localhost:3000/api-docs
- **Arquitectura**: Ver `ARQUITECTURA.md`

## ✅ Checklist de Verificación

- [ ] MySQL instalado y corriendo
- [ ] Base de datos `wwebjs_api` creada
- [ ] Archivo `.env` configurado con DB_PASSWORD
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor iniciado sin errores
- [ ] Usuario registrado exitosamente
- [ ] Token JWT recibido
- [ ] Sesión WhatsApp creada
- [ ] Código QR generado

¡Listo! Ya tienes un sistema multi-usuario funcionando 🎉
