import { extname } from 'path';
import fastGlob from 'fast-glob';

import type { VitestRunner, VitestRunnerImportSource } from '@vitest/runner';
import { VitestExecutor } from 'vitest/execute';

import type { VitestRunnerConfig } from '@vitest/runner';

import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import { IdGenerator } from '@cucumber/messages';
import { supportCodeLibraryBuilder } from '@cucumber/cucumber';

import {
    setFeature, setScenario, missingStep, orderedDocuments,
    Given, When, Then, BeforeStep, Before, BeforeAll, AfterStep, After, AfterAll
} from './steps.js';

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

export type VitestCucumber=typeof vitestCucumberStateHelpers;

declare global {
    var __vitestCucumberStateHelpers: VitestCucumber;
}

if (!globalThis.__vitestCucumberStateHelpers) {
    globalThis.__vitestCucumberStateHelpers = vitestCucumberStateHelpers;
}

import {
    Envelope,
    GherkinDocument,
    TestCase,
    TestCaseStarted,
    TestStepFinished,
    Pickle,
    PickleStep,
    TestStep,
    Tag,
    TestStepResultStatus
} from '@cucumber/messages';
import { it, suite } from 'vitest';


export default class CucumberRunner implements VitestRunner {

    private __vitest_executor!: VitestExecutor

    public config: VitestRunnerConfig;

    private firstRun = true;

    private supportCode: any;

    private cucumberConfig;

    private readonly scenarios: {
        [id: string]: Pickle
    } = {};
    private readonly steps: {
        [id: string]: PickleStep
    } = {};
    private readonly testCases: {
        [id: string]: TestCase
    } = {};
    private readonly testSteps: {
        [id: string]: TestStep
    } = {};

    constructor(config: VitestRunnerConfig) {
        this.config = config;
        this.cucumberConfig = {
            glueCode: this.config.cucumber.glueCode
        };
        console.dir({config:this.config},{depth:10});
        console.dir({cucumberConfig:this.cucumberConfig},{depth:10});
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

            const { runConfiguration } = await loadConfiguration({
                file: false,
                profiles: [],
                provided: {
                    parallel: 0,
                    format: [
                        "snippets"
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
                    IdGenerator.uuid(),
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

            /*const { success } =*/ await runCucumber({
                ...runConfiguration,
                support: this.supportCode,
            }, 
            {}, 
            this.handleCucumberMessages.bind(this)
            );



        }

        return {};
    }


    /**********CUCUMBER MESSAGES HANDLING*******/
    
    handleCucumberMessages(envelope: Envelope){
        console.log(Object.keys(envelope)[0]);

        if (envelope.gherkinDocument) {
            this.onGherkinDocument(envelope.gherkinDocument)
        }
        //envelope<pickle> is a scenario with => pickle.id
        else if (envelope.pickle) {
            this.onPickle(envelope.pickle);
        }
        //envelope<testCase> has id and pickleId => scenario 
        else if (envelope.testCase) {
            this.onTestCase(envelope.testCase);
        }
        //envelope<testCaseStarted> has testcaseId => testCase.id
        //THEN we have test steps ;)
        else if (envelope.testCaseStarted) {
            this.onTestCaseStarted(envelope.testCaseStarted);
        }
        else if (envelope.testStepFinished) {
            this.onTestStepFinished(envelope.testStepFinished);
        }
        else if (envelope.testRunFinished) {
            this.onTestRunFinished();
        }
    }
    

    onGherkinDocument(gherkinDocument: GherkinDocument) {
        if (gherkinDocument.feature) {
            setFeature(`${this.formatTags(gherkinDocument.feature.tags)}\n${gherkinDocument.feature.keyword}: ${gherkinDocument.feature.name} (@${gherkinDocument.uri}~${gherkinDocument.feature.location.line})`);
        }
    }

    formatTags(tags: readonly Tag[]) {
        const tagString = tags.map(tag => `@${tag.name}`).join(' ');
        if (tagString.length > 0) {
            return `${tagString}\n`;
        } else {
            return '';
        }
    }

    onPickle(pickle: Pickle) {
        this.scenarios[pickle.id] = {
            ...pickle
        }
        pickle.steps.forEach(step => {
            this.steps[step.id] = {
                ...step
            }
        });

        // pickle: {
        //     id: 'cc9eecf2-ab7c-4b6d-8f94-1f81b2a70c1f',
        //     uri: 'features/second.feature',
        //     astNodeIds: [ 'fd727b37-09ba-4d6f-a1ed-168f8d7352f2' ],
        //     tags: [],
        //     name: 'Adding two numbers together abacus',
        //     language: 'pt',
        //     steps: [
        //       {
        //         id: 'e0196a59-0d2b-4429-b883-33d069c141f2',
        //         text: 'I have entered 40 into the abacus',
        //         type: 'Context',
        //         argument: undefined,
        //         astNodeIds: [ '42911027-c426-4c83-8f1c-6ca98715612a' ]
        //       },
    }

    onTestCase(testCase: TestCase) {
        this.testCases[testCase.id] = {
            ...testCase
        }
        testCase.testSteps.forEach(testStep => {
            this.testSteps[testStep.id] = {
                ...testStep
            }
        });

        // pickleId: '0d0c1c8d-640f-4ab9-94f7-f6c3cc9522e6',
        // id: '6fa54cd2-ae1f-40c4-9dbe-9a18ce469041',
        //     testSteps: [
        //       {
        //         id: '5d6c6fde-11a1-4a81-a04c-aefa5deae32e',
        //         pickleStepId: '0b085d94-5c61-4ef6-8c41-ba9cb472b2e2',
        //         stepDefinitionIds: [ '135aa51f-ccf1-4270-9398-b4c83478e398' ], 
        //>>>>>> connects to stepDefinition.id
        //         stepMatchArgumentsLists: [
        //           {
        //             stepMatchArguments: [
        //               {
        //                 group: { start: 15, value: '50', children: [] },
        //                 parameterTypeName: 'int'
        //               }
        //             ]
        //           }
        //         ]
        //       },
    }
    onTestCaseStarted(testCaseStarted: TestCaseStarted) {
        const pickleId = this.testCases[testCaseStarted.testCaseId].pickleId;
        const scenarioName = this.scenarios[pickleId].name;
        setScenario(scenarioName);
    }
    onTestStepFinished(testStepFinished: TestStepFinished) {
        if (testStepFinished.testStepResult.status === TestStepResultStatus.UNDEFINED) {
            const testStepId = testStepFinished.testStepId;
            const pickleStepId = this.testSteps[testStepId].pickleStepId;
            if (pickleStepId) {
                const pickleStep = this.steps[pickleStepId];
                missingStep(pickleStep.text);
            }
        }
    }

    async onTestRunFinished(/*testRunFinished: TestRunFinished*/) {
       
    }

    /**********END CUCUMBER MESSAGES HANDLING*******/


    onBeforeRunFiles(): void {
         //ignore - set at the runner
         suite("X",()=>{
            suite("Y1",()=>{
                it("Z1",()=>{});
                it("Z2",()=>{});
            });
            suite("Y2",()=>{
                it("Z1.2",()=>{});
                it("Z2.2",()=>{});
            });
        });
        console.log("Defined some suites and tests...");

        console.dir({ orderedDocuments3: orderedDocuments }, { depth: 10 });
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

