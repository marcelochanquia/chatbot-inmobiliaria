from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from indexer import cargar_indice

load_dotenv()


def cargar_instrucciones():
    """Lee las reglas de comportamiento desde el archivo markdown."""
    with open("gemini.md", "r", encoding="utf-8") as f:
        return f.read()


def crear_cadena_rag(system_instructions: str):
    vector_store = cargar_indice()
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 6, "filter": {"url": {"$contains": "/inmueble-"}}},
    )

    # llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3)
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.3)
    # Cargamos el archivo de contexto
    system_instructions = cargar_instrucciones()

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{system_instructions}\n\nContexto: {{context}}"),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

    print("✓ Cadena RAG lista con contexto externo")
    return llm, retriever, prompt


def consultar(llm, retriever, prompt, pregunta: str, historial: list) -> dict:
    # Recuperar más documentos y filtrar manualmente los de inmuebles
    retriever_amplio = retriever.vectorstore.as_retriever(
        search_type="similarity", search_kwargs={"k": 20}
    )

    todos_docs = retriever_amplio.invoke(pregunta)

    # Filtrar solo URLs de inmuebles
    docs_inmuebles = [
        d for d in todos_docs if "/inmueble-" in d.metadata.get("url", "")
    ]

    # Usar los primeros 6 inmuebles como contexto
    docs = docs_inmuebles[:6] if docs_inmuebles else todos_docs[:6]

    contexto = "\n\n".join([doc.page_content for doc in docs])
    fuentes = [doc.metadata["url"] for doc in docs]

    chain = prompt | llm | StrOutputParser()
    respuesta = chain.invoke(
        {"input": pregunta, "context": contexto, "chat_history": historial}
    )

    return {"respuesta": respuesta, "fuentes": fuentes, "docs": docs}


if __name__ == "__main__":
    llm, retriever, prompt = crear_cadena_rag()
    historial = []

    print("\nChatbot inmobiliario listo. Escribe 'salir' para terminar.\n")
    while True:
        pregunta = input("Tú: ")
        if pregunta.lower() == "salir":
            break
        resultado = consultar(llm, retriever, prompt, pregunta, historial)
        print(f"\nBot: {resultado['respuesta']}")
        print(f"Fuentes: {resultado['fuentes']}\n")

        historial.append(HumanMessage(content=pregunta))
        historial.append(AIMessage(content=resultado["respuesta"]))
