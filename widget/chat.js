(function () {
  const API_URL = "https://chatbot-inmobiliaria-1.onrender.com/chat";
  const PROPS_URL = "http://localhost:8000/propiedades";
  const SESSION_ID = "session_" + Math.random().toString(36).substr(2, 9);

  const style = document.createElement("style");
  style.textContent = `
    #chat-btn {
      position: fixed; bottom: 24px; right: 24px;
      width: 56px; height: 56px; border-radius: 50%;
      background: #b30000; color: white; border: none;
      font-size: 26px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999; transition: transform 0.2s;
      display: none; /* Oculto por defecto ya que inicia abierto */
    }
    #chat-btn:hover { transform: scale(1.1); }
    
    #chat-box {
      display: none; /* Se controla con la clase .open */
      position: fixed; 
      bottom: 90px; right: 24px;
      width: 370px; height: 560px; 
      background: white;
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      flex-direction: column; z-index: 9999; overflow: hidden;
      transition: all 0.3s ease;
    }
    
    #chat-box.open { display: flex; }

    /* --- CAMBIO PARA MÓVILES (RESPONSIVE) --- */
    @media (max-width: 600px) {
      #chat-box.open {
        bottom: 0;
        right: 0;
        width: 100% !important;
        height: 100% !important;
        border-radius: 0;
      }
      #chat-btn { bottom: 10px; right: 10px; } /* Por si deciden cerrarlo */
    }

    #chat-header {
      background: #b30000; color: white; padding: 16px;
      font-weight: bold; font-size: 15px; font-family: sans-serif;
      display: flex; align-items: center; justify-content: space-between;
    }
    
    /* Botón para cerrar en móvil */
    #chat-close {
        background: transparent; border: none; color: white; 
        font-size: 20px; cursor: pointer; display: none;
    }
    @media (max-width: 600px) { #chat-close { display: block; } }

    #chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      font-family: sans-serif; font-size: 14px;
    }
    .msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; line-height: 1.5; }
    .msg.bot { background: #f1f3f4; color: #333; align-self: flex-start; }
    .msg.user { background: #b30000; color: white; align-self: flex-end; }
    .msg.typing { color: #999; font-style: italic; }
    
    #chat-input-area {
      display: flex; padding: 12px; border-top: 1px solid #eee; gap: 8px;
      background: white;
    }
    #chat-input {
      flex: 1; padding: 10px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 16px; /* 16px evita el zoom automático en iOS */
      outline: none; font-family: sans-serif;
    }
    #chat-send {
      background: #b30000; color: white; border: none;
      padding: 10px 16px; border-radius: 8px; cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button id="chat-btn" title="Chat con nosotros">💬</button>
    <div id="chat-box" class="open"> <div id="chat-header">
        <span>🏠 Asistente Inmobiliario</span>
        <button id="chat-close">✕</button>
      </div>
      <div id="chat-messages"></div>
      <div id="chat-input-area">
        <input id="chat-input" type="text" placeholder="Escribe tu consulta..." />
        <button id="chat-send">Enviar</button>
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

  // --- LÓGICA DE APERTURA AUTOMÁTICA ---
  if (box.classList.contains("open")) {
    // Pequeño delay para que el usuario vea la animación o el asistente cargue
    setTimeout(() => {
        if (messages.children.length === 0) mostrarBienvenida();
    }, 500);
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
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = renderMarkdown(texto);
    messages.appendChild(div);
    div.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function enviarMensaje() {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = "";

    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.textContent = texto;
    messages.appendChild(userMsg);
    messages.scrollTop = messages.scrollHeight;

    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.id = "typing";
    typing.textContent = "Escribiendo...";
    messages.appendChild(typing);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, mensaje: texto }),
      });
      const data = await res.json();
      const t = document.getElementById("typing");
      if(t) t.remove();
      agregarMensajeBot(data.respuesta);
    } catch (e) {
      const t = document.getElementById("typing");
      if(t) t.remove();
      agregarMensajeBot("Error al conectar con el servidor.");
    }
  }

  // Eventos de control
  btn.addEventListener("click", () => {
    box.classList.add("open");
    btn.style.display = "none";
  });

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
    agregarMensajeBot("¡Hola! Soy tu asistente en Inmobiliaria Guillermo Cortes. ¿En qué puedo ayudarte?");
  }
})();
