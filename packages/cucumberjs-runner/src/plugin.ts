import { fileURLToPath } from 'node:url';

import { mergeConfig } from 'vitest/config';

import type { ConfigEnv, UserConfigExport, UserConfig } from 'vitest/config';

import { Plugin, ResolvedConfig } from 'vite';

export interface CucumberInlineConfig {
    glueCode?: string[];
    features?: string[];
}

declare module 'vitest/config' {
    interface InlineConfig {
        cucumber: CucumberInlineConfig;
    }
    interface ResolvedConfig {
        test: InlineConfig & {
            cucumber: CucumberInlineConfig;
        }
    }
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

    const thisModuleResolvedRunner = fileURLToPath(import.meta.url.replace(/\/plugin.mjs$/, "/runner.mjs"));
    const thisModuleResolvedWrapper = fileURLToPath(import.meta.url.replace(/\/plugin.mjs$/, "/wrapper.mjs"))


    const mergedConfig = mergeConfig(config, {
        isolate: false,
        resolve: {
            preserveSymlinks: false
        },
        plugins: [
            myPlugin()
        ],
        server: {
            fs: {
                allow: [thisModuleResolvedRunner, thisModuleResolvedWrapper]
            }
        },
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
                wrapper: thisModuleResolvedWrapper
            }
        }
    });
    return mergedConfig;
}

function myPlugin(opts = {}): Plugin {
    let myConfig: ResolvedConfig;
    return {
        name: 'vitest-cucumberjs-plugin',
        configResolved(config) {
            myConfig = config;
        },
        configureServer(server) {
            // server.watcher.add(myConfig.test.cucumber.glueCode as readonly string[]);
            // console.log('server:', server);
        }
    };
}