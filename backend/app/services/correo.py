"""
Envío de correos.

POR AHORA no se envía ningún correo real: el mensaje se muestra en la CONSOLA
del servidor (la terminal donde corre `uvicorn`). Es suficiente para desarrollar
y exponer el proyecto, porque quien prueba copia el enlace desde la consola.

Cuando se necesite enviar correos de verdad (alertas de vencimiento, Sprint 2),
solo hay que cambiar el contenido de `enviar_correo`; ningún otro archivo cambia.
"""
import logging

# Se usa el registro de uvicorn para que el mensaje aparezca en su terminal.
_registro = logging.getLogger("uvicorn.error")


def enviar_correo(destino: str, asunto: str, cuerpo: str) -> None:
    """Muestra el correo en la consola en lugar de enviarlo."""
    _registro.info(
        "\n=========== CORREO (simulado en consola) ===========\n"
        "Para:   %s\nAsunto: %s\n\n%s\n"
        "====================================================",
        destino,
        asunto,
        cuerpo,
    )


def enviar_aviso(destino: str, titulo: str, mensaje: str) -> None:
    """Correo de un aviso del sistema (por ejemplo, vencimiento de membresía)."""
    enviar_correo(destino, f"GymPro · {titulo}", mensaje)
