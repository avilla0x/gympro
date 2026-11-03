// Nombres de los roles tal como se muestran a las personas.
// (En la base de datos se guardan como "admin", "entrenador" y "cliente".)
export const ETIQUETAS_ROL = {
  admin: "Administrador",
  entrenador: "Entrenador",
  cliente: "Cliente",
};

// Qué puede hacer cada rol, en una frase (se muestra en la pantalla de inicio).
export const DESCRIPCION_ROL = {
  admin: "Gestiona usuarios, planes, pagos y asistencia, y consulta los reportes del gimnasio.",
  entrenador: "Consulta a sus clientes, les asigna rutinas y registra sus medidas físicas.",
  cliente: "Consulta su membresía, su asistencia, su rutina y su progreso.",
};
