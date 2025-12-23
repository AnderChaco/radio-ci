# Radio Christian International

App móvil de streaming de radio para Radio Christian International, desarrollada con React Native y Expo.

## 📱 Características

- **Streaming de audio en vivo** desde `http://server.radiostreaming.com.ar:8308/stream.mp3`
- **Visualización de metadata en tiempo real** (título de canción, artista)
- **Interfaz moderna** con gradientes personalizados y animaciones fluidas
- **Disco animado** con efecto de rotación y pulso rítmico
- **Scroll infinito de metadata** con separadores visuales
- **Indicador "EN VIVO"** destacado durante la transmisión
- **Reproducción en segundo plano** (iOS y Android)
- **Diseño responsivo** adaptado a diferentes dispositivos con safe areas

## 🎨 Diseño

- **Colores:** Gradiente púrpura (#623f97) → rosa (#9e547f) → naranja (#ECA776)
- **Animaciones:**
  - Disco: rotación continua (10s) + pulso suave (1.3s)
  - Logo interno: pulso rítmico más pronunciado (800ms, escala 1.25x)
  - Metadata: scroll infinito horizontal con separadores "•"
- **Tipografía:** Ionicons para iconos, fuentes system con pesos variables

## 🛠️ Tecnologías

- **React Native** 0.81.5
- **Expo SDK** ~54.0.30
- **expo-av** - Reproducción de audio (deprecado, SDK 54)
- **expo-linear-gradient** - Gradientes de fondo
- **react-native-safe-area-context** - Márgenes seguros para dispositivos
- **Node.js + Express** - Servidor proxy para extraer metadata ICY

## 📋 Requisitos Previos

- Node.js 20.11.0 o superior (recomendado 20.19.4+)
- npm o yarn
- Expo Go app (para testing en dispositivo físico)
- Android Studio / Xcode (opcional, para emuladores)

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd radio-ci
```

### 2. Instalar dependencias del proyecto principal

```bash
npm install
```

### 3. Instalar dependencias del servidor de metadata

```bash
cd metadata-server
npm install
cd ..
```

### 4. Configurar la imagen de portada

Coloca tu imagen de portada del disco en:
```
assets/cover.png
```

## ⚙️ Configuración

### Servidor de Metadata

El servidor Node.js extrae metadata ICY del stream de radio. Configuración en `metadata-server/server.js`:

- **Puerto:** 3000
- **Stream URL:** `http://server.radiostreaming.com.ar:8308/stream.mp3`
- **ICY Metadata Interval:** 32768 bytes

**Importante:** Actualiza la IP del servidor en `services/IcyMetadataParser.js` (línea ~11):

```javascript
const response = await fetch('http://192.168.0.19:3000/metadata');
```

Cambia `192.168.0.19` por:
- Tu IP local si ejecutas en dispositivo físico
- `localhost` o `10.0.2.2` si usas emulador Android
- `localhost` si usas simulador iOS

Para obtener tu IP local:
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

## 🎯 Uso

### Iniciar el servidor de metadata

**Terminal 1:**
```bash
cd metadata-server
npm start
```

El servidor estará disponible en `http://localhost:3000/metadata`

### Ejecutar la aplicación

**Terminal 2:**

```bash
# Iniciar Metro bundler
npx expo start

# O específicamente para Android
npx expo start --android

# O para iOS
npx expo start --ios
```

### Opciones de visualización

1. **Expo Go** (recomendado para desarrollo):
   - Escanea el QR con la app Expo Go
   - Asegúrate de estar en la misma red WiFi

2. **Emulador Android:**
   - Presiona `a` en la terminal de Expo

3. **Simulador iOS:**
   - Presiona `i` en la terminal de Expo (solo macOS)

## 📁 Estructura del Proyecto

```
radio-ci/
├── App.js                          # Componente principal
├── index.js                        # Punto de entrada con SafeAreaProvider
├── app.json                        # Configuración de Expo
├── package.json                    # Dependencias del proyecto
├── assets/
│   └── cover.png                   # Imagen de portada del disco
├── services/
│   └── IcyMetadataParser.js        # Cliente para consultar metadata
└── metadata-server/
    ├── server.js                   # Servidor Express para ICY parsing
    └── package.json                # Dependencias del servidor
```

## 🔧 Funcionalidades Técnicas

### Extracción de Metadata

La metadata ICY (StreamTitle) no está disponible en los headers HTTP, sino embebida en el stream de bytes cada 32768 bytes. React Native no puede leer streams parciales, por lo que implementamos:

1. **Servidor Node.js** (`metadata-server/server.js`):
   - Lee el stream con `http.request`
   - Parsea metadata cada `icy-metaint` bytes
   - Expone endpoint REST: `GET /metadata`

2. **Cliente** (`services/IcyMetadataParser.js`):
   - Consulta el endpoint cada 10 segundos
   - Fallback a información básica si el servidor no responde

### Animaciones

- **pulseAnim:** Pulso suave del disco (1.0 → 1.1, 650ms)
- **beatAnim:** Pulso rítmico de la imagen interna (1.0 → 1.25, 400ms)
- **rotateAnim:** Rotación continua (0° → 360°, 10s)
- **marqueeAnim:** Scroll horizontal de metadata con múltiples repeticiones

### Audio en Segundo Plano

Configurado en `app.json`:
```json
"ios": {
  "infoPlist": {
    "UIBackgroundModes": ["audio"]
  }
}
"android": {
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.WAKE_LOCK"
  ]
}
```

## ⚠️ Limitaciones Conocidas

### expo-av está deprecado
- Será removido en Expo SDK 54
- Migración futura a `expo-audio` (en desarrollo)

### Controles de reproducción en notificaciones
- **No disponibles en Expo Go**
- Requiere **development build** con:
  - `react-native-track-player` o
  - `expo-audio` (cuando esté disponible)

### Metadata server
- Actualmente corre localmente
- Para producción, desplegar en:
  - Vercel (con serverless functions)
  - Render / Heroku (Node.js hosting)
  - Railway / Fly.io

## 🚢 Despliegue

### Opción 1: Expo Go (Desarrollo)
Mantener configuración actual, ideal para testing rápido.

### Opción 2: Development Build (Producción)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Configurar proyecto
eas build:configure

# Build para Android
eas build --platform android --profile preview

# Build para iOS (requiere cuenta Apple Developer)
eas build --platform ios --profile preview
```

### Opción 3: APK/IPA local

```bash
# Android APK
eas build -p android --profile preview --local

# iOS (solo en macOS)
eas build -p ios --profile preview --local
```

### Desplegar servidor de metadata

**Vercel:**
```bash
cd metadata-server
vercel
```

**Render:**
1. Crear nuevo Web Service
2. Conectar repositorio
3. Build command: `cd metadata-server && npm install`
4. Start command: `cd metadata-server && npm start`

## 🔄 Próximas Mejoras

- [ ] Migrar de `expo-av` a `expo-audio`
- [ ] Implementar `react-native-track-player` para controles en notificaciones
- [ ] Desplegar servidor de metadata a la nube
- [ ] Caché de metadata para offline
- [ ] Ecualizador visual
- [ ] Compartir canción en redes sociales
- [ ] Favoritos y historial de canciones

## 📝 Notas de Desarrollo

### Problemas resueltos

1. **expo-linear-gradient no encontrado**
   - Solución: `npm install expo-linear-gradient`

2. **Metadata siempre null en headers**
   - Causa: StreamTitle está en el stream, no en headers HTTP
   - Solución: Servidor Node.js para parsing

3. **React Native fetch no puede leer streams**
   - Intentos fallidos: `body.getReader()`, `XMLHttpRequest`, blob slicing
   - Solución final: Proxy server con `http.request` nativo de Node

4. **Marquee con pausas visibles**
   - Solución: Duplicar texto con separadores y ajustar animación de loop

5. **Metadata pegado al borde inferior en Android**
   - Solución: `react-native-safe-area-context` con `useSafeAreaInsets`

## 📞 Soporte

Para problemas o preguntas:
1. Revisar la sección de Limitaciones Conocidas
2. Verificar que el servidor de metadata esté corriendo
3. Confirmar conectividad de red (misma WiFi para Expo Go)

## 📄 Licencia

[Especificar licencia del proyecto]

---

**Radio Christian International** - Transmisión de adoración las 24 horas
