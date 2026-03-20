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
    }
    #chat-btn:hover { transform: scale(1.1); }
    #chat-box {
      display: none; position: fixed; bottom: 90px; right: 24px;
      width: 370px; height: 560px; background: white;
      border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      flex-direction: column; z-index: 9999; overflow: hidden;
    }
    #chat-box.open { display: flex; }
    #chat-header {
      background: #b30000; color: white; padding: 16px;
      font-weight: bold; font-size: 15px; font-family: sans-serif;
      display: flex; align-items: center; gap: 8px;
    }
    #chat-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      font-family: sans-serif; font-size: 14px;
    }
    .msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; line-height: 1.5; }
    .msg.bot { background: #f1f3f4; color: #333; align-self: flex-start; }
    .msg.user { background: #b30000; color: white; align-self: flex-end; }
    .msg.typing { color: #999; font-style: italic; }
    .quick-btns {
      display: flex; flex-wrap: wrap; gap: 8px;
      padding: 4px 0; align-self: flex-start;
    }
    .quick-btn {
      background: white; color: #b30000; border: 1.5px solid #b30000;
      border-radius: 20px; padding: 6px 14px; font-size: 13px;
      cursor: pointer; font-family: sans-serif; transition: all 0.2s;
    }
    .quick-btn:hover { background: #b30000; color: white; }
    #chat-input-area {
      display: flex; padding: 12px; border-top: 1px solid #eee; gap: 8px;
    }
    #chat-input {
      flex: 1; padding: 10px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 14px; outline: none;
      font-family: sans-serif;
    }
    #chat-input:focus { border-color: #b30000; }
    #chat-send {
      background: #b30000; color: white; border: none;
      padding: 10px 16px; border-radius: 8px; cursor: pointer;
      font-size: 14px; transition: background 0.2s;
    }
    #chat-send:hover { background: #800000; }
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button id="chat-btn" title="Chat con nosotros">💬</button>
    <div id="chat-box">
      <div id="chat-header">🏠 Asistente Inmobiliario</div>
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
  const messages = document.getElementById("chat-messages");
  const input = document.getElementById("chat-input");
  const send = document.getElementById("chat-send");

  function renderMarkdown(texto) {
    return texto
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" style="color:#b30000">$1</a>',
      )
      .replace(
        /---/g,
        "<hr style='border:none;border-top:1px solid #ddd;margin:8px 0'>",
      )
      .replace(/\n/g, "<br>");
  }

  function agregarMensajeBot(texto) {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = renderMarkdown(texto);
    messages.appendChild(div);
    // Scroll hasta donde empieza el mensaje, no hasta el final
    div.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mostrarCarrusel(cards) {
    if (!cards || cards.length === 0) return;

    const contenedor = document.createElement("div");
    contenedor.style.cssText =
      "width:100%;align-self:flex-start;margin:4px 0;font-family:sans-serif;";

    const nav = document.createElement("div");
    nav.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:0 0 8px 0;";

    let actual = 0;

    const btnPrev = document.createElement("button");
    btnPrev.innerHTML = "&#8592;";
    btnPrev.style.cssText =
      "background:#b30000;color:white;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:18px;line-height:1;";
    btnPrev.disabled = true;

    const counter = document.createElement("span");
    counter.style.cssText = "font-size:13px;color:#666;";
    counter.textContent = `1 / ${cards.length}`;

    const btnNext = document.createElement("button");
    btnNext.innerHTML = "&#8594;";
    btnNext.style.cssText =
      "background:#b30000;color:white;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:18px;line-height:1;";
    btnNext.disabled = cards.length <= 1;

    nav.appendChild(btnPrev);
    nav.appendChild(counter);
    nav.appendChild(btnNext);

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:100%;overflow:hidden;border-radius:12px;";

    const track = document.createElement("div");
    track.style.cssText = `display:flex;width:${cards.length * 100}%;transition:transform 0.3s ease;`;

    cards.forEach((card) => {
      const div = document.createElement("div");
      div.style.cssText = `width:${100 / cards.length}%;flex-shrink:0;box-sizing:border-box;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);`;
      div.innerHTML = `
        ${card.imagen ? `<img src="${card.imagen}" alt="Propiedad" style="width:100%;height:160px;object-fit:cover;display:block;" onerror="this.style.display='none'">` : ""}
        <div style="padding:10px 12px 12px;">
          <div style="font-weight:bold;font-size:12px;color:#222;margin-bottom:4px;line-height:1.3;">${card.titulo || "Propiedad"}</div>
          <div style="font-size:11px;color:#666;margin-bottom:6px;">
            ${card.dormitorios ? card.dormitorios + " dorm." : ""}
            ${card.direccion ? "· " + card.direccion : ""}
          </div>
          <div style="font-size:13px;font-weight:bold;color:#b30000;margin-bottom:8px;">
            ${card.operacion || ""} $${card.precio || ""}
          </div>
          <a href="${card.url}" target="_blank" style="display:inline-block;background:#b30000;color:white;padding:6px 14px;border-radius:8px;font-size:12px;text-decoration:none;">Ver detalles</a>
        </div>
      `;
      track.appendChild(div);
    });

    wrapper.appendChild(track);

    function irA(index) {
      actual = index;
      const pct = (actual / cards.length) * 100;
      track.style.transform = `translateX(-${pct}%)`;
      counter.textContent = `${actual + 1} / ${cards.length}`;
      btnPrev.disabled = actual === 0;
      btnNext.disabled = actual === cards.length - 1;
      messages.scrollTop = messages.scrollHeight;
    }

    btnPrev.addEventListener("click", () => irA(actual - 1));
    btnNext.addEventListener("click", () => irA(actual + 1));

    contenedor.appendChild(nav);
    contenedor.appendChild(wrapper);
    messages.appendChild(contenedor);
    messages.scrollTop = messages.scrollHeight;
  }

  async function cargarPropiedades(operacion, tipo) {
    try {
      const params = new URLSearchParams();
      if (operacion) params.append("operacion", operacion);
      if (tipo) params.append("tipo", tipo);
      const res = await fetch(`${PROPS_URL}?${params}`);
      const data = await res.json();
      return data.cards || [];
    } catch (e) {
      console.error("Error:", e);
      return [];
    }
  }

  function mostrarBienvenida() {
    agregarMensajeBot(
      "¡Hola! Soy tu asistente en Inmobiliaria Guillermo Cortes. ¿En qué puedo ayudarte?",
    );
  }

  async function enviarMensaje(textoDirecto) {
    const texto = textoDirecto || input.value.trim();
    if (!texto) return;
    input.value = "";

    const userMsg = document.createElement("div");
    userMsg.className = "msg user";
    userMsg.textContent = texto;
    messages.appendChild(userMsg);

    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.id = "typing";
    typing.textContent = "Escribiendo...";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID, mensaje: texto }),
      });
      const data = await res.json();
      document.getElementById("typing").remove();
      agregarMensajeBot(data.respuesta);
    } catch (e) {
      document.getElementById("typing").remove();
      agregarMensajeBot("Error al conectar con el servidor.");
    }
  }

  btn.addEventListener("click", () => {
    box.classList.toggle("open");
    if (box.classList.contains("open") && messages.children.length === 0) {
      mostrarBienvenida();
    }
  });

  send.addEventListener("click", () => enviarMensaje());
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") enviarMensaje();
  });
})();
