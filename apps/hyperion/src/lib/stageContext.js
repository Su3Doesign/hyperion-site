import { createContext, useContext } from 'react';
export const StageContext = createContext({ stage: null, model: null, webgl: true, reduced: false, mobile: false });
export const useStage = () => useContext(StageContext);
