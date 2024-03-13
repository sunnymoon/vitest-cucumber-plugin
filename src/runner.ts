import { extname } from 'path';
import fastGlob from 'fast-glob';

import type { VitestRunner, VitestRunnerImportSource } from '@vitest/runner';
import { VitestExecutor } from 'vitest/execute';

import type { VitestRunnerConfig } from '@vitest/runner';

import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import { IdGenerator } from '@cucumber/messages';
import { supportCodeLibraryBuilder } from '@cucumber/cucumber';

import { moduleResolve } from 'import-meta-resolve';
import { fileURLToPath } from 'node:url';

import { suite, it } from 'vitest';

import {
    setFeature, setScenario, missingStep, orderedDocuments,
    Given, When, Then, BeforeStep, Before, BeforeAll, AfterStep, After, AfterAll
} from './cucumber.js';

declare module '@vitest/runner' {
    interface VitestRunnerConfig {
        cucumber: {
            glueCode: string[];
            importMetaUrl: string;
        };
    }
}

const vitestCucumberStateHelpers = {
    setFeature,
    setScenario,
    missingStep,
    orderedDocuments,
    Given,
    When,
    Then,
    BeforeStep,
    Before,
    BeforeAll,
    AfterStep,
    After,
    AfterAll
};

declare global {
    var __vitestCucumberStateHelpers: typeof vitestCucumberStateHelpers;
}

if (!globalThis.__vitestCucumberStateHelpers) {
    globalThis.__vitestCucumberStateHelpers = vitestCucumberStateHelpers;
}

export default class CucumberRunner implements VitestRunner {

    private __vitest_executor!: VitestExecutor

    public config: VitestRunnerConfig;

    private firstRun = true;

    private supportCode: any;

    private cucumberConfig;

    constructor(config: VitestRunnerConfig) {
        this.config = config;
        this.cucumberConfig = {
            glueCode: this.config.cucumber.glueCode
        };
    }

    async importFile(filepath: string, source: VitestRunnerImportSource): Promise<unknown> {
        //console.log("importFile", filepath, source)
        if (source === 'collect') {

            const glueCodeFiles = await fastGlob(this.cucumberConfig.glueCode, {
                absolute: true,
                onlyFiles: true
            });
            const foundInGlues = glueCodeFiles.find((file) => {
                return file === filepath;
            });
            if (foundInGlues) {
                throw new Error(`File ${filepath} is being defined as both 'include' glob and 'glue code' glob. Please fix on your vite(st) config.`);
            }

            const formatterLocation = fileURLToPath(moduleResolve('@linkare/vitest-cucumberjs/formatter', new URL(".", this.config.cucumber.importMetaUrl), undefined, true));

            const { runConfiguration } = await loadConfiguration({
                file: false,
                profiles: [],
                provided: {
                    parallel: 0,
                    format: [
                        formatterLocation
                    ],
                    formatOptions: {
                        "snippetInterface": "async-await"
                    },
                    paths: [filepath],
                    forceExit: false,
                    failFast: false,
                    import: [],
                    require: [],
                    requireModule: [],
                    dryRun: false,
                    order: 'defined',
                    backtrace: true,
                    language: 'en',
                    name: [],
                    publish: false,
                    retry: 0,
                    strict: false,
                    retryTagFilter: '',
                    tags: '',
                    worldParameters: {},
                }
            });

            if (this.firstRun) {
                this.firstRun = false;

                supportCodeLibraryBuilder.reset(
                    process.cwd(),
                    IdGenerator.incrementing(),
                    {
                        importPaths: [],
                        requireModules: [],
                        requirePaths: [],
                    }
                );

                await Promise.all(
                    (await fastGlob(this.cucumberConfig.glueCode, {
                        absolute: true,
                        onlyFiles: true
                    }))
                        .map(
                            async (importMatch) => {
                                if (extname(importMatch) !== '.feature') {
                                    await this.__vitest_executor.executeId(importMatch);
                                }
                            }
                        )
                );

                this.supportCode = supportCodeLibraryBuilder.finalize();
            }

            console.trace("Formatter will only be loaded after this point");
            /*const { success } =*/ await runCucumber({
                ...runConfiguration,
                support: this.supportCode
            });


            console.dir({ orderedDocuments2: orderedDocuments }, { depth: 10 });
            for (const feature of orderedDocuments) {
                console.log(`Creating feature ${feature}`);
                suite(feature.name, () => {
                    for (const scenario of feature.scenarios) {
                        console.log(`Creating scenario ${feature}`);
                        suite(scenario.name, () => {
                            for (const step of scenario.steps) {
                                console.log(`Creating step ${step.pattern.toString()}`);
                                it(step.pattern.toString(), async (...args) => {
                                    await step.userCode.apply(args);
                                });
                            }
                        });
                    }
                });
            }

        }

        return {};
    }

    onBeforeRunFiles(): void {
        // console.log("onBeforeRunFiles")
    }

    async onBeforeRunSuite(/*suite: Suite*/): Promise<void> {
        //  console.log("onBeforeRunSuite", suite);
    }

    async onAfterRunSuite(/*suite: Suite*/): Promise<void> {
        //  console.log("onAfterRunSuite", suite);
    }
    onAfterRunTask(/*test: Task*/): void {
        //  console.log("onAfterRunTask", test);
    }
    onCancel(/*_reason: CancelReason*/): void {
        //  console.log("onCancel", _reason);
    }
    async onBeforeRunTask(/*test: Task*/): Promise<void> {
        //  console.log("onBeforeRunTask", test);
    }

    onBeforeTryTask(/*test: Task*/): void {
        //  console.log("onBeforeTryTask", test);
    }
    onAfterTryTask(/*test: Task*/): void {
        //  console.log("onAfterTryTask", test);
    }

}

