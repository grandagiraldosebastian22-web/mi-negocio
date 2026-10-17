/**
 * ============================================================================
 * NOVA — ASISTENTE PERSONAL FUTURISTA
 * Motor de lógica frontend, reconocimiento/síntesis de voz y gestión de estados
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURACIÓN Y ESTADO GLOBAL
  // --------------------------------------------------------------------------
  const APP_STORAGE_KEY = 'nova_system_data_v1';

  const DEFAULT_SETTINGS = {
    assistantName: 'NOVA',
    userName: 'Operador',
    theme: 'cyan',
    ttsEnabled: true,
    sfxEnabled: true,
    voiceURI: '',
    speechRate: 1.0,
    speechPitch: 1.0,
    saveLocalHistory: true
  };

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    currentView: 'chat', // 'chat', 'immersive', 'activity', 'settings'
    assistantState: 'idle', // 'idle', 'listening', 'processing', 'speaking', 'error'
    currentConversationId: null,
    conversations: [], // [{ id, title, createdAt, messages: [{ sender, text, timestamp }] }]
    metrics: {
      sessionStartTime: Date.now(),
      totalMessages: 0,
      voiceQueries: 0
    },
    activityLogs: [],
    speech: {
      recognition: null,
      isListening: false,
      availableVoices: [],
      selectedVoice: null
    },
    audioCtx: null
  };

  // --------------------------------------------------------------------------
  // 2. REFERENCIAS AL DOM
  // --------------------------------------------------------------------------
  const DOM = {
    body: document.body,
    // Sidebar y Navegación
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    btnCloseSidebar: document.getElementById('btn-close-sidebar'),
    btnNewChat: document.getElementById('btn-new-chat'),
    historyList: document.getElementById('history-list'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    navTabs: document.querySelectorAll('.nav-tab'),
    systemStatusDot: document.getElementById('system-status-dot'),
    systemStatusText: document.getElementById('system-status-text'),

    // Header HUD
    assistantNameDisplay: document.getElementById('assistant-name-display'),
    assistantStateBadge: document.getElementById('assistant-state-badge'),
    miniCore: document.getElementById('mini-core'),
    hudClock: document.getElementById('hud-clock'),
    btnToggleTts: document.getElementById('btn-toggle-tts'),
    btnToggleSfx: document.getElementById('btn-toggle-sfx'),
    btnResetSession: document.getElementById('btn-reset-session'),

    // Vistas
    views: {
      chat: document.getElementById('view-chat'),
      immersive: document.getElementById('view-immersive'),
      activity: document.getElementById('view-activity'),
      settings: document.getElementById('view-settings')
    },

    // Chat
    chatWelcomeContainer: document.getElementById('chat-welcome-container'),
    messagesContainer: document.getElementById('messages-container'),
    typingIndicator: document.getElementById('typing-indicator'),
    chatForm: document.getElementById('chat-form'),
    chatTextarea: document.getElementById('chat-textarea'),
    btnSendMessage: document.getElementById('btn-send-message'),
    btnMic: document.getElementById('btn-mic'),
    voiceListeningBanner: document.getElementById('voice-listening-banner'),
    voiceBannerText: document.getElementById('voice-banner-text'),
    btnCancelVoice: document.getElementById('btn-cancel-voice'),
    promptCards: document.querySelectorAll('.prompt-card'),

    // Modo Inmersivo
    btnExitImmersive: document.getElementById('btn-exit-immersive'),
    btnImmersiveMic: document.getElementById('btn-immersive-mic'),
    immersiveStatusText: document.getElementById('immersive-status-text'),
    immersiveTranscriptPreview: document.getElementById('immersive-transcript-preview'),
    audioWaveBars: document.getElementById('audio-wave-bars'),
    immersiveCanvas: document.getElementById('immersive-audio-canvas'),

    // Centro de Actividad
    metricTotalMessages: document.getElementById('metric-total-messages'),
    metricVoiceQueries: document.getElementById('metric-voice-queries'),
    metricSessionDuration: document.getElementById('metric-session-duration'),
    metricStorageSize: document.getElementById('metric-storage-size'),
    activityLogStream: document.getElementById('activity-log-stream'),
    btnExportSession: document.getElementById('btn-export-session'),

    // Diagnóstico
    capSpeechRec: document.getElementById('cap-speech-rec'),
    capSpeechSynth: document.getElementById('cap-speech-synth'),
    capStorage: document.getElementById('cap-storage'),
    capAudioApi: document.getElementById('cap-audio-api'),

    // Ajustes
    cfgAssistantName: document.getElementById('cfg-assistant-name'),
    cfgUserName: document.getElementById('cfg-user-name'),
    themeButtons: document.querySelectorAll('.theme-btn'),
    cfgTtsEnabled: document.getElementById('cfg-tts-enabled'),
    cfgVoiceSelect: document.getElementById('cfg-voice-select'),
    cfgSpeechRate: document.getElementById('cfg-speech-rate'),
    valSpeechRate: document.getElementById('val-speech-rate'),
    cfgSpeechPitch: document.getElementById('cfg-speech-pitch'),
    valSpeechPitch: document.getElementById('val-speech-pitch'),
    btnTestVoice: document.getElementById('btn-test-voice'),
    cfgSaveLocal: document.getElementById('cfg-save-local'),
    btnPurgeAllData: document.getElementById('btn-purge-all-data'),

    // Toast
    toast: document.getElementById('toast-notification'),
    toastMessage: document.getElementById('toast-message')
  };

  // --------------------------------------------------------------------------
  // 3. SÍNTESIS DE AUDIO PROCEDURAL (WEB AUDIO API SFX)
  // --------------------------------------------------------------------------
  function initAudioContext() {
    if (!state.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtxClass();
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playSfx(type) {
    if (!state.settings.sfxEnabled) return;
    try {
      initAudioContext();
      if (!state.audioCtx) return;

      const now = state.audioCtx.currentTime;
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      if (type === 'mic-start') {
        // Tono ascendente agradable
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'mic-end') {
        // Tono descendente
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'send') {
        // Pulso rápido de transmisión
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.08);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'response') {
        // Campanilla tecnológica doble
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // Mi
        osc.frequency.setValueAtTime(880, now + 0.08); // La
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'click') {
        // Micro-click suave
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (e) {
      // Ignorar restricciones de audio de navegador silenciosamente
    }
  }

  // --------------------------------------------------------------------------
  // 4. PERSISTENCIA LOCAL (LOCALSTORAGE)
  // --------------------------------------------------------------------------
  function loadPersistedData() {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.settings) state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (data.conversations && Array.isArray(data.conversations)) {
          state.conversations = data.conversations;
        }
      }
    } catch (e) {
      console.warn('NOVA: Error al leer localStorage:', e);
    }
  }

  function savePersistedData() {
    if (!state.settings.saveLocalHistory) return;
    try {
      const payload = {
        settings: state.settings,
        conversations: state.conversations
      };
      localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(payload));
      updateStorageMetric();
    } catch (e) {
      console.warn('NOVA: Error al escribir en localStorage:', e);
    }
  }

  function purgeAllData() {
    try {
      localStorage.removeItem(APP_STORAGE_KEY);
      state.settings = { ...DEFAULT_SETTINGS };
      state.conversations = [];
      state.currentConversationId = null;
      applySettingsToUI();
      renderConversationList();
      resetChatView();
      logEvent('Memoria local eliminada por el usuario');
      showToast('Todos los datos locales han sido borrados con éxito.');
      updateStorageMetric();
    } catch (e) {
      showToast('Error al vaciar los datos locales.');
    }
  }

  function updateStorageMetric() {
    try {
      const raw = localStorage.getItem(APP_STORAGE_KEY) || '';
      const bytes = new Blob([raw]).size;
      const kb = (bytes / 1024).toFixed(2);
      DOM.metricStorageSize.textContent = `${kb} KB`;
    } catch (e) {
      DOM.metricStorageSize.textContent = '0 KB';
    }
  }

  // --------------------------------------------------------------------------
  // 5. GESTIÓN DE ESTADOS DEL ASISTENTE Y HUD
  // --------------------------------------------------------------------------
  function setAssistantState(newState, customLabel = null) {
    state.assistantState = newState;

    const statusMap = {
      idle: { text: 'ESTADO: INACTIVO', colorClass: 'idle', coreText: 'LISTO • STANDBY' },
      listening: { text: 'ESTADO: ESCUCHANDO...', colorClass: 'listening', coreText: 'CAPTURANDO VOZ' },
      processing: { text: 'ESTADO: PROCESANDO...', colorClass: 'processing', coreText: 'CALCULANDO' },
      speaking: { text: 'ESTADO: RESPONDIENDO', colorClass: 'speaking', coreText: 'TRANSMITIENDO' },
      error: { text: 'ESTADO: ATENCIÓN', colorClass: 'error', coreText: 'ALERTA / ERROR' }
    };

    const currentConfig = statusMap[newState] || statusMap.idle;
    const displayText = customLabel || currentConfig.text;

    // Actualizar badge del header
    DOM.assistantStateBadge.textContent = displayText;
    
    // Actualizar monitor de la barra lateral
    DOM.systemStatusText.textContent = currentConfig.coreText;
    DOM.systemStatusDot.className = `status-pulse-dot ${currentConfig.colorClass}`;

    // Actualizar vista inmersiva
    DOM.immersiveStatusText.textContent = newState.toUpperCase();
    if (newState === 'listening') {
      DOM.btnImmersiveMic.classList.add('listening');
      DOM.audioWaveBars.classList.add('active');
    } else {
      DOM.btnImmersiveMic.classList.remove('listening');
      if (newState !== 'speaking') {
        DOM.audioWaveBars.classList.remove('active');
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. MOTOR DE RECONOCIMIENTO DE VOZ (SPEECH RECOGNITION)
  // --------------------------------------------------------------------------
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      logEvent('Web Speech API: No soportada en este navegador');
      updateCapabilityBadge(DOM.capSpeechRec, false, 'No compatible (usa Chrome o Edge)');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        state.speech.isListening = true;
        setAssistantState('listening');
        DOM.btnMic.classList.add('listening');
        DOM.voiceListeningBanner.classList.remove('hidden');
        DOM.voiceBannerText.textContent = 'Escuchando... Di algo a NOVA';
        DOM.immersiveTranscriptPreview.textContent = 'Escuchando tu voz...';
        playSfx('mic-start');
        logEvent('Micrófono activado: escuchando entrada de voz');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const previewText = finalTranscript || interimTranscript;
        DOM.voiceBannerText.textContent = `Transcripción: "${previewText}"`;
        DOM.immersiveTranscriptPreview.textContent = `"${previewText}"`;
        DOM.chatTextarea.value = previewText;

        if (finalTranscript.trim()) {
          state.metrics.voiceQueries++;
          updateMetricsUI();
          stopListening();
          handleSendMessage(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        state.speech.isListening = false;
        DOM.btnMic.classList.remove('listening');
        DOM.voiceListeningBanner.classList.add('hidden');
        playSfx('mic-end');

        let msg = 'Error de reconocimiento';
        if (event.error === 'not-allowed') {
          msg = 'Permiso de micrófono denegado en el navegador.';
          setAssistantState('error', 'MIC BLOQUEADO');
        } else if (event.error === 'no-speech') {
          msg = 'No se detectó voz. Intenta de nuevo.';
          setAssistantState('idle');
        } else {
          msg = `Aviso de dictado: ${event.error}`;
          setAssistantState('idle');
        }

        logEvent(`Reconocimiento de voz: ${msg}`);
        showToast(msg);
      };

      recognition.onend = () => {
        state.speech.isListening = false;
        DOM.btnMic.classList.remove('listening');
        DOM.voiceListeningBanner.classList.add('hidden');
        if (state.assistantState === 'listening') {
          setAssistantState('idle');
        }
      };

      state.speech.recognition = recognition;
      updateCapabilityBadge(DOM.capSpeechRec, true, 'Disponible (Web Speech API)');
      logEvent('Motor de dictado de voz inicializado correctamente');
    } catch (e) {
      console.warn('Error inicializando SpeechRecognition:', e);
      updateCapabilityBadge(DOM.capSpeechRec, false, 'Error de inicialización');
    }
  }

  function toggleListening() {
    if (!state.speech.recognition) {
      showToast('El reconocimiento de voz no está soportado en este navegador. Puedes escribir con el teclado.');
      return;
    }

    if (state.speech.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  function startListening() {
    if (!state.speech.recognition) return;
    try {
      // Si el asistente está hablando, detenerlo antes de escuchar
      stopSpeaking();
      state.speech.recognition.start();
    } catch (e) {
      // Si ya estaba en curso
      console.warn('SpeechRecognition start error:', e);
    }
  }

  function stopListening() {
    if (!state.speech.recognition) return;
    try {
      state.speech.recognition.stop();
      playSfx('mic-end');
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // 7. MOTOR DE SÍNTESIS DE VOZ (SPEECH SYNTHESIS)
  // --------------------------------------------------------------------------
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      logEvent('SpeechSynthesis: No soportada en este navegador');
      updateCapabilityBadge(DOM.capSpeechSynth, false, 'No soportado');
      return;
    }

    updateCapabilityBadge(DOM.capSpeechSynth, true, 'Disponible (SpeechSynthesis)');

    const populateVoiceList = () => {
      const voices = window.speechSynthesis.getVoices();
      state.speech.availableVoices = voices;

      DOM.cfgVoiceSelect.innerHTML = '';

      if (voices.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = 'Voz predeterminada del sistema';
        opt.value = '';
        DOM.cfgVoiceSelect.appendChild(opt);
        return;
      }

      // Filtrar y priorizar voces en español
      const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
      const otherVoices = voices.filter(v => !v.lang.startsWith('es'));
      const sortedVoices = [...spanishVoices, ...otherVoices];

      sortedVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Predeterminada' : ''}`;
        if (state.settings.voiceURI && voice.voiceURI === state.settings.voiceURI) {
          option.selected = true;
          state.speech.selectedVoice = voice;
        } else if (!state.settings.voiceURI && voice.lang.startsWith('es')) {
          option.selected = true;
          state.speech.selectedVoice = voice;
          state.settings.voiceURI = voice.voiceURI;
        }
        DOM.cfgVoiceSelect.appendChild(option);
      });

      if (!state.speech.selectedVoice && voices.length > 0) {
        state.speech.selectedVoice = sortedVoices[0];
      }
    };

    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
  }

  function speakText(text) {
    if (!state.settings.ttsEnabled || !('speechSynthesis' in window)) {
      return;
    }

    try {
      stopSpeaking();

      // Limpiar markdown o etiquetas para que el sintetizador hable limpio
      const cleanText = text
        .replace(/[*_#`~[\]()]/g, '')
        .replace(/<[^>]*>/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = state.settings.speechRate || 1.0;
      utterance.pitch = state.settings.speechPitch || 1.0;

      if (state.speech.selectedVoice) {
        utterance.voice = state.speech.selectedVoice;
        utterance.lang = state.speech.selectedVoice.lang || 'es-ES';
      } else {
        utterance.lang = 'es-ES';
      }

      utterance.onstart = () => {
        setAssistantState('speaking');
        DOM.audioWaveBars.classList.add('active');
        logEvent('Síntesis de voz iniciada');
      };

      utterance.onend = () => {
        DOM.audioWaveBars.classList.remove('active');
        if (state.assistantState === 'speaking') {
          setAssistantState('idle');
        }
        logEvent('Síntesis de voz finalizada');
      };

      utterance.onerror = (err) => {
        DOM.audioWaveBars.classList.remove('active');
        if (state.assistantState === 'speaking') {
          setAssistantState('idle');
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Error en speakText:', e);
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      DOM.audioWaveBars.classList.remove('active');
      if (state.assistantState === 'speaking') {
        setAssistantState('idle');
      }
    }
  }

  // --------------------------------------------------------------------------
  // 8. MOTOR DE INTELIGENCIA LOCAL (LOCAL INTENTS & DEMO REPLIES)
  // --------------------------------------------------------------------------
  function processLocalResponse(userInput) {
    const raw = userInput.trim().toLowerCase();
    const assistant = state.settings.assistantName;
    const user = state.settings.userName;

    // 1. Saludos e Identidad
    if (/^(hola|buenos d[ií]as|buenas tardes|buenas noches|qu[eé] tal|hey|saludos)/i.test(raw)) {
      return `¡Saludos, ${user}! Soy **${assistant}**, tu asistente personal de interfaz inspirado en JARVIS. El núcleo local está en línea y todos los módulos responden con normalidad. ¿En qué puedo asistirte hoy?`;
    }

    if (/(qui[eé]n eres|cu[aá]l es tu nombre|pres[eé]ntate|identif[ií]cate)/i.test(raw)) {
      return `Soy **${assistant}**, un prototipo frontend de interfaz conversacional y control por voz diseñado para validar flujos de interacción de próxima generación.

**Aspectos clave de mi arquitectura:**
- Ejecución 100% en tu navegador (HTML5, CSS3 y JS Vanilla).
- Sin servidores externos ni dependencias obligatorias.
- Dictado y lectura mediante la Web Speech API del navegador.
- Privacidad absoluta: los datos permanecen en tu dispositivo.`;
    }

    // 2. Consulta de Fecha y Hora
    if (/(hora|fecha|qu[eé] d[ií]a es|en qu[eé] a[nñ]o estamos)/i.test(raw)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return `Con gusto, ${user}. El reloj del sistema registra:\n\n⏱️ **Hora actual:** \`${timeStr}\`\n📅 **Fecha:** \`${dateStr}\`\n\nTodos los cronómetros internos se encuentran sincronizados.`;
    }

    // 3. Diagnóstico y Telemetría
    if (/(diagn[oó]stico|estado del sistema|telemetr[ií]a|c[oó]mo est[aá]s|reporte)/i.test(raw)) {
      const isOnline = navigator.onLine ? 'Conectado a la red local' : 'Sin conexión a internet (Modo Autónomo)';
      const memory = performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB usados` : 'No expuesta por navegador';
      const hasSpeechRec = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasSpeechSynth = 'speechSynthesis' in window;

      return `**INFORME DE DIAGNÓSTICO DEL SISTEMA ${assistant}:**\n
- **Estado del Núcleo:** Operativo y responsivo.
- **Conectividad:** ${isOnline}.
- **Motor de Dictado (SpeechRec):** ${hasSpeechRec ? 'Disponible ✅' : 'No disponible en este navegador ⚠️'}.
- **Síntesis de Voz (TTS):** ${hasSpeechSynth ? 'Disponible ✅' : 'No soportado ❌'}.
- **Mensajes en esta sesión:** ${state.metrics.totalMessages}.
- **Consultas de voz:** ${state.metrics.voiceQueries}.
- **Memoria Heap estimada:** \`${memory}\`.`;
    }

    // 4. Capacidades y Directivas
    if (/(capacidades|qu[eé] puedes hacer|comandos|ayuda|directivas|funciones)/i.test(raw)) {
      return `Mis protocolos actuales me permiten ejecutar las siguientes acciones en tu navegador:

1. **Interacción por voz bidireccional:** Dictado mediante el micrófono y lectura de respuestas en voz alta.
2. **Modo Inmersivo:** Vista cinemática a pantalla completa con reactor holográfico y visualizador de frecuencias.
3. **Centro de Actividad:** Métricas en tiempo real de tu sesión y exportación de reportes en JSON.
4. **Personalización:** Modificación de mi nombre, tu alias, esquemas de color HUD (Cian, Azul, Esmeralda, Púrpura) y afinación del sintetizador de voz.
5. **Memoria Local:** Conservar conversaciones en \`localStorage\` con opción de vaciado total e instantáneo.`;
    }

    // 5. Comandos de control directo
    if (/(modo inmersivo|pantalla completa de voz|activar voz)/i.test(raw)) {
      switchView('immersive');
      return `Iniciando interfaz inmersiva de voz, ${user}. Puedes presionar el reactor central para interactuar por micrófono.`;
    }

    if (/(centro de actividad|m[eé]tricas|ver telemetr[ií]a)/i.test(raw)) {
      switchView('activity');
      return `Accediendo al Centro de Actividad y registros del sistema.`;
    }

    if (/(configuraci[oó]n|ajustes|opciones)/i.test(raw)) {
      switchView('settings');
      return `Abriendo el panel de configuración del sistema.`;
    }

    if (/(limpiar chat|nueva sesi[oó]n|reiniciar conversaci[oó]n)/i.test(raw)) {
      createNewConversation();
      return `Terminal reiniciado. Se ha iniciado una nueva sesión de conversación limpia.`;
    }

    // 6. Privacidad y Seguridad
    if (/(privacidad|seguridad|guardas mis datos|esp[ií]a|servidor)/i.test(raw)) {
      return `**Protocolo de Privacidad y Confidencialidad de ${assistant}:**\n
- Tus consultas **nunca** abandonan este dispositivo.
- No hay servidores externos, telemetría oculta ni recopilación de credenciales.
- La persistencia es 100% controlable desde el panel de **Configuración**. Puedes desactivarla o borrar la memoria con un solo clic.`;
    }

    // 7. Agradecimientos y despedidas
    if (/(gracias|muchas gracias|excelente|bien hecho)/i.test(raw)) {
      return `Es un honor servirte, ${user}. Mantendré los sensores en alerta por si requieres algo más.`;
    }

    if (/(adi[oó]s|hasta luego|ap[aá]gate|descansa)/i.test(raw)) {
      return `Entrando en modo de bajo consumo, ${user}. Estaré aquí cuando me necesites.`;
    }

    // 8. Respuesta de demostración inteligente para consultas generales
    return `Comprendo tu solicitud sobre: *" ${userInput} "*.

Como este es un **prototipo frontend estático** enfocado en UI/UX y control de voz local, no cuento con conexión a un modelo LLM en la nube ni búsqueda web externa. Sin embargo, todos mis componentes de interfaz, reconocimiento de voz y animación visual están plenamente funcionales para validar la experiencia de usuario de ${assistant}.

Puedes probar comandos como *"¿Qué hora es?"*, *"Diagnóstico"*, o pedirme *"Modo inmersivo"*.`;
  }

  // --------------------------------------------------------------------------
  // 9. GESTIÓN DE MENSAJES Y CONVERSACIÓN
  // --------------------------------------------------------------------------
  function createNewConversation() {
    stopSpeaking();
    stopListening();

    const newId = 'conv_' + Date.now();
    const newConv = {
      id: newId,
      title: 'Nueva Conversación',
      createdAt: new Date().toISOString(),
      messages: []
    };

    state.conversations.unshift(newConv);
    state.currentConversationId = newId;

    renderConversationList();
    renderActiveConversation();
    logEvent('Nueva sesión de conversación iniciada');
    showToast('Nueva sesión de conversación preparada.');
  }

  function getActiveConversation() {
    if (!state.currentConversationId && state.conversations.length > 0) {
      state.currentConversationId = state.conversations[0].id;
    }
    return state.conversations.find(c => c.id === state.currentConversationId) || null;
  }

  function handleSendMessage(text) {
    const messageText = (text || DOM.chatTextarea.value).trim();
    if (!messageText) return;

    // Asegurarse de tener conversación activa
    let conv = getActiveConversation();
    if (!conv) {
      createNewConversation();
      conv = getActiveConversation();
    }

    // Si es el primer mensaje, renombrar la conversación
    if (conv.messages.length === 0) {
      const shortTitle = messageText.length > 28 ? messageText.substring(0, 28) + '...' : messageText;
      conv.title = shortTitle;
      renderConversationList();
    }

    // Agregar mensaje del usuario
    const userMsg = {
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    conv.messages.push(userMsg);
    state.metrics.totalMessages++;
    updateMetricsUI();

    // Limpiar input
    DOM.chatTextarea.value = '';
    DOM.chatTextarea.style.height = 'auto';

    renderActiveConversation();
    playSfx('send');
    logEvent(`Mensaje de usuario enviado: "${messageText.substring(0, 30)}..."`);

    // Mostrar estado de procesamiento
    setAssistantState('processing');
    DOM.typingIndicator.classList.remove('hidden');
    scrollToBottom();

    // Simular tiempo de respuesta local realista (entre 350ms y 750ms)
    setTimeout(() => {
      DOM.typingIndicator.classList.add('hidden');
      const replyText = processLocalResponse(messageText);

      const assistantMsg = {
        sender: 'nova',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      conv.messages.push(assistantMsg);
      state.metrics.totalMessages++;
      updateMetricsUI();

      renderActiveConversation();
      savePersistedData();
      playSfx('response');

      // Hablar respuesta si TTS está activo
      speakText(replyText);
    }, 450);
  }

  function renderActiveConversation() {
    const conv = getActiveConversation();
    const hasMessages = conv && conv.messages.length > 0;

    if (!hasMessages) {
      DOM.chatWelcomeContainer.style.display = 'flex';
      DOM.messagesContainer.innerHTML = '';
      return;
    }

    DOM.chatWelcomeContainer.style.display = 'none';
    DOM.messagesContainer.innerHTML = '';

    conv.messages.forEach((msg, idx) => {
      const row = document.createElement('div');
      const isUser = msg.sender === 'user';
      row.className = `message-row ${isUser ? 'user-row' : 'nova-row'}`;

      const avatarHtml = isUser
        ? `<div class="message-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>`
        : `<div class="message-avatar" aria-hidden="true"><span class="core-ring-mini"></span><span class="core-center-dot"></span></div>`;

      const authorName = isUser ? state.settings.userName : state.settings.assistantName;

      // Formatear Markdown simple (negrita, código, saltos de línea)
      const formattedBody = formatMessageMarkdown(msg.text);

      const actionsHtml = !isUser
        ? `<div class="message-actions">
            <button class="btn-msg-action btn-speak-msg" data-idx="${idx}" title="Reproducir por voz">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <span>Voz</span>
            </button>
            <button class="btn-msg-action btn-copy-msg" data-idx="${idx}" title="Copiar texto">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copiar</span>
            </button>
          </div>`
        : '';

      row.innerHTML = `
        ${avatarHtml}
        <div class="message-bubble-wrap">
          <div class="message-meta">
            <span class="meta-author">${escapeHtml(authorName)}</span>
            <span class="meta-time">${msg.timestamp}</span>
          </div>
          <div class="message-body">${formattedBody}</div>
          ${actionsHtml}
        </div>
      `;

      DOM.messagesContainer.appendChild(row);
    });

    // Enlazar botones de acción en mensajes
    DOM.messagesContainer.querySelectorAll('.btn-speak-msg').forEach(btn => {
      btn.onclick = (e) => {
        const idx = btn.getAttribute('data-idx');
        if (conv.messages[idx]) {
          speakText(conv.messages[idx].text);
        }
      };
    });

    DOM.messagesContainer.querySelectorAll('.btn-copy-msg').forEach(btn => {
      btn.onclick = async () => {
        const idx = btn.getAttribute('data-idx');
        if (conv.messages[idx]) {
          await navigator.clipboard.writeText(conv.messages[idx].text);
          showToast('Texto copiado al portapapeles');
        }
      };
    });

    scrollToBottom();
  }

  function formatMessageMarkdown(text) {
    if (!text) return '';
    let parsed = escapeHtml(text);

    // Negritas: **texto**
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Código en línea: `código`
    parsed = parsed.replace(/`(.*?)`/g, '<code>$1</code>');
    // Saltos de línea
    parsed = parsed.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');

    return `<p>${parsed}</p>`;
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scrollToBottom() {
    DOM.messagesContainer.scrollTop = DOM.messagesContainer.scrollHeight;
  }

  function renderConversationList() {
    DOM.historyList.innerHTML = '';
    if (state.conversations.length === 0) {
      DOM.historyList.innerHTML = `<span style="font-size: 0.78rem; color: var(--text-dim); padding: 0.5rem;">Sin sesiones guardadas</span>`;
      return;
    }

    state.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = `history-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
      item.role = 'listitem';

      item.innerHTML = `
        <span class="history-item-title" title="${escapeHtml(conv.title)}">💬 ${escapeHtml(conv.title)}</span>
        <button class="btn-delete-history" title="Eliminar conversación" aria-label="Eliminar conversación">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      item.onclick = (e) => {
        if (e.target.closest('.btn-delete-history')) return;
        state.currentConversationId = conv.id;
        renderConversationList();
        renderActiveConversation();
        switchView('chat');
        playSfx('click');
      };

      const btnDel = item.querySelector('.btn-delete-history');
      btnDel.onclick = (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      };

      DOM.historyList.appendChild(item);
    });
  }

  function deleteConversation(id) {
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.currentConversationId === id) {
      state.currentConversationId = state.conversations.length > 0 ? state.conversations[0].id : null;
    }
    renderConversationList();
    renderActiveConversation();
    savePersistedData();
    showToast('Conversación eliminada');
  }

  function resetChatView() {
    state.currentConversationId = null;
    renderActiveConversation();
  }

  // --------------------------------------------------------------------------
  // 10. GESTIÓN DE VISTAS (SPA SWITCHING)
  // --------------------------------------------------------------------------
  function switchView(viewName) {
    state.currentView = viewName;

    // Actualizar paneles visibles
    Object.keys(DOM.views).forEach(vKey => {
      if (DOM.views[vKey]) {
        if (vKey === viewName) {
          DOM.views[vKey].classList.add('active');
        } else {
          DOM.views[vKey].classList.remove('active');
        }
      }
    });

    // Actualizar tabs activas en la barra lateral
    DOM.navTabs.forEach(tab => {
      const tabView = tab.getAttribute('data-view');
      if (tabView === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // En móviles, cerrar sidebar al seleccionar vista
    closeSidebar();
    playSfx('click');
    logEvent(`Vista cambiada a: ${viewName}`);

    if (viewName === 'immersive') {
      DOM.immersiveStatusText.textContent = state.assistantState.toUpperCase();
    }
  }

  function openSidebar() {
    DOM.sidebar.classList.add('open');
    DOM.sidebarOverlay.classList.add('active');
  }

  function closeSidebar() {
    DOM.sidebar.classList.remove('open');
    DOM.sidebarOverlay.classList.remove('active');
  }

  // --------------------------------------------------------------------------
  // 11. AJUSTES Y CONFIGURACIÓN
  // --------------------------------------------------------------------------
  function applySettingsToUI() {
    DOM.body.setAttribute('data-theme', state.settings.theme);
    DOM.assistantNameDisplay.textContent = `${state.settings.assistantName} AI`;
    DOM.cfgAssistantName.value = state.settings.assistantName;
    DOM.cfgUserName.value = state.settings.userName;
    DOM.cfgTtsEnabled.checked = state.settings.ttsEnabled;
    DOM.cfgSaveLocal.checked = state.settings.saveLocalHistory;
    DOM.cfgSpeechRate.value = state.settings.speechRate;
    DOM.valSpeechRate.textContent = state.settings.speechRate.toFixed(1);
    DOM.cfgSpeechPitch.value = state.settings.speechPitch;
    DOM.valSpeechPitch.textContent = state.settings.speechPitch.toFixed(1);

    // Botón TTS del Header
    if (state.settings.ttsEnabled) {
      DOM.btnToggleTts.classList.add('active');
      DOM.btnToggleTts.querySelector('.tool-label').textContent = 'VOZ ON';
    } else {
      DOM.btnToggleTts.classList.remove('active');
      DOM.btnToggleTts.querySelector('.tool-label').textContent = 'VOZ OFF';
    }

    // Botones de esquema de color
    DOM.themeButtons.forEach(btn => {
      if (btn.getAttribute('data-color') === state.settings.theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // --------------------------------------------------------------------------
  // 12. TELEMETRÍA, MÉTRICAS Y LOGS
  // --------------------------------------------------------------------------
  function logEvent(text) {
    const time = new Date().toLocaleTimeString();
    const entry = { time, text };
    state.activityLogs.unshift(entry);

    if (state.activityLogs.length > 50) {
      state.activityLogs.pop();
    }

    renderLogs();
  }

  function renderLogs() {
    if (!DOM.activityLogStream) return;
    DOM.activityLogStream.innerHTML = '';
    state.activityLogs.forEach(log => {
      const row = document.createElement('div');
      row.className = 'log-entry';
      row.innerHTML = `<span class="log-time">[${log.time}]</span><span class="log-text">${escapeHtml(log.text)}</span>`;
      DOM.activityLogStream.appendChild(row);
    });
  }

  function updateMetricsUI() {
    DOM.metricTotalMessages.textContent = state.metrics.totalMessages;
    DOM.metricVoiceQueries.textContent = state.metrics.voiceQueries;

    const elapsedSeconds = Math.floor((Date.now() - state.metrics.sessionStartTime) / 1000);
    const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const secs = String(elapsedSeconds % 60).padStart(2, '0');
    DOM.metricSessionDuration.textContent = `${mins}:${secs}`;
  }

  function updateCapabilityBadge(element, isSupported, detail) {
    if (!element) return;
    const badge = element.querySelector('.cap-status');
    const title = element.querySelector('.cap-title');

    if (isSupported) {
      badge.textContent = 'ACTIVO';
      badge.className = 'cap-status ok';
    } else {
      badge.textContent = 'NO DISPONIBLE';
      badge.className = 'cap-status unsupported';
    }
    title.textContent = `${title.textContent.split(' — ')[0]} — ${detail}`;
  }

  function exportSessionReport() {
    const report = {
      system: 'NOVA Asistente Frontend',
      version: '0.1',
      exportedAt: new Date().toISOString(),
      metrics: {
        totalMessages: state.metrics.totalMessages,
        voiceQueries: state.metrics.voiceQueries,
        sessionDurationSeconds: Math.floor((Date.now() - state.metrics.sessionStartTime) / 1000)
      },
      settings: state.settings,
      conversations: state.conversations,
      activityLogs: state.activityLogs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova_session_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logEvent('Reporte de sesión exportado en JSON');
    showToast('Reporte de telemetría descargado.');
  }

  // --------------------------------------------------------------------------
  // 13. TOAST Y RELOJ HUD
  // --------------------------------------------------------------------------
  let toastTimer = null;
  function showToast(message) {
    DOM.toastMessage.textContent = message;
    DOM.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.add('hidden');
    }, 3200);
  }

  function updateHudClock() {
    const now = new Date();
    DOM.hudClock.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // --------------------------------------------------------------------------
  // 14. CANVAS ANIMADO EN MODO INMERSIVO (AUDIO VISUALIZER EFFECT)
  // --------------------------------------------------------------------------
  function initImmersiveCanvas() {
    const canvas = DOM.immersiveCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let angle = 0;

    function renderCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = 45;

      const isSpeaking = state.assistantState === 'speaking';
      const isListening = state.assistantState === 'listening';

      ctx.save();
      ctx.translate(centerX, centerY);

      // Dibujar partículas rotativas
      const particleCount = isSpeaking || isListening ? 28 : 16;
      for (let i = 0; i < particleCount; i++) {
        const rad = (i / particleCount) * Math.PI * 2 + angle;
        const distOffset = (isSpeaking || isListening) ? Math.sin(angle * 4 + i) * 14 : Math.sin(angle * 2 + i) * 5;
        const x = Math.cos(rad) * (baseRadius + distOffset);
        const y = Math.sin(rad) * (baseRadius + distOffset);

        ctx.beginPath();
        ctx.arc(x, y, (isSpeaking || isListening) ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isListening ? '#00f5a0' : (isSpeaking ? '#00d2ff' : '#00f2fe');
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      ctx.restore();
      angle += (isSpeaking || isListening) ? 0.04 : 0.015;
      requestAnimationFrame(renderCanvas);
    }

    renderCanvas();
  }

  // --------------------------------------------------------------------------
  // 15. REGISTRO DE EVENTOS DEL USUARIO (LISTENERS)
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // 1. Navegación en Barra Lateral
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-view');
        switchView(view);
      });
    });

    DOM.btnToggleSidebar.addEventListener('click', openSidebar);
    DOM.btnCloseSidebar.addEventListener('click', closeSidebar);
    DOM.sidebarOverlay.addEventListener('click', closeSidebar);

    DOM.btnNewChat.addEventListener('click', () => {
      createNewConversation();
      switchView('chat');
      if (window.innerWidth <= 768) closeSidebar();
    });

    DOM.btnClearHistory.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar el historial de conversaciones guardado en este navegador?')) {
        state.conversations = [];
        state.currentConversationId = null;
        renderConversationList();
        renderActiveConversation();
        savePersistedData();
        showToast('Historial local limpiado.');
      }
    });

    // 2. Header HUD Tools
    DOM.btnToggleTts.addEventListener('click', () => {
      state.settings.ttsEnabled = !state.settings.ttsEnabled;
      DOM.cfgTtsEnabled.checked = state.settings.ttsEnabled;
      applySettingsToUI();
      savePersistedData();
      showToast(state.settings.ttsEnabled ? 'Lectura por voz activada' : 'Lectura por voz desactivada');
      playSfx('click');
    });

    DOM.btnToggleSfx.addEventListener('click', () => {
      state.settings.sfxEnabled = !state.settings.sfxEnabled;
      DOM.btnToggleSfx.classList.toggle('active', state.settings.sfxEnabled);
      showToast(state.settings.sfxEnabled ? 'Efectos de sonido activados' : 'Efectos de sonido silenciados');
    });

    DOM.btnResetSession.addEventListener('click', () => {
      createNewConversation();
    });

    // 3. Envío de Mensajes y Entrada
    DOM.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage();
    });

    DOM.chatTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-ajuste de altura del textarea
    DOM.chatTextarea.addEventListener('input', () => {
      DOM.chatTextarea.style.height = 'auto';
      DOM.chatTextarea.style.height = Math.min(DOM.chatTextarea.scrollHeight, 120) + 'px';
    });

    // Botón de Micrófono Principal
    DOM.btnMic.addEventListener('click', toggleListening);
    DOM.btnCancelVoice.addEventListener('click', stopListening);

    // Sugerencias de prompt inicial
    DOM.promptCards.forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        DOM.chatTextarea.value = prompt;
        handleSendMessage(prompt);
      });
    });

    // 4. Modo Inmersivo
    DOM.btnExitImmersive.addEventListener('click', () => {
      switchView('chat');
    });

    DOM.btnImmersiveMic.addEventListener('click', () => {
      toggleListening();
    });

    // 5. Centro de Actividad
    DOM.btnExportSession.addEventListener('click', exportSessionReport);

    // 6. Configuración
    DOM.cfgAssistantName.addEventListener('change', (e) => {
      const val = e.target.value.trim() || 'NOVA';
      state.settings.assistantName = val;
      DOM.assistantNameDisplay.textContent = `${val} AI`;
      savePersistedData();
      showToast(`Nombre actualizado a ${val}`);
    });

    DOM.cfgUserName.addEventListener('change', (e) => {
      const val = e.target.value.trim() || 'Operador';
      state.settings.userName = val;
      savePersistedData();
      showToast(`Nombre de usuario actualizado a ${val}`);
    });

    DOM.themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-color');
        state.settings.theme = theme;
        applySettingsToUI();
        savePersistedData();
        playSfx('click');
        logEvent(`Tema HUD cambiado a: ${theme}`);
      });
    });

    DOM.cfgTtsEnabled.addEventListener('change', (e) => {
      state.settings.ttsEnabled = e.target.checked;
      applySettingsToUI();
      savePersistedData();
    });

    DOM.cfgVoiceSelect.addEventListener('change', (e) => {
      state.settings.voiceURI = e.target.value;
      state.speech.selectedVoice = state.speech.availableVoices.find(v => v.voiceURI === e.target.value) || null;
      savePersistedData();
    });

    DOM.cfgSpeechRate.addEventListener('input', (e) => {
      state.settings.speechRate = parseFloat(e.target.value);
      DOM.valSpeechRate.textContent = state.settings.speechRate.toFixed(1);
      savePersistedData();
    });

    DOM.cfgSpeechPitch.addEventListener('input', (e) => {
      state.settings.speechPitch = parseFloat(e.target.value);
      DOM.valSpeechPitch.textContent = state.settings.speechPitch.toFixed(1);
      savePersistedData();
    });

    DOM.btnTestVoice.addEventListener('click', () => {
      speakText(`Protocolo de prueba. Esta es la voz configurada para ${state.settings.assistantName}. Todos los sistemas operan correctamente.`);
    });

    DOM.cfgSaveLocal.addEventListener('change', (e) => {
      state.settings.saveLocalHistory = e.target.checked;
      if (state.settings.saveLocalHistory) {
        savePersistedData();
        showToast('Persistencia local activada');
      } else {
        showToast('Persistencia local desactivada para nuevas acciones');
      }
    });

    DOM.btnPurgeAllData.addEventListener('click', () => {
      if (confirm('¿ATENCIÓN: Estás seguro de borrar todos los datos locales, historial y preferencias de NOVA en este dispositivo?')) {
        purgeAllData();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 16. INICIALIZACIÓN GENERAL DEL SISTEMA
  // --------------------------------------------------------------------------
  function init() {
    logEvent('Iniciando protocolos del sistema NOVA v0.1...');

    // 1. Cargar persistencia
    loadPersistedData();
    applySettingsToUI();
    renderConversationList();

    // 2. Si no hay conversaciones, crear la primera
    if (state.conversations.length === 0) {
      createNewConversation();
    } else {
      renderActiveConversation();
    }

    // 3. Inicializar motores de voz y audio
    initSpeechRecognition();
    initSpeechSynthesis();
    initImmersiveCanvas();

    // 4. Diagnóstico de capacidades
    updateCapabilityBadge(DOM.capStorage, ('localStorage' in window), 'Almacenamiento en dispositivo');
    updateCapabilityBadge(DOM.capAudioApi, !!(window.AudioContext || window.webkitAudioContext), 'Síntesis de ondas sonoras');

    // 5. Configurar eventos
    setupEventListeners();

    // 6. Iniciar temporizadores de HUD y métricas
    updateHudClock();
    setInterval(updateHudClock, 1000);
    setInterval(updateMetricsUI, 1000);
    updateStorageMetric();

    logEvent('Sistema NOVA en línea. Núcleo neuronal en standby.');
  }

  // Iniciar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
