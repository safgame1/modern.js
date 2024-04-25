import { ROUTE_SPEC_FILE, DEFAULT_SERVER_CONFIG } from '@modern-js/utils';

const severAppContextTemplate = (serverAppContext: ServerAppContext) => {
  return `{
    sharedDirectory: ${serverAppContext.sharedDirectory},
    apiDirectory: ${serverAppContext.apiDirectory},
    lambdaDirectory: ${serverAppContext.lambdaDirectory},
  }`;
};

export type ServerAppContext = {
  sharedDirectory: string;
  apiDirectory: string;
  lambdaDirectory: string;
  metaName: string;
};

const getPluginsCode = (plugins: string[]) =>
  `[${plugins.map((_, index) => `plugin_${index}()`).join(',')}]`;

const genPluginImportsCode = (plugins: string[]) => {
  return plugins
    .map(
      (plugin, index) => `
      let plugin_${index} = require('${plugin}')
      plugin_${index} = plugin_${index}.default || plugin_${index}
      `,
    )
    .join(';\n');
};

export function genNetlifyEntry({
  config,
  plugins,
  appContext,
}: {
  config?: Record<string, any>;
  plugins?: string[];
  appContext?: Record<string, any>;
} = {}) {
  const defaultConfig = {
    server: {
      port: 8080,
    },
    output: {
      path: '.',
    },
  };
  return `\n
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { createNetlifyFunction } = require('@modern-js/prod-server/netlify');
  ${genPluginImportsCode(plugins || [])}

  let requestHandler = null;

  if(!process.env.NODE_ENV){
    process.env.NODE_ENV = 'production';
  }

  async function createHandler() {
    try {
      let routes = [];
      const routeFilepath = path.join(__dirname, "${ROUTE_SPEC_FILE}");
      try {
        await fs.access(routeFilepath);
        const content = await fs.readFile(routeFilepath, "utf-8");
        const routeSpec = JSON.parse(content);
        routes = routeSpec.routes;
      } catch (error) {
        console.warn('route.json not found, continuing with empty routes.');
      }

      const prodServerOptions = {
        pwd: __dirname,
        routes,
        config: ${JSON.stringify(config || defaultConfig)},
        serverConfigFile: '${DEFAULT_SERVER_CONFIG}',
        plugins: ${getPluginsCode(plugins || [])},
        appContext: ${
          appContext ? severAppContextTemplate(appContext as any) : 'undefined'
        },
        disableCustomHook: true
      }

      requestHandler = await createNetlifyFunction(prodServerOptions)

      return requestHandler
    } catch(error) {
      console.error(error);
      process.exit(1);
    }
  }

  createHandler();

  const handleRequest = async(request, context) => {
    if(typeof requestHandler !== 'function'){
      await createHandler();
    }
    return requestHandler(request, context);
  }

  export default handleRequest;
  `;
}
