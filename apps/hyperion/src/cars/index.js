// The car on stage. Build with VITE_CAR=hyperion for the original; the F1 study is the default.
import hyperion from './hyperion.js';
import f1 from './f1.js';

const cars = { hyperion, f1 };
export default cars[import.meta.env.VITE_CAR] || f1;
