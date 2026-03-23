import os
import re
import smtplib
from contextlib import asynccontextmanager
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel

# Importamos cargar_indice para verificar el estado inicial
from indexer import cargar_indice, crear_indice
from rag import consultar, crear_cadena_rag
from scraper import scrape_website


def extraer_contacto(mensaje: str) -> dict:
    """Detecta email y teléfono en el mensaje del usuario."""
    contacto = {}
    email = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", mensaje)
    telefono = re.search(r"[\+\d][\d\s\-]{7,15}", mensaje)
    if email:
        contacto["email"] = email.group()
    if telefono:
        contacto["telefono"] = telefono.group().strip()
    return contacto


def enviar_email_contacto(contacto: dict, historial_texto: str):
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD")

    msg = MIMEMultipart("alternative")
    msg["From"] = gmail_user
    msg["To"] = gmail_user
    msg["Subject"] = "Nuevo contacto desde el chatbot inmobiliario"

    cuerpo_html = f"""
    <html><body style="font-family:Arial,sans-serif;color:#333;">
    <h2 style="color:#b30000;border-bottom:2px solid #b30000;padding-bottom:8px;">
      Nuevo contacto desde el chatbot
    </h2>
    <table style="border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 12px;font-weight:bold;">Email:</td>
        <td style="padding:6px 12px;">{contacto.get("email", "No proporcionado")}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;font-weight:bold;">Teléfono:</td>
        <td style="padding:6px 12px;">{contacto.get("telefono", "No proporcionado")}</td>
      </tr>
    </table>
    <h3 style="color:#b30000;">Conversación:</h3>
    <div style="background:#f5f5f5;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px;line-height:1.6;">
{historial_texto}
    </div>
    </body></html>
    """

    msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(gmail_user, gmail_pass)
            server.send_message(msg)
            print("✓ Email de contacto enviado")
    except Exception as e:
        print(f"✗ Error enviando email: {e}")


URL_WEB = "https://guillermocortes.com.ar"


estado = {"llm": None, "retriever": None, "prompt": None, "historial": {}}


def cargar_instrucciones():
    import os

    if os.path.exists("gemini.md"):
        with open("gemini.md", "r", encoding="utf-8") as f:
            return f.read()
    return "Eres un asistente inmobiliario experto."


def reindexar():
    print("Iniciando re-indexado automático...")
    pages = scrape_website(URL_WEB, max_pages=200)
    crear_indice(pages)
    instrucciones = cargar_instrucciones()
    # Actualizamos el estado con el nuevo índice
    estado["llm"], estado["retriever"], estado["prompt"] = crear_cadena_rag(
        instrucciones
    )
    print("✓ Re-indexado completado")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Cargando chatbot...")

    # 1. Intentamos cargar el índice existente
    indice = cargar_indice()

    # 2. Si no existe (es None), disparamos el re-indexado inicial
    if indice is None:
        print("🚀 Primer arranque detectado: Generando índice FAISS por primera vez...")
        reindexar()
    else:
        # Si existe, cargamos la cadena RAG normalmente
        instrucciones = cargar_instrucciones()
        estado["llm"], estado["retriever"], estado["prompt"] = crear_cadena_rag(
            instrucciones
        )
        print("✓ Estado cargado desde índice existente")

    # 3. Iniciamos el scheduler para las actualizaciones cada 24hs [cite: 51]
    scheduler = BackgroundScheduler()
    scheduler.add_job(reindexar, "interval", hours=24)
    scheduler.start()
    print("✓ Scheduler activo (re-indexado cada 24hs)")

    yield
    scheduler.shutdown()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


class Pregunta(BaseModel):
    session_id: str
    mensaje: str


@app.post("/chat")
async def chat(pregunta: Pregunta):
    if pregunta.session_id not in estado["historial"]:
        estado["historial"][pregunta.session_id] = []

    historial = estado["historial"][pregunta.session_id]

    resultado = consultar(
        estado["llm"],
        estado["retriever"],
        estado["prompt"],
        pregunta.mensaje,
        historial,
    )

    historial.append(HumanMessage(content=pregunta.mensaje))
    historial.append(AIMessage(content=resultado["respuesta"]))

    # Detectar datos de contacto en el mensaje del usuario
    contacto = extraer_contacto(pregunta.mensaje)
    print(f"Mensaje recibido: {pregunta.mensaje}")
    print(f"Contacto detectado: {contacto}")
    if contacto:
        historial_texto = "\n".join(
            [
                f"{'Usuario' if isinstance(m, HumanMessage) else 'Bot'}: {m.content}"
                for m in historial[-10:]
            ]
        )
        print(f"Historial texto:\n{historial_texto}")
        enviar_email_contacto(contacto, historial_texto)
    # Solo mostrar cards si la pregunta es sobre propiedades
    palabras_propiedad = [
        "propiedad",
        "inmueble",
        "casa",
        "departamento",
        "terreno",
        "alquiler",
        "venta",
        "duplex",
        "cabaña",
        "dormitorio",
        "precio",
        "habitacion",
        "ambientes",
        "pileta",
        "cochera",
        "jardin",
        "patio",
        "barrio",
        "lepri",
        "calle",
    ]
    es_consulta_propiedad = any(
        p in pregunta.mensaje.lower() for p in palabras_propiedad
    )

    cards = []
    if es_consulta_propiedad:
        vistas = set()
        for doc in resultado.get("docs", []):
            url = doc.metadata.get("url", "")
            if url in vistas or "/inmueble-" not in url:
                continue
            vistas.add(url)
            cards.append(
                {
                    "url": url,
                    "imagen": doc.metadata.get("imagen", ""),
                    "titulo": doc.metadata.get("titulo", ""),
                    "precio": doc.metadata.get("precio", ""),
                    "direccion": doc.metadata.get("direccion", ""),
                    "dormitorios": doc.metadata.get("dormitorios", ""),
                    "operacion": doc.metadata.get("operacion", ""),
                }
            )

    return {
        "respuesta": resultado["respuesta"],
        "fuentes": resultado["fuentes"],
        "cards": cards,
    }


@app.get("/propiedades")
async def propiedades(tipo: str = "", operacion: str = ""):
    from indexer import cargar_indice

    vs = cargar_indice()

    todos_ids = list(vs.docstore._dict.keys())

    vistas = set()
    cards = []
    for doc_id in todos_ids:
        doc = vs.docstore._dict[doc_id]
        url = doc.metadata.get("url", "")
        if url in vistas or "/inmueble-" not in url:
            continue
        op = doc.metadata.get("operacion", "").lower()
        tipo_doc = doc.metadata.get("tipo", "").lower()

        if operacion and operacion.lower() not in op:
            continue
        if tipo and tipo.lower() != tipo_doc:
            continue

        vistas.add(url)
        cards.append(
            {
                "url": url,
                "imagen": doc.metadata.get("imagen", ""),
                "titulo": doc.metadata.get("titulo", ""),
                "precio": doc.metadata.get("precio", ""),
                "direccion": doc.metadata.get("direccion", ""),
                "dormitorios": doc.metadata.get("dormitorios", ""),
                "operacion": doc.metadata.get("operacion", ""),
                "tipo": doc.metadata.get("tipo", ""),
            }
        )

    return {"cards": cards, "total": len(cards)}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
