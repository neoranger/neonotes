// Generador de UUID compatible con entornos HTTP no seguros (IPs productivas) y HTTPS
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Ignorar error si la API crypto falla
    }
  }

  // Algoritmo RFC4122 v4 de respaldo para contextos HTTP no seguros
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
