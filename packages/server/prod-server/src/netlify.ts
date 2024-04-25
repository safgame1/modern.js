import { loadServerEnv } from '@modern-js/server-core/base/node';
import { createServerBase } from '@modern-js/server-core/base';
import { initProdMiddlewares } from './init';
import { BaseEnv, ProdServerOptions } from './types';

export { initProdMiddlewares, type InitProdMiddlewares } from './init';

export type { ProdServerOptions, BaseEnv } from './types';

export const createNetlifyFunction = async (options: ProdServerOptions) => {
  const server = createServerBase<BaseEnv>(options);
  // load env file.
  await loadServerEnv(options);
  await server.init();

  // initProdMiddlewares should run after beforeServerInit, because some hooks are currently executed in initProdMIddlewares
  await initProdMiddlewares(server, options);
  return (request: Request) => {
    return server.handle(request);
  };
};
