# NOVA — Especificación técnica frontend
**Versión:** 0.1  
**Tipo de documento:** Especificación de producto, UI/UX y frontend  
**Alcance:** Exclusivamente frontend con HTML5, CSS3 y JavaScript puro

## 1. Visión del producto

NOVA es un prototipo de asistente personal inspirado en JARVIS. Su objetivo es ofrecer una interfaz tecnológica, elegante e intuitiva desde la que el usuario pueda conversar, interactuar por voz cuando el navegador lo permita y acceder a módulos de control.

La primera versión prioriza la experiencia de usuario (UX), la interfaz visual (UI) y la validación del flujo de interacción. No requiere backend, frameworks ni servicios externos.

## 2. Referentes de experiencia

Los siguientes productos sirven como referencias de diseño y patrones de interacción. La propuesta no busca copiar sus interfaces, sino adaptar ideas útiles al alcance de NOVA.

### 2.1 ChatGPT Voice
- Referencia: https://chatgpt.com/es-419/features/voice/
- Aprendizajes: combinar voz y texto, mantener la conversación visible y facilitar el acceso al micrófono.
- Aplicación en NOVA: controles de voz claros, mensajes legibles y estados de interacción diferenciados.

### 2.2 ElevenLabs Conversational AI
- Referencia: https://elevenlabs.io/conversational-ai
- Aprendizajes: dar personalidad al asistente y diseñar una interacción conversacional natural.
- Aplicación en NOVA: identidad visual propia, animaciones y estados de escucha o respuesta.

### 2.3 Vercel Chatbot UI
- Referencia: https://vercel.com/templates/template/chatbot-ui
- Aprendizajes: organización de conversaciones, historial, navegación y composición de mensajes.
- Aplicación en NOVA: panel lateral, historial y campo de entrada sencillo.

## 3. Dirección visual y principios de UX

### Identidad visual
- Tema oscuro como opción predeterminada.
- Acentos cian y azules, con iluminación sutil.
- Núcleo o esfera animada que represente la actividad del asistente.
- Tipografía legible y jerarquía visual consistente.
- Paneles con separación clara y efectos visuales moderados.

### Principios de experiencia
1. **Claridad:** las acciones principales deben ser fáciles de encontrar.
2. **Feedback:** cada acción debe mostrar una respuesta visual o textual.
3. **Consistencia:** botones, estados y componentes deben comportarse de forma predecible.
4. **Accesibilidad:** usar etiquetas, contraste adecuado, foco visible y controles utilizables con teclado.
5. **Diseño adaptable:** la interfaz debe ajustarse a escritorio, tabletas y móviles.
6. **Privacidad local:** informar al usuario cuando los datos se guardan en el dispositivo y permitir borrar ese contenido.

## 4. Especificación técnica

| Elemento | Decisión |
|---|---|
| Arquitectura | Aplicación frontend estática |
| Tecnologías | HTML5, CSS3 y JavaScript ES6+ |
| Frameworks | Ninguno |
| Dependencias obligatorias | Ninguna |
| Persistencia opcional | `localStorage` |
| Voz | Web Speech API, si el navegador la soporta |
| Backend | Fuera del alcance |
| API de IA | No conectada en esta versión |
| Compatibilidad | Navegadores modernos; ciertas funciones dependen del navegador y permisos |

## 5. Estructura de archivos

```text
jarvis-frontend/
├── index.html
├── styles.css
└── app.js
```

### `index.html`
Define la estructura semántica de la aplicación:
- Navegación y paneles.
- Área principal de conversación.
- Campo para redactar mensajes.
- Botones de voz y acciones.
- Módulos de actividad y configuración.

### `styles.css`
Define la presentación:
- Variables de color, espaciado y tipografía.
- Diseño responsive.
- Estados de botones y controles.
- Animaciones y efectos luminosos.
- Tema oscuro y alternativa de contraste o modo claro, según la implementación.

### `app.js`
Controla el comportamiento:
- Estado de la interfaz.
- Envío y representación de mensajes.
- Respuestas de demostración.
- Historial local opcional.
- Dictado y lectura por voz cuando estén disponibles.
- Preferencias y comandos locales.

## 6. Funcionalidades del prototipo

### 6.1 Interfaz de asistente
- Panel principal con identidad visual NOVA.
- Esfera o núcleo animado.
- Sugerencias para iniciar una conversación.
- Estados visuales básicos del asistente.

### 6.2 Chat interactivo
- Enviar mensajes desde un campo de texto.
- Mostrar mensajes del usuario y respuestas del asistente.
- Iniciar una conversación nueva.
- Mantener el contexto de la conversación en la interfaz durante la sesión.

