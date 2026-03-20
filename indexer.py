import os
import time
from typing import Optional

from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()


def crear_indice(pages: list[dict]) -> FAISS:
    print("Dividiendo texto en chunks...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    documentos = []
    for page in pages:
        chunks = splitter.create_documents(
            texts=[page["content"]],
            metadatas=[
                {
                    "url": page["url"],
                    "imagen": page.get("imagen", ""),
                    "titulo": page.get("titulo", ""),
                    "precio": page.get("precio", ""),
                    "direccion": page.get("direccion", ""),
                    "dormitorios": page.get("dormitorios", ""),
                    "operacion": page.get("operacion", ""),
                    "tipo": page.get("tipo", ""),
                }
            ],
        )
        documentos.extend(chunks)

    print(f"Total chunks generados: {len(documentos)}")

    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    # Procesar en lotes de 80 con pausa para no superar el límite
    print("Generando embeddings por lotes...")
    LOTE = 80
    vector_store = None

    for i in range(0, len(documentos), LOTE):
        lote = documentos[i : i + LOTE]
        print(f"Procesando chunks {i + 1} a {min(i + LOTE, len(documentos))}...")

        if vector_store is None:
            vector_store = FAISS.from_documents(lote, embeddings)
        else:
            vs_lote = FAISS.from_documents(lote, embeddings)
            vector_store.merge_from(vs_lote)

        if i + LOTE < len(documentos):
            print("Esperando 65 segundos para no superar el límite de la API...")
            time.sleep(65)

    vector_store.save_local("vector_store")
    print("✓ Índice guardado en ./vector_store")
    return vector_store


def cargar_indice() -> Optional[FAISS]:
    # Usamos el 'os' que ya está importado arriba
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    # Verificamos si la carpeta existe
    if not os.path.exists("vector_store"):
        print("⚠️ El índice no existe localmente. Se requiere re-indexar.")
        return None

    # Cargamos el índice [cite: 44]
    vector_store = FAISS.load_local(
        "vector_store", embeddings, allow_dangerous_deserialization=True
    )
    print("✓ Índice cargado desde ./vector_store")
    return vector_store


if __name__ == "__main__":
    from scraper import scrape_website

    pages = scrape_website("https://guillermocortes.com.ar", max_pages=200)
    crear_indice(pages)
