/// <reference types="react/canary" />
/// <reference types="react-dom/canary" />
import fs, { readFileSync } from 'node:fs';
import path from 'node:path';
// import { createRequestHandler } from '@modern-js/runtime/ssr/server';
import { getModuleMap } from './renderRsc';
import { createFromReadableStream } from 'react-server-dom-webpack/client.browser';
import { renderToReadableStream } from 'react-server-dom-webpack/server.edge';
import { renderToReadableStream as renderToStream } from 'react-dom/server.edge';
import type { ReactNode } from 'react';
import { Html, ServerRoot } from './framework/ServerRoot';
import App from './App';
import type React from 'react';

interface IProps {
  selectedId: string;
  isEditing: boolean;
  searchText: string;
}

export const renderRsc = async (
  Component: React.ComponentType<any>,
  distDir: string,
  props: IProps,
) => {
  const manifest = readFileSync(
    path.resolve(distDir, './react-client-manifest.json'),
    'utf8',
  );

  const moduleMap = JSON.parse(manifest);
  const element = <Component {...props} />;
  const readable = renderToReadableStream(element, moduleMap);
  return readable;
};

export const handleRequest = async (request: Request): Promise<Response> => {
  // TODO: 临时代码
  const distDir =
    '/Users/bytedance/Desktop/workspace/modern-js-main.js/tests/integration/basic-next-app/dist';

  const url = new URL(request.url);
  const location = JSON.parse(url.searchParams.get('location') as string);
  const stream = await renderRsc(App, distDir, {
    selectedId: location?.selectedId,
    isEditing: location?.isEditing,
    searchText: location?.searchText,
  });
  await new Promise(resolve => setTimeout(resolve, 3000));
  const [stream1, stream2] = stream.tee();

  const moduleMap = getModuleMap(distDir);

  const elements: Promise<ReactNode[]> = createFromReadableStream(stream1, {
    ssrManifest: { moduleMap },
  });
  console.log('66666666', elements);

  // const shellHtml = fs.readFileSync(path.join(__dirname, '../index.html'));

  // const props = {
  //   selectedId: location?.selectedId,
  //   isEditing: location?.isEditing,
  //   searchText: location?.searchText,
  // };

  // const readable = await renderToStream(<Html elements={elements} />, {
  //   onError(error) {
  //     console.error(error);
  //   },
  // });
  console.log('777777777');
  const readable = await renderToStream(<div>111111111</div>, {
    onError(error) {
      console.error(error);
    },
  });
  console.log('8888888888');
  const response = new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
  console.log('99999999');
  return response;
};

// export const requestHandler = createRequestHandler(handleRequest);

export const requestHandler = handleRequest;
