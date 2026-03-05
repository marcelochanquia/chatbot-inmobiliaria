import re

texto_completo = "Venta U$S 300.000 Descripción del Inmueble"
precio = re.search(r"(Alquiler|Venta)\s*[\$U][\$S\s]*([\d\.]+)", texto_completo)
if precio:
    print("Funciona:", precio.group(1), precio.group(2))
else:
    print("No matchea")
