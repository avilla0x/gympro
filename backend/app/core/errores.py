"""
Error de negocio: se lanza desde los "services" cuando una regla no se cumple
(por ejemplo "ese correo ya está registrado").

`app/main.py` lo convierte automáticamente en una respuesta HTTP con el código
y el mensaje, así los services no necesitan conocer nada de HTTP.
"""


class ErrorDeNegocio(Exception):
    def __init__(self, mensaje: str, codigo_http: int = 400):
        super().__init__(mensaje)
        self.mensaje = mensaje
        # 400 = petición inválida · 404 = no existe · 409 = conflicto (dato repetido)
        self.codigo_http = codigo_http