### 6.3 Dictado por voz
- Usar reconocimiento de voz del navegador cuando esté disponible.
- Solicitar permiso de micrófono cuando corresponda.
- Mostrar feedback sobre el estado de escucha.
- Ofrecer el teclado como alternativa si la función no está disponible.

### 6.4 Respuestas habladas
- Usar `SpeechSynthesis` para leer respuestas.
- Utilizar las voces instaladas o disponibles en el dispositivo.
- Permitir activar o desactivar la lectura por voz.

### 6.5 Centro de actividad
- Mostrar métricas sencillas, como el número de mensajes.
- Mostrar eventos recientes de la sesión.
- Diferenciar actividad de interfaz de funciones realmente conectadas a servicios externos.

### 6.6 Memoria local
- Permitir guardar preferencias o historial mediante `localStorage`, si se activa.
- Informar que la información se conserva en el navegador del dispositivo.
- Permitir borrar los datos locales desde la interfaz.
- No almacenar contraseñas, secretos ni credenciales.

### 6.7 Personalización
- Cambiar el nombre del asistente o del usuario.
- Configurar lectura por voz.
- Alternar el tema o contraste, según lo implementado.
- Conservar las preferencias localmente cuando el almacenamiento esté habilitado.

### 6.8 Diseño responsive
- Escritorio: navegación lateral y área principal amplia.
- Tableta: paneles reorganizados para aprovechar el espacio.
- Móvil: navegación compacta, controles táctiles y conversación prioritaria.

## 7. Estados de interfaz recomendados

La interfaz debe distinguir visualmente estos estados:
- **Inactivo:** el asistente espera una acción.
- **Escuchando:** el navegador está capturando voz, si se ha concedido permiso.
- **Procesando:** la interfaz está ejecutando una acción local o preparando una respuesta de demostración.
- **Respondiendo:** se muestra o reproduce la respuesta.
- **Error o función no disponible:** se explica qué ocurrió y se ofrece una alternativa.

Los estados de “procesando” o “respondiendo” no deben sugerir que existe una IA conectada si solo se están utilizando reglas locales.

## 8. Límites de la versión

| Funcionalidad | Alcance |
|---|---|
| Interfaz visual y navegación | Incluida |
| Chat de demostración | Incluido |
| Dictado por voz | Condicionado al soporte y permisos del navegador |
| Lectura de respuestas | Condicionada a la disponibilidad de `SpeechSynthesis` |
| Historial local | Opcional, en el dispositivo |
| Respuestas generadas por un modelo de IA | No incluido |
| Búsqueda real en internet | No incluida |
| Control de aplicaciones o dispositivos | No incluido |
| Sincronización entre dispositivos | No incluida |
| Memoria inteligente remota | No incluida |

**Importante:** las respuestas de demostración se generan con JavaScript local. No equivalen a una inteligencia artificial real ni a un asistente conectado a servicios externos.

## 9. Ejecución local

1. Descargar y descomprimir el proyecto.
2. Abrir la carpeta `jarvis-frontend`.
3. Abrir `index.html` en un navegador moderno.
4. Probar la conversación, la navegación, los ajustes y los controles de voz.

El dictado por voz puede requerir permisos y un contexto seguro, como `localhost` o HTTPS, según el navegador. Si el reconocimiento de voz no está disponible, el resto de la interfaz debe seguir siendo utilizable.

## 10. Criterios de aceptación

La versión se considera lista para una primera validación cuando:
- La interfaz carga sin errores de JavaScript.
- Se puede escribir y enviar un mensaje.
- Los mensajes se diferencian visualmente.
- Los controles principales tienen etiquetas claras.
- La navegación funciona en escritorio y móvil.
- Las funciones de voz muestran estados claros y ofrecen una alternativa.
- Las preferencias y el historial no se guardan sin que la implementación lo indique.
- La aplicación no afirma disponer de capacidades de IA, internet o control de dispositivos que no estén conectadas.

## 11. Próximas iteraciones recomendadas

1. **Modo inmersivo:** vista de voz con núcleo animado y estados de escucha, procesamiento y respuesta.
2. **Comandos locales:** acciones controladas como consultar la hora del dispositivo, cambiar de panel o abrir herramientas permitidas.
3. **Pruebas de usabilidad:** validar navegación, comprensión de estados, legibilidad y facilidad de uso con usuarios.
4. **Preparación para integración futura:** separar el motor de respuestas de los componentes de interfaz para que, en otra fase, se pueda conectar una API sin rehacer el diseño.

## 12. Resumen

NOVA se plantea como un prototipo frontend de asistente personal con una identidad visual futurista y una experiencia centrada en la conversación. La primera fase se limita estrictamente a HTML5, CSS3 y JavaScript puro, con funciones locales y capacidades del navegador cuando estén disponibles. La conexión con modelos de IA, búsqueda web, servicios remotos y control de dispositivos queda fuera del alcance actual.
