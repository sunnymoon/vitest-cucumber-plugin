import type { VitestRunner, VitestRunnerImportSource } from '@vitest/runner';
import { VitestExecutor } from 'vitest/execute';

import type { VitestRunnerConfig } from '@vitest/runner';

declare global {
    var _cenas: {
        glueCode: string[];
        filepath: string;
    };
}

declare module '@vitest/runner' {
    interface VitestRunnerConfig {
        cucumber: {
            glueCode: string[];
            wrapper: string;
        };
    }
}

export default class CucumberRunner implements VitestRunner {

    private __vitest_executor!: VitestExecutor

    public config: VitestRunnerConfig;


    constructor(config: VitestRunnerConfig) {
        this.config = config;
    }

    async importFile(filepath: string, source: VitestRunnerImportSource): Promise<void> {
        //console.log("importFile", filepath, source)
        if (source === 'collect') {
            
            console.log("Executing", this.config.cucumber.wrapper);
            globalThis._cenas={
                glueCode: this.config.cucumber.glueCode,
                filepath: filepath
            }
            await this.__vitest_executor.executeId(this.config.cucumber.wrapper);
            // try {
            //     await module.mapCucumberToVitest(this.config.cucumber.glueCode, filepath,this.__vitest_executor);
            // } catch (e) {
            //     console.error(e);
            // }
        }
    }//importFile


    onBeforeRunFiles(): void {
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

