import { Server as NodeServer, createServer, ServerResponse } from 'node:http';
import { NodeRequest, NodeResponse } from '@core/plugin';
import { RequestHandler } from '../types';
import { ServerBase } from '../serverBase';
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from './stream';
import { installGlobals } from './polyfills';

installGlobals();

export const createWebRequest = (
  req: NodeRequest,
  res: NodeResponse,
): Request => {
  const headerRecord: [string, string][] = [];
  const len = req.rawHeaders.length;
  for (let i = 0; i < len; i += 2) {
    headerRecord.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
  }

  const { method } = req;

  const controller = new AbortController();
  const init: RequestInit = {
    method,
    headers: headerRecord,
    signal: controller.signal,
  };
  res.on('close', () => controller.abort());

  if (!(method === 'GET' || method === 'HEAD')) {
    init.body = createReadableStreamFromReadable(req);
    (init as { duplex: 'half' }).duplex = 'half';
  }

  const url = `http://${req.headers.host}${req.url}`;

  const request = new Request(url, init);
  return request;
};

const sendResponse = async (response: Response, res: NodeResponse) => {
  res.statusMessage = response.statusText;
  res.statusCode = response.status;

  for (const [key, value] of response.headers.entries()) {
    res.setHeader(key, value);
  }

  if (
    response.headers.get('Content-Type')?.match(/text\/event-stream/i) &&
    res instanceof ServerResponse
  ) {
    res.flushHeaders();
  }

  if (response.body) {
    await writeReadableStreamToWritable(response.body, res);
  } else {
    res.end();
  }
};

/**
 * The function is modified based on
 * https://github.com/honojs/node-server/blob/8cea466fd05e6d2e99c28011fc0e2c2d3f3397c9/src/listener.ts
 *
 * MIT Licensed
 * https://github.com/honojs/node-server/tree/8cea466fd05e6d2e99c28011fc0e2c2d3f3397c9?tab=readme-ov-file#license
 */
const handleResponseError = (e: unknown, res: NodeResponse) => {
  const err = (
    e instanceof Error ? e : new Error('unknown error', { cause: e })
  ) as Error & {
    code: string;
  };
  if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    console.info('The user aborted a request.');
  } else {
    console.error(e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end(`Error: ${err.message}`);
    res.destroy(err);
  }
};

const getRequestListener = (handler: RequestHandler) => {
  // eslint-disable-next-line consistent-return
  return async (req: NodeRequest, res: NodeResponse) => {
    try {
      const request = createWebRequest(req, res);
      const response = await handler(request, {
        node: {
          req,
          res,
        },
      });

      /**
       * When response.res exists, it means that the response is hono's context
       * https://github.com/honojs/hono/blob/main/src/compose.ts#L60
       * and the response is not yet finished after the middleware is executed
       *
       * One scenario is the code for mock:
       * ```
       *   'GET /api/addInfo': (req: any, res: any) => {
       *      setTimeout(() => {
       *        res.end('delay 2000ms');
       *      }, 2000);
       *    },
       * ```
       */

      if (!res.headersSent && !(response as any).res) {
        await sendResponse(response, res);
      }
    } catch (error) {
      return handleResponseError(error, res);
    }
  };
};

export const createNodeServer = async (
  handleRequest: RequestHandler,
  serverBase: ServerBase,
): Promise<NodeServer> => {
  const requestListener = getRequestListener(handleRequest);
  const nodeServer = createServer(requestListener);

  await afterCreateNodeServer(nodeServer, serverBase);
  return Object.assign(nodeServer, {
    getRequestHandler: () => requestListener,
  });
};

async function afterCreateNodeServer(
  nodeServer: NodeServer,
  serverBase: ServerBase,
) {
  await serverBase.runner.beforeServerInit({
    app: nodeServer,
  });

  // TODO: need to support
  // if (!disableHttpServer) {
  //   this.app = await this.server.createHTTPServer(this.getRequestHandler());
  // }

  // TODO: 支持 onInit 的功能
  // await this.server.onInit(this.runner, this.app);

  await serverBase.prepareFrameHandler();
}