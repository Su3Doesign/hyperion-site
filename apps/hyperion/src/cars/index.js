// Which car this page shows. Each HTML entry names its car (<html data-car="…">) and the page that
// holds the other car (data-other), so the two pages link to each other however a build names them.
import hyperion from './hyperion.js';
import f1 from './f1.js';

export const cars = { hyperion, f1 };
const root = typeof document !== 'undefined' ? document.documentElement : null;
const id = root?.dataset.car || import.meta.env.VITE_CAR || 'hyperion';
const car = cars[id] || hyperion;
export const other = car === f1 ? hyperion : f1;
export const otherHref = root?.dataset.other || (car === f1 ? './' : 'f1.html');
export default car;
