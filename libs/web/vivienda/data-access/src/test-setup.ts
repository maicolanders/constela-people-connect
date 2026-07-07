import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

// Algunas versiones del entorno de pruebas de Jest no exponen `structuredClone`
// en el ámbito global aunque el proceso de Node sí lo soporte; fake-indexeddb
// lo usa internamente para clonar los valores insertados.
if (typeof structuredClone === 'undefined') {
  (globalThis as { structuredClone?: <T>(valor: T) => T }).structuredClone = <T>(valor: T): T =>
    JSON.parse(JSON.stringify(valor));
}
