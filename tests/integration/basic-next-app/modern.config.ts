import { applyBaseConfig } from '../../utils/applyBaseConfig';
import ReactServerWebpackPlugin from 'react-server-dom-webpack/plugin';
import path from 'path';

// const clientManifest = require('./dist/react-client-manifest.json');

export default applyBaseConfig({
  runtime: {
    state: false,
    router: false,
  },
  server: {
    ssr: {
      mode: 'stream',
    },
  },
  source: {
    enableCustomEntry: true,
  },
  output: {
    externals: {
      pg: 'pg',
    },
  },
  tools: {
    // webpack(config, { isServer }) {
    //   if (isServer) {
    //     config.experiments = {
    //       ...config.experiments,
    //       layers: true,
    //     };
    //   }
    // },
    babel(config, { modifyPresetReactOptions }) {
      modifyPresetReactOptions({
        runtime: 'automatic',
      });
    },

    bundlerChain(chain, { isServer }) {
      if (isServer) {
        chain.entryPoints.clear();
        chain.entry('main').add({
          import: [path.resolve(__dirname, './src/index.server.tsx')],
          layer: 'server',
        });

        chain.experiments({
          ...chain.experiments,
          layers: true,
        });

        // index.server.tsx(server)
        // 从入口开始的所有文件都是 server layer
        // 所有的 client components 都是 client layer

        chain.module
          .rule('server-module')
          .test(/\.jsx?$/)
          .issuerLayer('server')
          .layer('server')
          .resolve.conditionNames.merge(['react-server', '...'])
          .end();

        chain.module
          .rule('modern-js-runtime-ssr-server')
          .test([
            require.resolve('@modern-js/runtime/ssr/server'),
            // 加上这一行会使报错的调用行清晰，很奇怪
            // /ServerRoot/,
          ])
          .layer('client')
          .resolve.conditionNames.merge(['...'])
          .end();
      } else {
        chain
          .plugin('react-server-dom-webpack-plugin')
          .use(ReactServerWebpackPlugin, [
            {
              isServer: false,
              clientReferences: [
                {
                  directory: './src',
                  recursive: true,
                  include: /\.(js|jsx|ts|tsx)$/,
                },
              ],
            },
          ]);
      }
    },
  },
});
