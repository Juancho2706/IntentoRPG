// Hooks de carga de módulos (node:module.register): redirigen los datos de
// talentos por clase (js/talents-<clase>.js) al fixture de los mockups, para
// poder importar el js/talents.js REAL en tests aunque esos archivos aún no
// existan (o para probar contra datos fijos). Lo activa use-talents-fixture.mjs.
const FIXTURE = new URL('../fixtures/talents-sample.mjs', import.meta.url).href;
const DATA = /(^|\/)talents-(guerrero|maga|arquera)\.js$/;
export async function resolve(specifier, context, next) {
  if (DATA.test(specifier) && context.parentURL && /\/js\/[^/]+\.js$/.test(context.parentURL)) {
    return { url: FIXTURE, shortCircuit: true };
  }
  return next(specifier, context);
}
