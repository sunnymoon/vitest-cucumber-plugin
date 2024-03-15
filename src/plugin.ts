import { fileURLToPath } from 'node:url';

import { moduleResolve } from 'import-meta-resolve';
import { mergeConfig } from 'vitest/config';

import type { ConfigEnv, UserConfigExport, UserConfig } from 'vitest/config';

import myPkg from '../package.json';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import * as path from 'node:path';

export interface CucumberInlineConfig {
    glueCode?: string[];
    features?: string[];
    importMetaUrl: string;
}

export async function withCucumber(cucumberConfig: CucumberInlineConfig, config: UserConfigExport) {
    if (typeof config === 'function') {
        return async (ctx: ConfigEnv) => {
            const resolvedConfig = await config(ctx);
            return injectCucumberRunner(cucumberConfig, resolvedConfig);
        }
    }

    const resolvedConfig = await config;
    return injectCucumberRunner(cucumberConfig, resolvedConfig);
}



function injectCucumberRunner(cucumberConfig: CucumberInlineConfig, config: UserConfig): UserConfig {

    //@ts-ignore
    const thisModuleResolvedRunner = fileURLToPath(
        moduleResolve(`${myPkg.name}/runner`,
            new URL(".", cucumberConfig.importMetaUrl),
            undefined,
            true
        )
    );
    const thisModuleResolvedWrapper = fileURLToPath(
        moduleResolve(`${myPkg.name}/wrapper`,
            new URL(".", cucumberConfig.importMetaUrl),
            undefined,
            true
        )
    ).replace("/dist/wrapper.mjs", "/src/wrapper.ts");
    const newWrapperLocation = copyWrapper(thisModuleResolvedWrapper);

    const mergedConfig = mergeConfig(config, {
        isolate: false,
        test: {
            runner: thisModuleResolvedRunner,
            include: cucumberConfig.features,
            forceRerunTriggers:
                [
                    ...(config.test?.forceRerunTriggers ?? []),
                    ...(cucumberConfig.glueCode ?? [])
                ],
            cucumber: {
                glueCode: cucumberConfig.glueCode || ['features/step_definitions/*.ts'],
                wrapper: newWrapperLocation
            }
        }
    });
    return mergedConfig;
}

function copyWrapper(thisModuleResolvedWrapper: string): string {

    const newLocation = `${process.cwd()}/.vite-test-runner/wrapper.ts`;

    if (!existsSync(newLocation)) {
        mkdirSync(path.dirname(newLocation), { recursive: true });
        copyFileSync(thisModuleResolvedWrapper, newLocation);
        copyFileSync(thisModuleResolvedWrapper.replace("/wrapper.ts","/steps.ts"), newLocation.replace("/wrapper.ts","/steps.ts"));
        copyFileSync(thisModuleResolvedWrapper.replace("/wrapper.ts","/types.ts"), newLocation.replace("/wrapper.ts","/types.ts"));
    }

    return newLocation;
}