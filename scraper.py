import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://guillermocortes.com.ar"

URLS_ESPECIALES = [
    "https://guillermocortes.com.ar",
    "https://guillermocortes.com.ar/inmueble-1794",  # propiedad no enlazada
    "https://guillermocortes.com.ar/inmueble-1804",  # propiedad no enlazada
    "https://guillermocortes.com.ar/inmueble-1799",  # propiedad no enlazada
]


def es_url_valida(url: str) -> bool:
    return "/inmueble-" in url or url in URLS_ESPECIALES


def extraer_datos_propiedad(soup, url: str) -> dict:
    datos = {
        "url": url,
        "imagen": "",
        "titulo": "",
        "precio": "",
        "direccion": "",
        "dormitorios": "",
        "operacion": "",
        "tipo": "",
        "content": "",
    }

    # Imagen principal (segunda imagen, la primera es el logo)
    imgs = soup.find_all("img")
    for img in imgs:
        src = img.get("src", "")
        if "/images/inmuebles/" in src:
            datos["imagen"] = urljoin(BASE_URL, src)
            break

    # Texto completo limpio
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    texto = soup.get_text(separator=" ", strip=True)
    datos["content"] = texto

    # Extraer campos específicos del texto
    lineas = texto.split()
    texto_completo = " ".join(lineas)

    # Título (buscar patrón "Inmueble en X, en DIRECCIÓN")
    import re

    titulo = re.search(r"Inmueble en (.+?)(?:Alquiler|Venta|$)", texto_completo)
    if titulo:
        datos["titulo"] = titulo.group(1).strip()[:100]

    # Precio
    precio = re.search(r"(Alquiler|Venta)\s*[\$U][\$S\s]*([\d\.]+)", texto_completo)
    if precio:
        datos["operacion"] = precio.group(1)
        datos["precio"] = precio.group(2)

    # Dirección
    direccion = re.search(r"Dirección:\s*(.+?)(?:Complejo|Localidad|$)", texto_completo)
    if direccion:
        datos["direccion"] = direccion.group(1).strip()[:100]

    # Dormitorios
    dormitorios = re.search(r"Dormitorios:\s*(\d+)", texto_completo)
    if dormitorios:
        datos["dormitorios"] = dormitorios.group(1)

    # Tipo de propiedad desde campo Complejo
    complejo = re.search(r"Complejo:\s*(.+?)\s+Localidad:", texto_completo)
    if complejo:
        datos["tipo"] = complejo.group(1).strip()

    return datos


def obtener_todas_urls_inmuebles(base_url: str, headers: dict) -> list:
    """Recolecta todas las URLs de inmuebles desde las páginas de listado."""
    urls = set()
    secciones = ["ventas", "alquileres"]

    for seccion in secciones:
        for i in range(1, 20):
            if i == 1:
                url = f"{base_url}/{seccion}"
            else:
                url = f"{base_url}/{seccion}/pagina{i}"

            try:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code == 404:
                    break
                soup = BeautifulSoup(r.text, "html.parser")
                links = [
                    a["href"]
                    for a in soup.find_all("a", href=True)
                    if "/inmueble-" in a["href"]
                ]
                if not links:
                    break
                for link in links:
                    urls.add(urljoin(base_url, link))
                print(f"✓ {seccion} pagina {i}: {len(links)} inmuebles")
            except Exception as e:
                print(f"✗ Error en {seccion} pagina {i}: {e}")
                break

    return list(urls)


def scrape_website(base_url: str, max_pages: int = 200) -> list[dict]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # Primero recolectar todas las URLs de inmuebles
    print("Recolectando URLs de inmuebles...")
    urls_inmuebles = obtener_todas_urls_inmuebles(base_url, headers)
    print(f"Total URLs encontradas: {len(urls_inmuebles)}")

    # Agregar URLs especiales
    urls_a_visitar = list(URLS_ESPECIALES) + urls_inmuebles

    pages = []
    visited = set()

    for url in urls_a_visitar:
        if url in visited:
            continue
        try:
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 404:
                visited.add(url)
                continue

            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")

            if "/inmueble-" in url:
                datos = extraer_datos_propiedad(soup, url)
            else:
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                datos = {
                    "url": url,
                    "imagen": "",
                    "titulo": "",
                    "precio": "",
                    "direccion": "",
                    "dormitorios": "",
                    "operacion": "",
                    "tipo": "",
                    "content": soup.get_text(separator=" ", strip=True),
                }

            pages.append(datos)
            print(f"✓ Scrapeado: {url}")
            visited.add(url)
            time.sleep(0.5)

        except Exception as e:
            print(f"✗ Error en {url}: {e}")
            visited.add(url)

    print(f"\nTotal páginas scrapeadas: {len(pages)}")
    return pages


if __name__ == "__main__":
    resultado = scrape_website(BASE_URL, max_pages=200)
    # Mostrar preview de las primeras 3 propiedades
    for p in resultado[:3]:
        print(f"\n--- {p['url']} ---")
        print(f"Imagen: {p['imagen']}")
        print(f"Título: {p['titulo']}")
        print(f"Tipo: {p['tipo']}")
        print(f"Precio: {p['operacion']} ${p['precio']}")
        print(f"Dirección: {p['direccion']}")
        print(f"Dormitorios: {p['dormitorios']}")
