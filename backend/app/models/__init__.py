"""
Importa todos los modelos en un solo lugar.

Alembic (migraciones) y la creación de tablas necesitan que cada modelo se haya
importado para "conocerlo". Cada vez que se cree un modelo nuevo, se agrega aquí.
"""
from app.models.asistencia import Asistencia, MetodoCheckin
from app.models.membresia import Membresia
from app.models.notificacion import Notificacion, TipoAviso
from app.models.pago import EstadoPago, MetodoPago, Pago
from app.models.plan import Plan
from app.models.usuario import Rol, Usuario

__all__ = ["Asistencia", "EstadoPago", "Membresia", "MetodoCheckin", "MetodoPago", "Notificacion", "Pago", "Plan", "Rol", "TipoAviso", "Usuario"]
