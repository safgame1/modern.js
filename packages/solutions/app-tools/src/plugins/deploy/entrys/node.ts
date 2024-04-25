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

export function genNodeEntry({
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
  const { createProdServer } = require('@modern-js/prod-server');
  ${genPluginImportsCode(plugins || [])}

  if(!process.env.NODE_ENV){
    process.env.NODE_ENV = 'production';
  }

  async function main() {
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

      const app = await createProdServer(prodServerOptions)

      const port = process.env.PORT || 3000;

      app.listen(port, () => {
        console.log('\\x1b[32mServer is listening on port', port, '\\x1b[0m');
      });
    } catch(error) {
      console.error(error);
      process.exit(1);
    }
  }

  main();
  `;
}
