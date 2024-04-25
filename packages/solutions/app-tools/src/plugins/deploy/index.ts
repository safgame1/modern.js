import path from 'path';
import { CliPlugin } from '@modern-js/core';
import { fs as fse, getInternalPlugins } from '@modern-js/utils';
import { AppTools } from '../../types';
import { getProjectUsage } from './utils';
import type { ServerAppContext } from './entrys/node';
import { handleDependencies } from './dependencies';

export default (): CliPlugin<AppTools> => ({
  name: '@modern-js/plugin-deploy',
  pre: ['@modern-js/plugin-bff', '@modern-js/plugin-server'],
  setup: api => {
    return {
      async beforeDeploy() {
        const appContext = api.useAppContext();
        const {
          appDirectory,
          distDirectory,
          serverInternalPlugins,
          sharedDirectory,
          apiDirectory,
          lambdaDirectory,
          metaName,
        } = appContext;

        const configContext = api.useResolvedConfigContext();

        const outputDirectory = path.join(appDirectory, '.output');

        await fse.remove(outputDirectory);

        await fse.copy(distDirectory, outputDirectory, {
          filter: (src: string) => {
            const distStaticDirectory = path.join(distDirectory, 'static');
            return !src.includes(distStaticDirectory);
          },
        });

        // await fse.copyFile(
        //   path.join(appDirectory, 'package.json'),
        //   path.join(outputDirectory, 'package.json'),
        // );

        const { bff } = configContext;
        const config = {
          output: {
            path: '.',
          },
          bff,
        };
        const plugins = getInternalPlugins(appDirectory, serverInternalPlugins);

        const serverAppContext: ServerAppContext = {
          sharedDirectory: `path.join(__dirname, "${path.relative(
            appDirectory,
            sharedDirectory,
          )}")`,
          apiDirectory: `path.join(__dirname, "${path.relative(
            appDirectory,
            apiDirectory,
          )}")`,
          lambdaDirectory: `path.join(__dirname, "${path.relative(
            appDirectory,
            lambdaDirectory,
          )}")`,
          metaName,
        };

        let code = ``;
        const deployTarget = process.env.MODERNJS_DEPLOY || 'node';

        console.log('deployTarget111111111', deployTarget);

        switch (deployTarget) {
          case 'node': {
            const { genNodeEntry } = await import('./entrys/node');
            code = genNodeEntry({
              plugins,
              config,
              appContext: serverAppContext,
            });
            break;
          }

          case 'netlify': {
            const { genNetlifyEntry } = await import('./entrys/netlify');
            code = genNetlifyEntry({
              plugins,
              config,
              appContext: serverAppContext,
            });
            break;
          }

          default: {
            code = `throw new Error("unknown deploy target, MODERNJS_DEPLOY should be set");`;
          }
        }

        const { useSSR, useAPI, useWebServer } = getProjectUsage(
          appDirectory,
          outputDirectory,
        );
        const entryFilePath = path.join(outputDirectory, 'index.js');
        // TODO: 支持纯 CSR 应用
        if (useSSR || useAPI || useWebServer) {
          await fse.writeFile(entryFilePath, code);
        }

        await handleDependencies(appDirectory, outputDirectory, [
          '@modern-js/prod-server',
        ]);
      },
    };
  },
});
