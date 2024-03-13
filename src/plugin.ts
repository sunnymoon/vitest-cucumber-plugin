// import type * as vitest from 'vitest';
// import type * as vite from 'vite';
import { fileURLToPath } from 'node:url';

import { moduleResolve } from 'import-meta-resolve';
import { mergeConfig } from 'vitest/config';

import type { ConfigEnv, UserConfigExport, UserConfig } from 'vitest/config';

import myPkg from '../package.json';

export interface CucumberInlineConfig {
    glueCode?: string[];
    features?: string[];
    importMetaUrl: string;
}

export async function withCucumber( cucumberConfig: CucumberInlineConfig, config: UserConfigExport) {
    if(typeof config ==='function' ) {
        return async (ctx: ConfigEnv) => {
            const resolvedConfig = await config(ctx);
            return withInternalStuff(cucumberConfig, resolvedConfig);
        }
    }

    const resolvedConfig = await config;
    return withInternalStuff(cucumberConfig, resolvedConfig);
}



function withInternalStuff(cucumberConfig: CucumberInlineConfig, config: UserConfig): UserConfig {
    
    const thisModuleResolvedRunner = fileURLToPath(
        moduleResolve(`${myPkg.name}/runner`,
            new URL(".", cucumberConfig.importMetaUrl),
            undefined,
            true
        )
    );

    const mergedConfig= mergeConfig(config, {
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
                importMetaUrl: cucumberConfig.importMetaUrl
            }
        }
    });

    // console.log(mergedConfig);
    return mergedConfig;
}