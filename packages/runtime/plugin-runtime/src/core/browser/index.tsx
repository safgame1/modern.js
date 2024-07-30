/* eslint-disable no-inner-declarations */
import React, { useEffect, useState } from 'react';
import ReactDOM from '@modern-js/runtime/react-dom';
import cookieTool from 'cookie';
import { getGlobalAppInit } from '../context';
import { RuntimeContext, getInitialContext } from '../context/runtime';
import { createLoaderManager } from '../loader/loaderManager';
import { getGlobalRunner } from '../plugin/runner';
import { SSRContainer } from '../types';
import { hydrateRoot } from './hydrate';

const IS_REACT18 = process.env.IS_REACT18 === 'true';

type ExtraSSRContainer = {
  context?: {
    request: {
      cookieMap?: Record<string, string>;
      cookie?: string;
      userAgent?: string;
      referer?: string;
    };
  };
};

// eslint-disable-next-line consistent-return
function getSSRData(): (SSRContainer & ExtraSSRContainer) | undefined {
  const ssrData = window._SSR_DATA;

  if (ssrData) {
    const finalSSRData = {
      ...ssrData,
      context: {
        ...ssrData.context!,
        request: {
          ...ssrData.context!.request,
          cookieMap: cookieTool.parse(document.cookie || '') || {},
          cookie: document.cookie || '',
          userAgent: navigator.userAgent,
          referer: document.referrer,
        },
      },
    };

    return finalSSRData;
  }
}

function isClientArgs(id: unknown): id is HTMLElement | string {
  return (
    typeof id === 'undefined' ||
    typeof id === 'string' ||
    (typeof HTMLElement !== 'undefined' && id instanceof HTMLElement)
  );
}

export type RenderFunc = typeof render;

export function render(App: React.ReactElement, id?: HTMLElement | string) {
  const runner = getGlobalRunner();
  const context: RuntimeContext = getInitialContext(runner);
  const runBeforeRender = async (context: RuntimeContext) => {
    await runner.beforeRender(context);
    const init = getGlobalAppInit();
    return init?.(context);
  };

  if (isClientArgs(id)) {
    const ssrData = getSSRData();
    const loadersData = ssrData?.data?.loadersData || {};

    const initialLoadersState = Object.keys(loadersData).reduce(
      (res: any, key) => {
        const loaderData = loadersData[key];

        if (loaderData?.loading !== false) {
          return res;
        }

        res[key] = loaderData;
        return res;
      },
      {},
    );

    Object.assign(context, {
      loaderManager: createLoaderManager(initialLoadersState, {
        skipStatic: true,
      }),
      // garfish plugin params
      _internalRouterBaseName: App.props.basename,
      ...(ssrData ? { ssrContext: ssrData?.context } : {}),
    });

    context.initialData = ssrData?.data?.initialData;

    const WrapperApp = () => {
      const [initFinish, setInitFinish] = useState(false);
      useEffect(() => {
        runBeforeRender(context).then(initialData => {
          setInitFinish(true);
          context.initialData = initialData as Record<string, unknown>;
        });
      }, []);
      if (!initFinish) {
        return null;
      }
      return React.cloneElement(App, {
        _internal_context: context,
      });
    };

    const rootElement =
      id && typeof id !== 'string'
        ? id
        : document.getElementById(id || 'root')!;

    function ModernRender(App: React.ReactElement) {
      const renderFunc = IS_REACT18 ? renderWithReact18 : renderWithReact17;
      return renderFunc(
        React.cloneElement(App, { _internal_context: context }),
        rootElement,
      );
    }

    function ModernHydrate(App: React.ReactElement, callback?: () => void) {
      const hydrateFunc = IS_REACT18 ? hydrateWithReact18 : hydrateWithReact17;
      return hydrateFunc(App, rootElement, callback);
    }

    // we should hydateRoot only when ssr
    if (ssrData) {
      return hydrateRoot(App, context, ModernRender, ModernHydrate);
    }
    return ModernRender(<WrapperApp />);
  }
  throw Error(
    '`render` function needs id in browser environment, it needs to be string or element',
  );
}

function renderWithReact18(App: React.ReactElement, rootElement: HTMLElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(App);
  return root;
}

function renderWithReact17(App: React.ReactElement, rootElement: HTMLElement) {
  ReactDOM.render(App, rootElement);
  return rootElement;
}

function hydrateWithReact18(App: React.ReactElement, rootElement: HTMLElement) {
  const root = ReactDOM.hydrateRoot(rootElement, App);
  return root;
}

function hydrateWithReact17(
  App: React.ReactElement,
  rootElement: HTMLElement,
  callback?: () => void,
) {
  const root = ReactDOM.hydrate(App, rootElement, callback);
  return root as any;
}
