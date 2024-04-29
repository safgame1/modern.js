import {
  appTools,
  mergeConfig,
  type AppTools,
  type UserConfig,
} from '@modern-js/app-tools';

export const applyBaseConfig = (
  config: UserConfig<AppTools<'rspack'>> = {},
) => {
  return mergeConfig([
    {
      output: {
        // disable polyfill and ts checker to make test faster
        polyfill: 'off',
        disableTsChecker: true,
      },
      dev: { hmr: false },
      tools: {
        devServer: {
          liveReload: false,
        },
      },
      plugins: [
        appTools({
          bundler:
            process.env.BUNDLER === 'webpack'
              ? 'webpack'
              : 'experimental-rspack',
        }),
      ],
    },
    config,
  ]);
};
