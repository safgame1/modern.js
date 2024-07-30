declare module '@modern-js/runtime/react-dom' {
  export * from 'react-dom/client';
  export const render: (App: React.ReactElement, dom: HTMLElement) => void;
  export const hydrate: (
    App: React.ReactElement,
    dom: HTMLElement,
    callback?: () => void,
  ) => string;
}
