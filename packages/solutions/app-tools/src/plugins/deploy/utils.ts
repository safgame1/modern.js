import path from 'path';
import os from 'node:os';
import { ROUTE_SPEC_FILE, fs as fse, isDepExists } from '@modern-js/utils';
import { ServerRoute } from '@modern-js/types';
import type { PackageJson } from 'pkg-types';
import { parseNodeModulePath } from 'mlly';

export const getProjectUsage = (
  appDirectory: string,
  distDirectory: string,
) => {
  const routeJSON = path.join(distDirectory, ROUTE_SPEC_FILE);
  const { routes } = fse.readJSONSync(routeJSON);

  let useSSR = false;
  let useAPI = false;
  routes.forEach((route: ServerRoute) => {
    if (route.isSSR) {
      useSSR = true;
    }

    if (route.isApi) {
      useAPI = true;
    }
  });
  const useWebServer = isDepExists(appDirectory, '@modern-js/plugin-server');
  return { useSSR, useAPI, useWebServer };
};

export function applyProductionCondition(exports: PackageJson['exports']) {
  if (!exports || typeof exports === 'string') {
    return;
  }
  if (exports.production) {
    if (typeof exports.production === 'string') {
      exports.default = exports.production;
    } else {
      Object.assign(exports, exports.production);
    }
  }
  for (const key in exports) {
    applyProductionCondition(exports[key]);
  }
}

export function applyPublicCondition(pkg: PackageJson) {
  if (pkg?.publishConfig?.exports) {
    pkg.exports = pkg?.publishConfig?.exports;
  }
}

export type TracedPackage = {
  name: string;
  versions: Record<
    string,
    {
      pkgJSON: PackageJson;
      path: string;
      files: string[];
    }
  >;
};

export const writePackage = async (
  pkg: TracedPackage,
  version: string,
  projectDir: string,
  _pkgPath?: string,
) => {
  const pkgPath = _pkgPath || pkg.name;
  for (const src of pkg.versions[version].files) {
    if (src.includes('node_modules')) {
      const { subpath } = parseNodeModulePath(src);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const dest = path.join(projectDir, 'node_modules', pkgPath, subpath!);
      const dirname = path.dirname(dest);
      await fse.ensureDir(dirname);
      await fse.copyFile(src, dest);
    } else {
      // workspace package
      const subpath = path.relative(pkg.versions[version].path, src);
      const dest = path.join(projectDir, 'node_modules', pkgPath, subpath);
      const dirname = path.dirname(dest);
      await fse.ensureDir(dirname);
      await fse.copyFile(src, dest);
    }
  }

  const { pkgJSON } = pkg.versions[version];
  applyPublicCondition(pkgJSON);

  const packageJsonPath = path.join(
    projectDir,
    'node_modules',
    pkgPath,
    'package.json',
  );
  await fse.ensureDir(path.dirname(packageJsonPath));
  await fse.writeFile(packageJsonPath, JSON.stringify(pkgJSON, null, 2));
};

const isWindows = os.platform() === 'win32';
export const linkPackage = async (
  from: string,
  to: string,
  projectRootDir: string,
) => {
  const src = path.join(projectRootDir, 'node_modules', from);
  const dest = path.join(projectRootDir, 'node_modules', to);
  const dstStat = await fse.lstat(dest).catch(() => null);
  const exists = dstStat?.isSymbolicLink();

  if (exists) {
    return;
  }
  await fse.mkdir(path.dirname(dest), { recursive: true });
  await fse
    .symlink(
      path.relative(path.dirname(dest), src),
      dest,
      isWindows ? 'junction' : 'dir',
    )
    .catch(error => {
      console.error('Cannot link', from, 'to', to, error);
    });
};
