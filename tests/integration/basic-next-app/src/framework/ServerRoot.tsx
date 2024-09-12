/// <reference types="react/canary" />
import React, { use, type ReactNode } from 'react';

type Elements = Promise<ReactNode[]>;
export function ServerRoot({
  elements,
}: {
  elements: Elements;
}) {
  <div style={{ border: '3px red dashed', margin: '1em', padding: '1em' }}>
    <title>Waku</title>
    <h1>Hello </h1>
    <h3>This is a server component.</h3>
  </div>;
}

export function Html({
  elements,
}: {
  elements: Elements;
}) {
  const res = use(elements);
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
        <link rel="stylesheet" href="/styles.css"></link>
        <title>My app</title>
      </head>
      <body>{res}</body>
    </html>
  );
}
