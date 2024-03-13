import type * as vitest from 'vitest';
import type * as vite from 'vite';

import { mergeConfig } from 'vitest/config';

export interface CucumberInlineConfig extends vitest.UserWorkspaceConfig {
    glueCode?: string[];
}


declare module 'vite' {
    interface UserConfig {
        test?: vitest.InlineConfig;
    }
}

declare module 'vitest' {
    interface InlineConfig {
        cucumber?: CucumberInlineConfig;
    }
}


export function defineConfig(config: vite.UserConfig): vite.UserConfig {

    return mergeConfig(config, {
        test: {
            forceRerunTriggers:
                [
                    ...(config.test?.forceRerunTriggers ?? []),
                    ...(config.test?.cucumber?.glueCode ?? [])
                ]
        }
    });
}
