from contextlib import asynccontextmanager

import uvicorn
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel

from indexer import crear_indice
from rag import consultar, crear_cadena_rag
from scraper import scrape_website

URL_WEB = "https://guillermocortes.com.ar"

estado = {"llm": None, "retriever": None, "prompt": None, "historial": {}}


def reindexar():
    print("Iniciando re-indexado automático...")
    pages = scrape_website(URL_WEB, max_pages=200)
    crear_indice(pages)
    estado["llm"], estado["retriever"], estado["prompt"] = crear_cadena_rag()
    print("✓ Re-indexado completado")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Cargando chatbot...")
    estado["llm"], estado["retriever"], estado["prompt"] = crear_cadena_rag()
    scheduler = BackgroundScheduler()
    scheduler.add_job(reindexar, "interval", hours=24)
    scheduler.start()
    print("✓ Scheduler iniciado, re-indexado cada 24hs")
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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
