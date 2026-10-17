# NOVA — Asistente Personal Futurista (Frontend v0.1)

Prototipo de asistente personal inspirado en **JARVIS**, desarrollado estrictamente con **HTML5, CSS3 y JavaScript ES6+ puro**, sin dependencias externas ni backend requerido.

---

## 🚀 Inicio Rápido

### Opción 1: Directo en tu navegador
Haz doble clic sobre el archivo [`index.html`](file:///c:/Users/Usuario/Desktop/mi%20negocio/index.html) para abrirlo en Google Chrome, Microsoft Edge o cualquier navegador moderno.

### Opción 2: Mediante servidor local (Recomendado para permisos de voz)
Para habilitar el dictado por voz de la **Web Speech API** de forma óptima en un contexto seguro (`localhost`), ejecuta en tu terminal:

```powershell
# Usando Python (ya disponible en tu sistema)
python -m http.server 8080
```

Y luego abre en tu navegador:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🛠️ Arquitectura y Archivos del Proyecto

```text
mi negocio/
├── index.html                       # Estructura semántica, accesibilidad y HUD holográfico
├── styles.css                       # Sistema de diseño futurista, temas HUD, animaciones del reactor
├── app.js                           # Lógica reactiva, Web Speech API, síntesis TTS, persistencia
├── NOVA_especificacion_frontend.md  # Especificación técnica original de producto
└── README.md                        # Guía de uso y ejecución
```

---

## 🌟 Funcionalidades Implementadas

1. **Interfaz Holográfica HUD & Reactor Dinámico:**
   - Núcleo interactivo con anillos concéntricos orbitales y lentes reflectantes.
   - Estados visuales en tiempo real: *Inactivo*, *Escuchando*, *Procesando*, *Respondiendo* y *Alerta*.
   - Temas seleccionables: **Cian Neón**, **Azul Éter**, **Esmeralda Terminal** y **Púrpura Synth**.

2. **Terminal de Chat Inteligente:**
   - Respuestas locales en lenguaje natural para consultas de hora, diagnóstico de telemetría, capacidades y directivas.
   - Botones rápidos de sugerencia inicial.
   - Acciones por mensaje: reproducción por voz en sintetizador y copia rápida al portapapeles.

3. **Interacción por Voz Bidireccional (Web Speech API):**
   - **Dictado (SpeechRecognition):** Activación con micrófono, visualización de transcripción en vivo y cancelación inmediata.
   - **Lectura en voz alta (SpeechSynthesis):** Detección automática de voces en español del sistema operativo, ajuste de tono y velocidad.

4. **Modo Inmersivo de Voz:**
   - Vista a pantalla completa con reactor gigante, canvas interactivo y visualizador de barras de onda en tiempo real.

5. **Centro de Actividad & Telemetría:**
   - Métricas en vivo (mensajes totales, dictados de voz, tiempo de sesión y peso en memoria local).
   - Diagnóstico en tiempo real de compatibilidad de APIs del navegador.
   - Exportación de reporte de telemetría en formato JSON descargable.

6. **Privacidad y Memoria Local (`localStorage`):**
   - Historial de sesiones guardable en el navegador.
   - Cero transmisión de datos a servidores externos.
   - Botón de purga total e inmediata de datos locales con confirmación de seguridad.
