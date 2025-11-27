# 📚 Documentación de Arquitectura - WWebJS API

## 📋 Índice
1. [Resumen General](#resumen-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Sistema de Sesiones](#sistema-de-sesiones)
4. [Exposición de Endpoints](#exposición-de-endpoints)
5. [Sistema de Webhooks y WebSockets](#sistema-de-webhooks-y-websockets)
6. [Variables de Entorno](#variables-de-entorno)
7. [Uso con Proxy Inverso (Nginx)](#uso-con-proxy-inverso-nginx)
8. [Flujo de Funcionamiento](#flujo-de-funcionamiento)

---

## 🎯 Resumen General

**WWebJS API** es una API REST que funciona como wrapper sobre la librería [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), permitiendo interactuar con WhatsApp Web desde cualquier lenguaje de programación mediante HTTP.

### Características principales:
- ✅ **Multi-sesión**: Gestiona múltiples sesiones de WhatsApp simultáneamente
- 🔐 **Seguridad**: Protección mediante API Key global
- 🔄 **Webhooks**: Notificaciones en tiempo real de eventos
- 🌐 **WebSockets**: Comunicación bidireccional en tiempo real
- 🐳 **Dockerizado**: Listo para escalar en contenedores
- 📊 **Documentación Swagger**: API autodocumentada
- 🔄 **Auto-restauración**: Recupera sesiones automáticamente al reiniciar

---

## 🏗️ Arquitectura del Proyecto

### Estructura de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    server.js (Entry Point)               │
│  - Inicia servidor HTTP                                  │
│  - Verifica configuración webhook                        │
│  - Gestiona WebSocket upgrade                            │
│  - Auto-restaura sesiones                                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                       src/app.js                         │
│  - Configura Express                                     │
│  - Aplica middleware                                     │
│  - Monta rutas con base path configurable                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     src/routes.js                        │
│  - Define todos los endpoints                            │
│  - Organiza rutas por módulos:                           │
│    • Session (gestión de sesiones)                       │
│    • Client (operaciones del cliente)                    │
│    • Chat (gestión de chats)                             │
│    • GroupChat (operaciones de grupos)                   │
│    • Message (operaciones con mensajes)                  │
│    • Contact (gestión de contactos)                      │
│    • Channel (gestión de canales)                        │
└─────────────────────────────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Middleware  │  │  Sessions    │  │ Controllers  │
    │  - apikey   │  │  - setupSess │  │  - session   │
    │  - validate │  │  - validate  │  │  - client    │
    │  - rateLimit│  │  - restore   │  │  - chat      │
    └─────────────┘  └──────────────┘  └──────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Utils/Helpers  │
                   │  - webhooks     │
                   │  - websockets   │
                   │  - logger       │
                   └─────────────────┘
```

### Componentes Clave

#### 1. **server.js** (Punto de entrada)
```javascript
// Responsabilidades:
- Inicia servidor HTTP en el puerto configurado
- Valida que BASE_WEBHOOK_URL esté configurado (si webhooks están activos)
- Configura manejo de WebSocket upgrades
- Restaura sesiones previas si AUTO_START_SESSIONS=TRUE
- Gestiona límite de listeners de Puppeteer
```

#### 2. **src/app.js** (Aplicación Express)
```javascript
// Configuración:
- Desactiva header 'x-powered-by' (seguridad)
- Configura trust proxy (para proxies inversos)
- Limita tamaño de payload (MAX_ATTACHMENT_SIZE + 1MB)
- Monta rutas con BASE_PATH configurable
```

#### 3. **src/config.js** (Configuración centralizada)
Carga todas las variables de entorno y las exporta como constantes JavaScript.

---

## 🔐 Sistema de Sesiones

### ¿Cómo funciona?

Las sesiones son instancias independientes de WhatsApp Web, cada una identificada por un `sessionId` único.

### Ciclo de Vida de una Sesión

```
1. INICIO (setupSession)
   │
   ├─> Verifica si la sesión ya existe
   │   └─> Si existe: retorna error
   │   └─> Si no existe: continúa
   │
   ├─> Crea instancia de LocalAuth (almacenamiento local)
   │   └─> Carpeta: ./sessions/session-{sessionId}/
   │
   ├─> Configura opciones de Puppeteer
   │   ├─> Headless mode (sin UI)
   │   ├─> Chrome binario personalizado (opcional)
   │   └─> 40+ flags de optimización
   │
   ├─> Configura versión de WhatsApp Web
   │   └─> Cacheo: local/remote/none
   │
   ├─> Libera lock del navegador (si está activado)
   │   └─> Elimina archivo SingletonLock
   │
   ├─> Inicializa cliente de whatsapp-web.js
   │
   ├─> Configura eventos (QR, ready, messages, etc.)
   │
   ├─> Inicia WebSocket server (si está activado)
   │
   └─> Guarda sesión en Map global

2. VALIDACIÓN (validateSession)
   │
   ├─> Verifica que la sesión exista en el Map
   │
   ├─> Espera a que pupPage esté disponible
   │
   ├─> Verifica que la página no esté cerrada
   │
   ├─> Obtiene estado de la sesión
   │   ├─> CONNECTED ✅
   │   ├─> OPENING (conectando)
   │   ├─> PAIRING (emparejando)
   │   └─> TIMEOUT (tiempo agotado)
   │
   └─> Retorna resultado de validación

3. RESTAURACIÓN (restoreSessions - al iniciar servidor)
   │
   ├─> Lee carpeta ./sessions/
   │
   ├─> Por cada carpeta session-{sessionId}
   │   └─> Llama a setupSession(sessionId)
   │
   └─> Restaura automáticamente todas las sesiones previas

4. TERMINACIÓN (deleteSession)
   │
   ├─> Remueve listeners de eventos de página
   │
   ├─> Termina WebSocket server
   │
   ├─> Si está conectado:
   │   └─> Ejecuta logout()
   │
   ├─> Si no está conectado:
   │   └─> Ejecuta destroy()
   │
   ├─> Espera desconexión del navegador (max 10s)
   │
   ├─> Elimina sesión del Map
   │
   └─> Elimina carpeta session-{sessionId}
```

### Almacenamiento de Sesiones

```
./sessions/
├── session-ABCD/
│   ├── Default/
│   │   ├── IndexedDB/
│   │   ├── Local Storage/
│   │   └── Session Storage/
│   └── SingletonLock (se elimina al iniciar si existe)
├── session-XYZ/
│   └── ...
└── message_log.txt (ejemplo de callback local)
```

### Eventos de Sesión

La API escucha y puede notificar los siguientes eventos:

| Evento | Descripción | Webhook |
|--------|-------------|---------|
| `qr` | Código QR generado | ✅ |
| `authenticated` | Sesión autenticada | ✅ |
| `ready` | Cliente listo | ✅ |
| `message` | Mensaje recibido | ✅ |
| `message_create` | Mensaje creado | ✅ |
| `message_ack` | Confirmación de mensaje | ✅ |
| `message_reaction` | Reacción a mensaje | ✅ |
| `message_edit` | Mensaje editado | ✅ |
| `message_revoke_everyone` | Mensaje eliminado para todos | ✅ |
| `disconnected` | Sesión desconectada | ✅ |
| `group_join` | Unión a grupo | ✅ |
| `group_leave` | Salida de grupo | ✅ |
| `call` | Llamada recibida | ✅ |
| `change_state` | Cambio de estado | ✅ |
| `media` | Media descargada (personalizado) | ✅ |

**Nota**: Los callbacks pueden deshabilitarse mediante `DISABLED_CALLBACKS`.

### Auto-recuperación de Sesiones

Si `RECOVER_SESSIONS=TRUE`, la API monitorea errores de página:

```javascript
client.pupPage.on('close') → Reinicia sesión automáticamente
client.pupPage.on('error') → Reinicia sesión automáticamente
```

---

## 🌐 Exposición de Endpoints

### Organización de Rutas

La API organiza los endpoints en módulos lógicos:

```javascript
BASE_URL/
├── /ping                          → Health check
├── /localCallbackExample          → Callback de prueba (solo dev)
│
├── /session/                      → Gestión de sesiones
│   ├── GET /getSessions
│   ├── GET /start/:sessionId
│   ├── GET /stop/:sessionId
│   ├── GET /status/:sessionId
│   ├── GET /qr/:sessionId
│   ├── GET /qr/:sessionId/image
│   ├── POST /requestPairingCode/:sessionId
│   ├── GET /restart/:sessionId
│   ├── GET /terminate/:sessionId
│   ├── GET /terminateInactive
│   └── GET /terminateAll
│
├── /client/                       → Operaciones del cliente
│   ├── GET /getContacts/:sessionId
│   ├── GET /getChats/:sessionId
│   ├── POST /sendMessage/:sessionId
│   ├── POST /getNumberId/:sessionId
│   ├── POST /isRegisteredUser/:sessionId
│   ├── POST /getProfilePicUrl/:sessionId
│   ├── POST /setStatus/:sessionId
│   ├── POST /createGroup/:sessionId
│   └── ... (40+ endpoints)
│
├── /chat/                         → Gestión de chats
│   ├── POST /fetchMessages/:sessionId
│   ├── POST /sendSeen/:sessionId
│   ├── POST /sendStateTyping/:sessionId
│   ├── POST /delete/:sessionId
│   └── ...
│
├── /groupChat/                    → Operaciones de grupos
│   ├── POST /addParticipants/:sessionId
│   ├── POST /removeParticipants/:sessionId
│   ├── POST /promoteParticipants/:sessionId
│   ├── POST /demoteParticipants/:sessionId
│   ├── POST /setSubject/:sessionId
│   └── ...
│
├── /message/                      → Operaciones con mensajes
│   ├── POST /downloadMedia/:sessionId
│   ├── POST /forward/:sessionId
│   ├── POST /reply/:sessionId
│   ├── POST /react/:sessionId
│   ├── POST /delete/:sessionId
│   └── ...
│
├── /contact/                      → Gestión de contactos
│   ├── POST /block/:sessionId
│   ├── POST /unblock/:sessionId
│   ├── POST /getAbout/:sessionId
│   └── ...
│
├── /channel/                      → Gestión de canales (newsletters)
│   ├── POST /sendMessage/:sessionId
│   ├── POST /fetchMessages/:sessionId
│   └── ...
│
└── /api-docs                      → Documentación Swagger
```

### Middleware de Protección

Cada endpoint pasa por una cadena de middleware:

```javascript
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ 1. API Key Validation   │ ← X-Api-Key header
│    (middleware.apikey)   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ 2. Rate Limiter         │ ← Limita requests por IP
│    (rateLimiter)         │   (RATE_LIMIT_MAX)
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ 3. Session Name Valid   │ ← Valida formato sessionId
│    (sessionNameValid)    │   (solo alfanumérico y -)
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ 4. Session Validation   │ ← Verifica sesión existe
│    (sessionValidation)   │   y está CONNECTED
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│   Controller Handler    │
└─────────────────────────┘
```

### Ejemplo de Flujo de Request

```http
POST http://localhost:3000/client/sendMessage/ABCD
Headers:
  X-Api-Key: tu_api_key_secreta
Body:
{
  "chatId": "5215512345678@c.us",
  "message": "Hola desde la API"
}

↓↓↓

1. Express recibe request
2. Middleware apikey valida X-Api-Key
3. Rate limiter verifica límite no excedido
4. sessionNameValidation valida "ABCD" es alfanumérico
5. sessionValidation verifica sesión ABCD existe y está conectada
6. clientController.sendMessage ejecuta lógica
   └─> sessions.get('ABCD').sendMessage(...)
7. Respuesta JSON con success/error
```

---

## 🔔 Sistema de Webhooks y WebSockets

### Webhooks

Los webhooks son notificaciones HTTP POST que la API envía a tu servidor cuando ocurren eventos.

#### Configuración

```env
# Webhook global (usado por todas las sesiones)
BASE_WEBHOOK_URL=http://tu-servidor.com/webhook

# Webhook específico para sesión "PRODUCCION"
PRODUCCION_WEBHOOK_URL=http://otro-servidor.com/webhook-produccion

# Deshabilitar webhooks
ENABLE_WEBHOOK=FALSE

# Deshabilitar eventos específicos
DISABLED_CALLBACKS=message_ack|message_reaction|unread_count
```

#### Funcionamiento

```javascript
Evento ocurre (ej: mensaje recibido)
    │
    ▼
¿Evento está habilitado?
    │ (verificar DISABLED_CALLBACKS)
    ▼ Sí
Determinar webhook URL
    │ (sessionId_WEBHOOK_URL || BASE_WEBHOOK_URL)
    ▼
Enviar POST request
    │
    Headers: {
    │   'x-api-key': API_KEY,
    │   'Content-Type': 'application/json'
    │ }
    │
    Body: {
    │   "sessionId": "ABCD",
    │   "dataType": "message",
    │   "data": { ... datos del evento ... }
    │ }
    ▼
Tu servidor procesa webhook
```

#### Ejemplo de Payload Webhook

```json
{
  "sessionId": "ABCD",
  "dataType": "message",
  "data": {
    "id": {
      "fromMe": false,
      "remote": "5215512345678@c.us",
      "id": "3EB0C127A77D7C2E13D9",
      "_serialized": "false_5215512345678@c.us_3EB0C127A77D7C2E13D9"
    },
    "body": "Hola, ¿cómo estás?",
    "type": "chat",
    "timestamp": 1732638000,
    "from": "5215512345678@c.us",
    "to": "5215587654321@c.us",
    "hasMedia": false,
    "ack": 1
  }
}
```

### WebSockets

Los WebSockets permiten comunicación bidireccional en tiempo real.

#### Configuración

```env
ENABLE_WEBSOCKET=TRUE
```

#### Conexión

```javascript
// Cliente JavaScript
const ws = new WebSocket('ws://localhost:3000/ws/ABCD');

ws.onopen = () => {
  console.log('Conectado a sesión ABCD');
};

ws.onmessage = (event) => {
  const { sessionId, dataType, data } = JSON.parse(event.data);
  console.log('Evento recibido:', dataType, data);
};

ws.onclose = () => {
  console.log('Desconectado');
};

// El servidor soporta ping/pong automático para mantener la conexión
```

#### Diferencias: Webhook vs WebSocket

| Característica | Webhook | WebSocket |
|---------------|---------|-----------|
| Dirección | Unidireccional (API → Tu servidor) | Bidireccional |
| Protocolo | HTTP POST | WebSocket (ws://) |
| Conexión | Sin estado (cada evento es request nuevo) | Persistente |
| Latencia | Mayor | Menor |
| Escalabilidad | Mejor (stateless) | Limitada (conexiones persistentes) |
| Uso recomendado | Producción, microservicios | Tiempo real, dashboards |

---

## ⚙️ Variables de Entorno

### Categorías de Configuración

#### 1. **Aplicación General**

```env
# Puerto del servidor
PORT=3000
# Valor predeterminado: 3000

# Clave API para proteger endpoints
API_KEY=tu_clave_secreta_aqui
# Si se define, TODOS los requests deben incluir header:
# X-Api-Key: tu_clave_secreta_aqui

# URL base para webhooks
BASE_WEBHOOK_URL=http://localhost:3000/localCallbackExample
# OBLIGATORIO si ENABLE_WEBHOOK=TRUE

# Habilitar endpoint de callback de ejemplo
ENABLE_LOCAL_CALLBACK_EXAMPLE=TRUE
# Solo para desarrollo, desactivar en producción

# Límite de rate limiting
RATE_LIMIT_MAX=1000
# Número máximo de requests por ventana de tiempo

# Ventana de tiempo para rate limiting (en milisegundos)
RATE_LIMIT_WINDOW_MS=1000
# 1000ms = 1 segundo
```

#### 2. **Configuración del Cliente WhatsApp**

```env
# Tamaño máximo de archivos adjuntos (en bytes)
MAX_ATTACHMENT_SIZE=10000000
# 10MB por defecto
# Si un archivo excede este tamaño, el body del media será NULL

# Marcar mensajes como leídos automáticamente
SET_MESSAGES_AS_SEEN=TRUE
# Si TRUE, todos los mensajes recibidos se marcan como leídos

# Deshabilitar callbacks específicos
DISABLED_CALLBACKS=message_ack|message_reaction|unread_count
# Separar eventos con pipe (|)
# Eventos disponibles:
# - auth_failure
# - authenticated
# - call
# - change_state
# - disconnected
# - group_join
# - group_leave
# - group_update
# - loading_screen
# - media_uploaded
# - message
# - message_ack
# - message_create
# - message_reaction
# - message_revoke_everyone
# - qr
# - ready
# - contact_changed
# - unread_count
# - message_edit
# - message_ciphertext

# Versión de WhatsApp Web
WEB_VERSION='2.2328.5'
# Opcional, especifica versión exacta de WA Web

# Tipo de caché para versión de WA Web
WEB_VERSION_CACHE_TYPE=none
# Opciones:
# - none: sin caché
# - local: cachea localmente
# - remote: descarga desde repositorio remoto

# Recuperar sesiones en caso de error de página
RECOVER_SESSIONS=TRUE
# Si TRUE, reinicia sesión automáticamente en caso de crash

# Ruta al binario de Chrome/Chromium
CHROME_BIN=
# Opcional, útil en entornos Docker personalizados

# Ejecutar Chrome en modo headless (sin interfaz gráfica)
HEADLESS=TRUE
# Siempre TRUE en producción

# Liberar lock del navegador al iniciar
RELEASE_BROWSER_LOCK=TRUE
# Elimina archivo SingletonLock si existe

# Nivel de logging
LOG_LEVEL=info
# Opciones: debug, info, warn, error

# Habilitar webhooks
ENABLE_WEBHOOK=TRUE
# Si FALSE, no se enviarán webhooks

# Habilitar WebSockets
ENABLE_WEBSOCKET=FALSE
# Si TRUE, inicia servidor WebSocket por cada sesión

# Auto-iniciar sesiones al arrancar servidor
AUTO_START_SESSIONS=TRUE
# Si TRUE, restaura todas las sesiones al iniciar
```

#### 3. **Almacenamiento de Sesiones**

```env
# Ruta donde se guardan las sesiones
SESSIONS_PATH=./sessions
# Carpeta relativa o absoluta

# Habilitar endpoint de documentación Swagger
ENABLE_SWAGGER_ENDPOINT=TRUE
# Accesible en /api-docs
```

#### 4. **Proxy Inverso / Load Balancer**

```env
# Ruta base para montar las rutas
BASE_PATH=
# Ejemplo: /api/v1/whatsapp
# Todas las rutas se montarían en http://domain.com/api/v1/whatsapp/...

# Confiar en headers de proxy
TRUST_PROXY=FALSE
# Si TRUE, Express confía en X-Forwarded-* headers
# OBLIGATORIO cuando se usa detrás de Nginx/HAProxy
```

### Ejemplo de .env Completo

```env
## Producción ##
PORT=3000
API_KEY=clave_super_secreta_cambiar_esto
BASE_WEBHOOK_URL=https://mi-backend.com/whatsapp-webhook
ENABLE_LOCAL_CALLBACK_EXAMPLE=FALSE

## Seguridad ##
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

## Cliente ##
MAX_ATTACHMENT_SIZE=10000000
SET_MESSAGES_AS_SEEN=TRUE
DISABLED_CALLBACKS=message_ack|unread_count
WEB_VERSION=2.2328.5
WEB_VERSION_CACHE_TYPE=remote
RECOVER_SESSIONS=TRUE
HEADLESS=TRUE
RELEASE_BROWSER_LOCK=TRUE
LOG_LEVEL=info

## Comunicación ##
ENABLE_WEBHOOK=TRUE
ENABLE_WEBSOCKET=FALSE
AUTO_START_SESSIONS=TRUE

## Storage ##
SESSIONS_PATH=./sessions
ENABLE_SWAGGER_ENDPOINT=TRUE

## Proxy Inverso ##
BASE_PATH=/api/whatsapp
TRUST_PROXY=TRUE
```

---

## 🔒 Uso con Proxy Inverso (Nginx)

### ¿Por qué usar un proxy inverso?

1. **SSL/TLS**: Manejar certificados HTTPS
2. **Load Balancing**: Distribuir carga entre múltiples instancias
3. **Seguridad**: Ocultar servidor real, WAF, rate limiting adicional
4. **Caché**: Cachear respuestas estáticas
5. **Compresión**: Comprimir respuestas

### Configuración Nginx

#### Escenario 1: Nginx como reverse proxy simple

```nginx
# /etc/nginx/sites-available/wwebjs-api

upstream wwebjs_api {
    server 127.0.0.1:3000;
    # Si tienes múltiples instancias:
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name tu-dominio.com;

    # Redirigir todo a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/wwebjs-api-access.log;
    error_log /var/log/nginx/wwebjs-api-error.log;

    # Tamaño máximo de payload (debe coincidir o ser mayor que MAX_ATTACHMENT_SIZE)
    client_max_body_size 15M;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy a la API
    location / {
        proxy_pass http://wwebjs_api;
        
        # Headers necesarios
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts (aumentar para operaciones largas)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Configuración especial para WebSockets
    location /ws/ {
        proxy_pass http://wwebjs_api;
        
        # Headers WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts largos para WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

#### Escenario 2: Nginx con BASE_PATH

Si tu API está en un subpath (ej: `/api/whatsapp`):

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # ... certificados SSL ...

    # API de WhatsApp en /api/whatsapp
    location /api/whatsapp/ {
        proxy_pass http://127.0.0.1:3000/;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Reescribir URL si usas BASE_PATH=/api/whatsapp
        # proxy_pass http://127.0.0.1:3000/api/whatsapp/;
    }

    # WebSocket para WhatsApp
    location /api/whatsapp/ws/ {
        proxy_pass http://127.0.0.1:3000/ws/;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Escenario 3: Load Balancing con múltiples instancias

```nginx
upstream wwebjs_cluster {
    # Método de balanceo: least_conn (menos conexiones)
    least_conn;
    
    server 127.0.0.1:3000 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    
    # Health check
    # Requiere nginx-plus o módulo adicional
    # health_check interval=10s fails=3 passes=2;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    # ... SSL config ...

    location / {
        proxy_pass http://wwebjs_cluster;
        
        # Sticky sessions (importante para sesiones)
        # Requiere nginx-plus o módulo adicional
        # sticky cookie srv_id expires=1h domain=.tu-dominio.com path=/;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Configuración en la API

Cuando usas Nginx como proxy, **DEBES** configurar:

```env
# Decirle a Express que confíe en los headers del proxy
TRUST_PROXY=TRUE

# (Opcional) Si montas en un subpath
BASE_PATH=/api/whatsapp
```

### ¿Qué hace TRUST_PROXY?

Cuando `TRUST_PROXY=TRUE`:

1. **Express lee X-Forwarded-* headers**
   - `req.ip` será la IP real del cliente (no la de Nginx)
   - `req.protocol` será 'https' (no 'http')
   - `req.hostname` será el dominio real

2. **Rate Limiter funciona correctamente**
   ```javascript
   // Sin TRUST_PROXY: todas las requests parecen venir de 127.0.0.1
   // Con TRUST_PROXY: cada cliente tiene su propia IP
   keyGenerator: (req) => req.ip
   ```

3. **Los webhooks usan el protocolo correcto**
   - Enlaces en respuestas API usan `https://` en lugar de `http://`

### Verificar configuración

```bash
# Probar desde fuera del servidor
curl -H "X-Api-Key: tu_api_key" https://tu-dominio.com/ping

# Debe responder:
# {"success":true}

# Verificar WebSocket
wscat -c wss://tu-dominio.com/ws/test
```

### Logs útiles para debugging

```nginx
# En configuración de Nginx, añadir:
log_format proxy_log '$remote_addr - $remote_user [$time_local] '
                     '"$request" $status $body_bytes_sent '
                     '"$http_referer" "$http_user_agent" '
                     'RT=$request_time URT=$upstream_response_time '
                     'UCS=$upstream_cache_status';

access_log /var/log/nginx/wwebjs-api-proxy.log proxy_log;
```

---

## 🔄 Flujo de Funcionamiento

### Flujo Completo: Desde Inicio hasta Envío de Mensaje

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIO DEL SERVIDOR                                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
server.js inicia
    │
    ├─> Valida BASE_WEBHOOK_URL (si ENABLE_WEBHOOK=TRUE)
    ├─> Crea servidor HTTP en PORT
    ├─> Si ENABLE_WEBSOCKET=TRUE, configura upgrade handler
    └─> Si AUTO_START_SESSIONS=TRUE, llama restoreSessions()
        │
        └─> Lee carpeta ./sessions/
            └─> Por cada session-{id} → setupSession(id)

┌─────────────────────────────────────────────────────────────┐
│ 2. INICIAR NUEVA SESIÓN                                     │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Cliente HTTP:
GET /session/start/MI_SESION
Headers: { X-Api-Key: clave_secreta }
    │
    ├─> Middleware: apikey ✓
    ├─> Middleware: sessionNameValidation ✓
    └─> sessionController.startSession()
        │
        └─> sessions.setupSession('MI_SESION')
            │
            ├─> Crear carpeta: ./sessions/session-MI_SESION/
            ├─> Configurar LocalAuth
            ├─> Configurar Puppeteer (headless, flags)
            ├─> Inicializar whatsapp-web.js Client
            ├─> Registrar eventos (qr, ready, message...)
            ├─> Iniciar WebSocket server (si está activo)
            └─> client.initialize()
                │
                └─> Puppeteer abre navegador
                    └─> Carga WhatsApp Web

┌─────────────────────────────────────────────────────────────┐
│ 3. ESCANEAR QR CODE                                         │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
WhatsApp Web genera QR
    │
    └─> Evento 'qr' disparado
        │
        ├─> client.qr = qr_string
        │
        ├─> Si ENABLE_WEBHOOK=TRUE:
        │   └─> POST BASE_WEBHOOK_URL
        │       Body: { sessionId: 'MI_SESION', dataType: 'qr', data: { qr } }
        │
        └─> Si ENABLE_WEBSOCKET=TRUE:
            └─> ws.send({ sessionId: 'MI_SESION', dataType: 'qr', data: { qr } })

Usuario escanea QR con WhatsApp móvil
    │
    └─> Evento 'authenticated' disparado
        │
        ├─> client.qr = null
        │
        └─> Webhook/WebSocket notificado

┌─────────────────────────────────────────────────────────────┐
│ 4. SESIÓN LISTA                                             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Evento 'ready' disparado
    │
    ├─> patchWWebLibrary(client) → Aplica parches personalizados
    │
    ├─> Webhook/WebSocket: { dataType: 'ready' }
    │
    └─> Sesión guardada en Map:
        sessions.set('MI_SESION', client)

┌─────────────────────────────────────────────────────────────┐
│ 5. ENVIAR MENSAJE                                           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Cliente HTTP:
POST /client/sendMessage/MI_SESION
Headers: { X-Api-Key: clave_secreta }
Body: {
  "chatId": "5215512345678@c.us",
  "message": "Hola mundo"
}
    │
    ├─> Middleware: apikey ✓
    ├─> Middleware: rateLimiter ✓
    ├─> Middleware: sessionNameValidation ✓
    ├─> Middleware: sessionValidation
    │   └─> validateSession('MI_SESION')
    │       ├─> sessions.has('MI_SESION') → true
    │       ├─> client.pupPage disponible → true
    │       ├─> client.getState() → 'CONNECTED'
    │       └─> return { success: true }
    │
    └─> clientController.sendMessage()
        │
        └─> client.sendMessage(chatId, message)
            │
            └─> WhatsApp Web envía mensaje
                │
                └─> Evento 'message_create' disparado
                    │
                    └─> Webhook/WebSocket notificado

┌─────────────────────────────────────────────────────────────┐
│ 6. RECIBIR MENSAJE                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Mensaje entrante en WhatsApp
    │
    └─> Evento 'message' disparado
        │
        ├─> Si ENABLE_WEBHOOK=TRUE:
        │   └─> POST BASE_WEBHOOK_URL
        │       Body: {
        │         sessionId: 'MI_SESION',
        │         dataType: 'message',
        │         data: { id, body, from, timestamp, ... }
        │       }
        │
        ├─> Si ENABLE_WEBSOCKET=TRUE:
        │   └─> ws.send({ dataType: 'message', data: {...} })
        │
        ├─> Si message.hasMedia && size < MAX_ATTACHMENT_SIZE:
        │   └─> Evento 'media' personalizado
        │       └─> message.downloadMedia()
        │           └─> Webhook/WebSocket: { dataType: 'media', data: {...} }
        │
        └─> Si SET_MESSAGES_AS_SEEN=TRUE:
            └─> chat.sendSeen()

┌─────────────────────────────────────────────────────────────┐
│ 7. TERMINAR SESIÓN                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Cliente HTTP:
GET /session/terminate/MI_SESION
    │
    └─> sessionController.terminateSession()
        │
        └─> sessions.deleteSession('MI_SESION')
            │
            ├─> Remover listeners de eventos
            ├─> Terminar WebSocket server
            ├─> client.logout() (si está conectado)
            │   └─> Espera hasta 10s a que navegador se desconecte
            ├─> sessions.delete('MI_SESION')
            └─> fs.rm('./sessions/session-MI_SESION/', { recursive: true })
```

---

## 📊 Diagrama de Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CLIENTES                         │
│  • Aplicaciones web     • Apps móviles     • Servicios backend      │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   NGINX (Opcional)  │
                    │  • SSL/TLS          │
                    │  • Load Balancing   │
                    │  • Rate Limiting    │
                    │  • Compresión       │
                    └──────────┬──────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WWEBJS-API (Express)                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        Middleware                            │   │
│  │  • API Key Auth    • Rate Limiter    • Session Validator    │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────┴─────────────────────────────────────┐   │
│  │                         Routes                               │   │
│  │  /session  /client  /chat  /groupChat  /message  /contact   │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────┴─────────────────────────────────────┐   │
│  │                      Controllers                             │   │
│  │  Lógica de negocio para cada endpoint                        │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────┴─────────────────────────────────────┐   │
│  │                   Session Manager                            │   │
│  │  Map<sessionId, Client>                                      │   │
│  │  • setupSession()    • validateSession()                     │   │
│  │  • deleteSession()   • restoreSessions()                     │   │
│  └────────┬────────────────────────────────────────┬────────────┘   │
│           │                                        │                │
│     ┌─────▼──────┐                          ┌──────▼─────────┐     │
│     │  Webhooks  │                          │  WebSockets    │     │
│     │  Sender    │                          │  Server (per   │     │
│     │            │                          │  session)      │     │
│     └─────┬──────┘                          └──────┬─────────┘     │
└───────────┼─────────────────────────────────────────┼───────────────┘
            │                                         │
            │ HTTP POST                               │ WS Messages
            ▼                                         ▼
┌─────────────────────┐                   ┌────────────────────────┐
│   Tu Webhook        │                   │  Clientes WebSocket    │
│   Endpoint          │                   │  (Dashboards, etc.)    │
└─────────────────────┘                   └────────────────────────┘

            ┌───────────────────────────────────┐
            │   whatsapp-web.js (por sesión)    │
            │  ┌─────────────────────────────┐  │
            │  │     Puppeteer               │  │
            │  │  ┌──────────────────────┐   │  │
            │  │  │  Chrome/Chromium     │   │  │
            │  │  │  ┌────────────────┐  │   │  │
            │  │  │  │ WhatsApp Web   │  │   │  │
            │  │  │  └────────────────┘  │   │  │
            │  │  └──────────────────────┘   │  │
            │  └─────────────────────────────┘  │
            └───────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  LocalAuth       │
                │  ./sessions/     │
                │  session-{id}/   │
                └──────────────────┘
```

---

## 🚀 Casos de Uso Comunes

### 1. Chatbot automatizado

```javascript
// Tu servidor webhook
app.post('/whatsapp-webhook', (req, res) => {
  const { sessionId, dataType, data } = req.body;
  
  if (dataType === 'message' && !data.fromMe) {
    // Mensaje recibido, no enviado por nosotros
    const body = data.body.toLowerCase();
    
    if (body === 'hola') {
      // Responder automáticamente
      fetch(`http://localhost:3000/client/sendMessage/${sessionId}`, {
        method: 'POST',
        headers: {
          'X-Api-Key': 'tu_api_key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId: data.from,
          message: '¡Hola! ¿En qué puedo ayudarte?'
        })
      });
    }
  }
  
  res.json({ success: true });
});
```

### 2. Notificaciones desde otra aplicación

```python
# Python
import requests

def enviar_notificacion_whatsapp(telefono, mensaje):
    url = "https://tu-api.com/client/sendMessage/PRODUCCION"
    headers = {
        "X-Api-Key": "tu_api_key",
        "Content-Type": "application/json"
    }
    data = {
        "chatId": f"{telefono}@c.us",
        "message": mensaje
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.json()

# Uso
enviar_notificacion_whatsapp("5215512345678", "Tu pedido ha sido enviado")
```

### 3. Dashboard en tiempo real con WebSocket

```javascript
// Frontend React/Vue
const ws = new WebSocket('wss://tu-api.com/ws/DASHBOARD');

ws.onmessage = (event) => {
  const { dataType, data } = JSON.parse(event.data);
  
  switch(dataType) {
    case 'message':
      agregarMensajeAlChat(data);
      reproducirSonido();
      break;
    case 'qr':
      mostrarQREnPantalla(data.qr);
      break;
    case 'ready':
      mostrarEstadoConectado();
      break;
  }
};
```

---

## 🔧 Troubleshooting

### Problema: Sesión no se conecta

```bash
# 1. Verificar logs
LOG_LEVEL=debug

# 2. Verificar que carpeta session existe
ls -la ./sessions/

# 3. Eliminar SingletonLock manualmente
rm ./sessions/session-MI_SESION/SingletonLock

# 4. Reiniciar sesión
curl -H "X-Api-Key: key" http://localhost:3000/session/restart/MI_SESION
```

### Problema: Webhooks no llegan

```bash
# 1. Verificar ENABLE_WEBHOOK
echo $ENABLE_WEBHOOK  # debe ser TRUE

# 2. Verificar BASE_WEBHOOK_URL es accesible
curl -X POST $BASE_WEBHOOK_URL -d '{"test": true}'

# 3. Verificar evento no está deshabilitado
echo $DISABLED_CALLBACKS  # no debe contener el evento
```

### Problema: WebSocket se desconecta

```javascript
// Implementar reconexión automática
const connectWS = () => {
  const ws = new WebSocket('ws://localhost:3000/ws/SESION');
  
  ws.onclose = () => {
    console.log('Desconectado, reconectando en 5s...');
    setTimeout(connectWS, 5000);
  };
  
  return ws;
};
```

---

## 📝 Resumen

Esta API te permite:

1. **Gestionar múltiples sesiones** de WhatsApp independientes
2. **Recibir eventos en tiempo real** via webhooks o WebSockets
3. **Controlar WhatsApp** desde cualquier lenguaje via HTTP REST
4. **Escalar horizontalmente** con Docker y balanceadores de carga
5. **Integrar fácilmente** con proxies inversos como Nginx

**Arquitectura clave:**
- **Express** maneja HTTP/REST
- **whatsapp-web.js** se conecta a WhatsApp Web
- **Puppeteer** controla Chrome headless
- **LocalAuth** persiste sesiones en disco
- **Webhooks/WebSockets** notifican eventos

**Variables más importantes:**
- `API_KEY`: Seguridad
- `BASE_WEBHOOK_URL`: Recibir eventos
- `TRUST_PROXY`: Usar detrás de Nginx
- `AUTO_START_SESSIONS`: Recuperación automática

---

**¿Tienes dudas?** Revisa la [documentación Swagger](http://localhost:3000/api-docs) o consulta los [ejemplos en el repositorio](https://github.com/avoylenko/wwebjs-api).
