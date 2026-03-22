(function () {
  const API_URL = "https://chatbot-inmobiliaria-1.onrender.com/chat";
  const SESSION_ID = "session_" + Math.random().toString(36).substr(2, 9);

  const style = document.createElement("style");
  style.textContent = `
    #chat-btn {
      position: fixed; bottom: 24px; right: 24px;
      width: 56px; height: 56px; border-radius: 50%;
      background: #b30000; color: white; border: none;
      font-size: 26px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; transition: transform 0.2s;
      display: none;
    }
    #chat-btn:hover { transform: scale(1.1); }

    #chat-box {
      display: none;
      position: fixed;
      bottom: 90px; right: 24px;
      width: 370px; height: 560px;
      background: #f7f7f8;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      flex-direction: column; z-index: 9999; overflow: hidden;
      transition: all 0.3s ease;
    }
    #chat-box.open { display: flex; }

    @media (max-width: 600px) {
      #chat-box.open {
        bottom: 0; right: 0;
        width: 100% !important;
        height: 100% !important;
        border-radius: 0;
      }
      #chat-btn { bottom: 10px; right: 10px; }
    }

    #chat-header {
      background: linear-gradient(135deg, #9a0000, #b30000);
      padding: 14px 16px;
      display: flex; align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    #chat-header-left {
      display: flex; align-items: center; gap: 10px;
    }
    #chat-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #chat-header-info { display: flex; flex-direction: column; }
    #chat-header-name {
      color: white; font-weight: 600; font-size: 14px;
      font-family: sans-serif; line-height: 1.2;
    }
    #chat-header-status {
      color: rgba(255,255,255,0.75); font-size: 11px;
      font-family: sans-serif;
      display: flex; align-items: center; gap: 4px;
    }
    #chat-status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #4ade80; display: inline-block;
    }
    #chat-close {
      background: transparent; border: none; color: white;
      font-size: 20px; cursor: pointer; display: none;
    }
    @media (max-width: 600px) { #chat-close { display: block; } }

    #chat-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      font-family: sans-serif; font-size: 14px;
      background: #f7f7f8;
    }

    .msg-timestamp-center {
      text-align: center; font-size: 11px;
      color: #bbb; font-family: sans-serif;
      margin: 4px 0;
    }

    .msg-bot-wrapper {
      display: flex; align-items: flex-end; gap: 7px; max-width: 88%;
    }
    .msg-bot-avatar {
      width: 26px; height: 26px; border-radius: 50%;
      background: #b30000; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; margin-bottom: 14px;
    }
    .msg-bot-content { display: flex; flex-direction: column; gap: 3px; }
    .msg.bot {
      background: white; padding: 10px 13px;
      border-radius: 4px 14px 14px 14px;
      font-size: 13px; color: #333; line-height: 1.5;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      max-width: 100%;
    }
    .msg-time {
      font-size: 10px; color: #bbb;
      font-family: sans-serif;
    }

    .msg-user-wrapper {
      display: flex; flex-direction: column;
      align-items: flex-end; gap: 2px;
      align-self: flex-end; max-width: 75%;
    }
    .msg.user {
      background: #b30000; padding: 10px 13px;
      border-radius: 14px 4px 14px 14px;
      font-size: 13px; color: white; line-height: 1.5;
    }
    .msg-time-user {
      font-size: 10px; color: #bbb; font-family: sans-serif;
    }

    .msg.typing { color: #999; font-style: italic; font-size: 13px; }

    #chat-input-area {
      display: flex; padding: 10px 12px;
      border-top: 0.5px solid #e5e5e5;
      gap: 8px; align-items: center;
      background: white;
    }
    #chat-input {
      flex: 1; padding: 9px 13px;
      border: 1px solid #e5e5e5;
      border-radius: 20px; font-size: 14px;
      outline: none; font-family: sans-serif;
      background: #f9f9f9;
    }
    #chat-input:focus { border-color: #b30000; background: white; }

    #chat-mic {
      width: 36px; height: 36px; border-radius: 50%;
      background: #1a9e6a; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: background 0.25s; position: relative;
    }
    #chat-mic:active { transform: scale(0.95); }

    #chat-send {
      width: 36px; height: 36px; border-radius: 50%;
      background: #b30000; color: white; border: none;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0;
      transition: background 0.2s;
    }
    #chat-send:hover { background: #900000; }

    @keyframes micRipple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button id="chat-btn" title="Chat con nosotros">💬</button>
    <div id="chat-box" class="open">
      <div id="chat-header">
        <div id="chat-header-left">
          <div id="chat-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="white" stroke-width="1.8" fill="rgba(255,255,255,0.15)"/>
              <rect x="9" y="12" width="6" height="9" rx="1" fill="white"/>
            </svg>
          </div>
          <div id="chat-header-info">
            <span id="chat-header-name">Asistente Inmobiliario</span>
            <span id="chat-header-status">
              <span id="chat-status-dot"></span>
              En línea
            </span>
          </div>
        </div>
        <button id="chat-close">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-area">
        <button id="chat-mic" title="Dictar por voz">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="white"/>
            <path d="M5 10a7 7 0 0 0 14 0" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <line x1="12" y1="19" x2="12" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <line x1="9" y1="22" x2="15" y2="22" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <input id="chat-input" type="text" placeholder="Escribe un mensaje..." />
        <button id="chat-send" title="Enviar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  );

  const btn = document.getElementById("chat-btn");
  const box = document.getElementById("chat-box");
  const closeBtn = document.getElementById("chat-close");
  const messages = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");
  const micBtn = document.getElementById("chat-mic");

  if (box.classList.contains("open")) {
    setTimeout(() => {
      if (messages.children.length === 0) mostrarBienvenida();
    }, 500);
  }

  function horaActual() {
    return new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMarkdown(texto) {
    return texto
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" style="color:#b30000">$1</a>',
      )
      .replace(/\n/g, "<br>");
  }

  function agregarMensajeBot(texto) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-bot-wrapper";

    const avatar = document.createElement("div");
    avatar.className = "msg-bot-avatar";
    avatar.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.2)"/></svg>`;

    const content = document.createElement("div");
    content.className = "msg-bot-content";

    const bubble = document.createElement("div");
    bubble.className = "msg bot";
    bubble.innerHTML = renderMarkdown(texto);

    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = horaActual();

    content.appendChild(bubble);
    content.appendChild(time);
    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
    messages.appendChild(wrapper);
    bubble.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function agregarMensajeUsuario(texto) {
    const wrapper = document.createElement("div");
    wrapper.className = "msg-user-wrapper";

    const bubble = document.createElement("div");
    bubble.className = "msg user";
    bubble.textContent = texto;

    const time = document.createElement("span");
    time.className = "msg-time-user";
    time.textContent = horaActual() + " ✓✓";

    wrapper.appendChild(bubble);
    wrapper.appendChild(time);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  async function enviarMensaje() {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = "";

    agregarMensajeUsuario(texto);

    const typing = document.createElement("div");
    typing.className = "msg-bot-wrapper";
    typing.id = "typing";
    typing.innerHTML = `
      <div class="msg-bot-avatar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.2)"/></svg>
      </div>
      <div class="msg bot typing">Escribiendo...</div>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, mensaje: texto }),
      });
      const data = await res.json();
      const t = document.getElementById("typing");
      if (t) t.remove();
      agregarMensajeBot(data.respuesta);
    } catch (e) {
      const t = document.getElementById("typing");
      if (t) t.remove();
      agregarMensajeBot("Error al conectar con el servidor.");
    }
  }

  const recognition = new (
    window.SpeechRecognition || window.webkitSpeechRecognition
  )();
  recognition.lang = "es-ES";
  recognition.interimResults = false;

  let rippleEl = null;

  micBtn.addEventListener("click", () => {
    try {
      recognition.start();
      micBtn.style.background = "#c0392b";
      micBtn.style.boxShadow = "0 0 0 4px rgba(192,57,43,0.2)";
      rippleEl = document.createElement("span");
      rippleEl.style.cssText =
        "position:absolute;top:0;left:0;width:36px;height:36px;border-radius:50%;background:rgba(192,57,43,0.35);animation:micRipple 1.2s infinite;pointer-events:none;";
      micBtn.appendChild(rippleEl);
    } catch (e) {
      console.error("Error al iniciar reconocimiento:", e);
    }
  });

  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
  };

  recognition.onend = () => {
    micBtn.style.background = "#1a9e6a";
    micBtn.style.boxShadow = "none";
    if (rippleEl) {
      rippleEl.remove();
      rippleEl = null;
    }
  };

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    box.classList.remove("open");
    btn.style.display = "block";
  });

  send.addEventListener("click", () => enviarMensaje());
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarMensaje();
  });

  function mostrarBienvenida() {
    const timestamp = document.createElement("div");
    timestamp.className = "msg-timestamp-center";
    timestamp.textContent = "Hoy";
    messages.appendChild(timestamp);
    agregarMensajeBot(
      "¡Hola! Soy tu asistente en Inmobiliaria Guillermo Cortes. ¿En qué puedo ayudarte?",
    );
  }
})();
