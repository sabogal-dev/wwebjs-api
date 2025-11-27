# ⚙️ Configuración de Variables de Entorno - WWebJS API

## 📋 Variables Configuradas Actualmente

Las siguientes variables están configuradas en tu archivo `.env`:

### 🌐 Aplicación General

```env
PORT=3000
```
✅ **Servidor corriendo en:** http://localhost:3000

```env
API_KEY=
```
✅ **Sin autenticación** - No necesitas enviar `x-api-key` en los headers

```env
BASE_WEBHOOK_URL=http://localhost:3000/localCallbackExample
ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
```
✅ **Webhook local habilitado** - Los eventos se guardan en `./sessions/message_log.txt`

```env
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=1000
```
✅ **Rate limiting:** 1000 requests por segundo

---

### 📱 Cliente WhatsApp

```env
MAX_ATTACHMENT_SIZE=10000000
```
✅ **Tamaño máximo de archivos:** 10 MB

```env
SET_MESSAGES_AS_SEEN=TRUE
```
✅ **Mensajes se marcan como leídos automáticamente**

```env
DISABLED_CALLBACKS=message_ack|message_reaction|unread_count|message_edit|message_ciphertext
```
✅ **Eventos deshabilitados:** Solo recibirás los eventos importantes

```env
WEB_VERSION='2.2328.5'
WEB_VERSION_CACHE_TYPE=none
```
✅ **Versión de WhatsApp Web:** 2.2328.5

```env
RECOVER_SESSIONS=TRUE
```
✅ **Auto-recuperación:** Si la sesión falla, se reinicia automáticamente

```env
HEADLESS=TRUE
```
✅ **Modo sin interfaz gráfica** - Chrome corre en segundo plano

```env
RELEASE_BROWSER_LOCK=TRUE
```
✅ **Lock del navegador liberado automáticamente**

```env
LOG_LEVEL=info
```
✅ **Nivel de logs:** Info (puedes cambiar a `debug` para más detalles)

---

### 🔔 Webhooks y WebSockets

```env
ENABLE_WEBHOOK=TRUE
```
✅ **Webhooks habilitados** - Recibirás notificaciones de eventos

```env
ENABLE_WEBSOCKET=FALSE
```
⚠️ **WebSockets deshabilitados** - Si necesitas tiempo real, cambia a `TRUE`

```env
AUTO_START_SESSIONS=TRUE
```
✅ **Auto-inicio habilitado** - Las sesiones se restauran al reiniciar el servidor

---

### 💾 Almacenamiento

```env
SESSIONS_PATH=./sessions
```
✅ **Sesiones guardadas en:** `./sessions/`

```env
ENABLE_SWAGGER_ENDPOINT=TRUE
```
✅ **Documentación Swagger:** http://localhost:3000/api-docs

---

### 🔒 Proxy Inverso

```env
BASE_PATH=
```
✅ **Sin base path** - Todas las rutas en raíz `/`

```env
TRUST_PROXY=FALSE
```
✅ **Sin proxy inverso** - Conexión directa

---

## 🔧 Cómo Modificar Variables

### Método 1: Editar el archivo .env

```bash
notepad .env
# Modifica las variables que necesites
# Guarda y cierra

# Reinicia el servicio para aplicar cambios
pm2 restart wwebjs-api
```

### Método 2: Usando PowerShell

```powershell
# Reiniciar con nuevas variables de entorno
.\manage.ps1 restart
```

---

## 📝 Variables Más Comunes a Modificar

### Cambiar el puerto

```env
PORT=3001
```

Luego reinicia: `pm2 restart wwebjs-api`

### Activar autenticación con API Key

```env
API_KEY=mi_clave_super_secreta_123
```

Ahora todos los requests deben incluir:
```bash
curl -H "x-api-key: mi_clave_super_secreta_123" http://localhost:3000/ping
```

### Activar WebSockets para tiempo real

```env
ENABLE_WEBSOCKET=TRUE
```

Conectarse desde JavaScript:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws/MI_SESION');
ws.onmessage = (event) => {
  const { dataType, data } = JSON.parse(event.data);
  console.log('Evento:', dataType, data);
};
```

### Cambiar nivel de logs para debugging

```env
LOG_LEVEL=debug
```

Verás más información en los logs: `pm2 logs wwebjs-api`

### Configurar webhook personalizado

```env
BASE_WEBHOOK_URL=https://mi-servidor.com/webhook
```

Tu servidor recibirá POST requests con los eventos de WhatsApp.

### Webhook específico por sesión

Agrega una nueva variable:
```env
MI_SESION_WEBHOOK_URL=https://otro-servidor.com/webhook-sesion
```

---

## ✅ Verificar Configuración Actual

```bash
# Ver configuración cargada en los logs
pm2 logs wwebjs-api --lines 50 | Select-String "configuration"
```

---

## 🚨 Recordatorio Importante

**Después de modificar el archivo `.env`, SIEMPRE reinicia el servicio:**

```bash
pm2 restart wwebjs-api
```

O usa el script helper:
```bash
.\manage.ps1 restart
```

---

## 📚 Documentación Completa

Para ver todas las variables disponibles y sus descripciones detalladas, consulta:
- `ARQUITECTURA.md` - Sección "Variables de Entorno"
- `.env.example` - Archivo de ejemplo con comentarios

---

## 🆘 Problemas Comunes

### El servicio no inicia después de cambiar .env

```bash
# Ver errores
pm2 logs wwebjs-api --err

# Verificar sintaxis del .env
# Asegúrate de no tener espacios extra o comillas mal cerradas
```

### Cambié PORT pero sigo viendo puerto 3000

```bash
# Reinicia completamente PM2
pm2 delete wwebjs-api
pm2 start ecosystem.config.js
```

### Activé API_KEY pero no funciona

Verifica que estés enviando el header correcto:
```javascript
headers: {
  'x-api-key': 'tu_clave_aqui',  // Minúsculas
  'Content-Type': 'application/json'
}
```

---

**✨ Configuración optimizada para desarrollo y pruebas locales**
