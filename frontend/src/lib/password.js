// Regla de contraseñas de GymPro (RN10 en docs/reglas-negocio.md).
// Es la MISMA regla que valida el backend; aquí se usa para avisar a la persona
// mientras escribe, sin esperar a que el servidor rechace la contraseña.

export function evaluarPassword(password) {
  const requisitos = {
    largo: password.length >= 8, // mínimo 8 caracteres
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(password), // al menos una mayúscula
    numero: /\d/.test(password), // al menos un número
  };
  return { ...requisitos, valida: Object.values(requisitos).every(Boolean) };
}
