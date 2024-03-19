import type { VitestRunnerImportSource } from '@vitest/runner';

import { ResolvedConfig, afterAll as afterAll, beforeAll, describe, test } from 'vitest';

import { supportCodeLibraryBuilder } from '@cucumber/cucumber';
import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import type {
    Background,
    Envelope,
    Examples,
    GherkinDocument,
    Pickle,
    PickleStep,
    Rule,
    Scenario,
    TestCase,
    TestCaseStarted,
    TestStep,
    TestStepFinished,
    TestStepStarted,
} from '@cucumber/messages';
import { IdGenerator, TestStepResultStatus } from '@cucumber/messages';

import {
    missingStep, orderedDocuments,
    setCurrentStepText,
    setFeature, setScenario
} from './steps.ts';

import { After, AfterAll, AfterStep, Before, BeforeAll, BeforeStep, Given, Then, When, } from './steps.ts';

import fastGlob from 'fast-glob';
import { extname } from 'path';

import { beforeScenario, afterScenario, featureToVitest, scenarioToVitest, stepToVitest } from './tasks.ts';

import type {
    After as StepsAfter,
    AfterAll as StepsAfterAll,
    AfterStep as StepsAfterStep,
    Before as StepsBefore,
    BeforeAll as StepsBeforeAll,
    BeforeStep as StepsBeforeStep,
    Given as StepsGiven,
    Then as StepsThen,
    When as StepsWhen,
} from './steps.ts';

import { VitestTestRunner } from 'vitest/runners';
import { PendingStepImplementationError } from './steps.ts';

declare global {
    var _cucumberHelpers: {
        Given: typeof StepsGiven,
        When: typeof StepsWhen,
        Then: typeof StepsThen,
        BeforeStep: typeof StepsBeforeStep,
        Before: typeof StepsBefore,
        BeforeAll: typeof StepsBeforeAll,
        AfterStep: typeof StepsAfterStep,
        After: typeof StepsAfter,
        AfterAll: typeof StepsAfterAll,
    }
}

declare module 'vitest' {
    interface ResolvedConfig {
        cucumber: {
            glueCode: string[];
            wrapper: string;
        };
    }
}

export default class CucumberRunner extends VitestTestRunner {

    private currentDocument: GherkinDocument | undefined;

    private readonly elementsByAstNodeId: {
        [id: string]: {
            tags?: string[]
            keyword?: string,
            name: string,
            line: number,
            column?: number,
        }
    } = {};

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

    constructor(config: ResolvedConfig) {
        super(config);
    }

    async importFile(filepath: string, source: VitestRunnerImportSource): Promise<void> {


        //console.log("importFile", filepath, source)
        if (source === 'collect') {


            globalThis._cucumberHelpers = {
                Given,
                When,
                Then,
                BeforeStep,
                Before,
                BeforeAll,
                AfterStep,
                After,
                AfterAll,
            };


            const glueCodeFiles = await fastGlob(this.config.cucumber.glueCode, {
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
                (await fastGlob(this.config.cucumber.glueCode, {
                    absolute: true,
                    onlyFiles: true
                }))
                    .map(
                        async (importMatch) => {
                            if (extname(importMatch) !== '.feature') {
                                await super.importFile(importMatch, source);
                            }
                        }
                    )
            );

            const supportCode = supportCodeLibraryBuilder.finalize();

            await runCucumber({
                ...runConfiguration,
                support: supportCode,
            },
                {},
                this.handleCucumberMessages.bind(this)
            );

            for (const feature of orderedDocuments) {

                const featureMeta = {
                    feature: feature.name,
                };

                if (feature.befores.length > 0) {
                    for (const before of feature.befores) {
                        beforeAll(async (ctx) => {
                            await before.userCode(ctx);
                        });
                    }
                }

                featureToVitest(feature.name, {
                    concurrent: false,
                    sequential: true,
                    retry: 0
                }, async (featureCtx) => {

                    for (const scenario of feature.scenarios) {

                        const scenarioMeta = {
                            ...featureMeta,
                            scenario: scenario.name,
                        };




                        scenarioToVitest(scenario.name, {
                            concurrent: false,
                            sequential: true,
                            retry: 0
                        }, async (scenarioCtx) => {

                            // console.log({ this: this, scenarioCtx: scenarioCtx });

                            let missingStepFound = false;

                            if (scenario.befores.length > 0) {
                                for (const before of scenario.befores) {
                                    //beforeScenario(`Before ${scenario.name}`, before.userCode.bind(scenarioCtx));
                                }
                            }

                            for (const step of scenario.steps) {

                                const stepMeta = {
                                    ...scenarioMeta,
                                    step: step.name.toString(),
                                }




                                stepToVitest(step.name.toString(),
                                    {
                                        concurrent: false,
                                        sequential: true,
                                        skip: missingStepFound
                                    },
                                    async (stepCtx) => {
                                        Object.defineProperty(stepCtx.task.meta, 'cukes', stepMeta);

                                        if (missingStepFound) {
                                            stepCtx.skip();
                                        }
                                        try {

                                            if (step.befores.length > 0) {
                                                for (const before of step.befores) {
                                                    await before.userCode(stepCtx);
                                                }
                                            }

                                            await step.userCode(stepCtx);
                                        } catch (e) {
                                            if (e instanceof PendingStepImplementationError) {
                                                missingStepFound = true;
                                            }
                                            throw e;
                                        } finally {
                                            if (step.afters.length > 0) {
                                                for (const after of step.afters) {
                                                    await after.userCode(stepCtx);
                                                }
                                            }
                                        }
                                    });

                                if (step.missing) {
                                    missingStepFound = true;
                                }

                            }

                            if (scenario.afters.length > 0) {
                                for (const after of scenario.afters) {
                                    // globalThis._vitestHelpers.afterScenario.apply(scenarioCtx, [after.userCode.bind(scenarioCtx)]);
                                }
                            }
                        });


                    }

                });

                if (feature.afters.length > 0) {
                    for (const after of feature.afters) {
                        afterAll(async (ctx) => {
                            await after.userCode(ctx);
                        });
                    }
                }
            }
            // }
        }
    }//importFile



    /**********CUCUMBER MESSAGES HANDLING*******/

    handleCucumberMessages(envelope: Envelope) {
        // if(envelope.stepDefinition) {
        //     console.dir({ envelope }, { depth: 10 });
        // }
        if (envelope.gherkinDocument) {
            this.onGherkinDocument(envelope.gherkinDocument);
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
        else if (envelope.testStepStarted) {
            this.onTestStepStarted(envelope.testStepStarted);
        }
        else if (envelope.testStepFinished) {
            this.onTestStepFinished(envelope.testStepFinished);
        }
        else if (envelope.testRunFinished) {
            this.onTestRunFinished();
        }
    }


    onGherkinDocument(gherkinDocument: GherkinDocument) {
        this.currentDocument = gherkinDocument;
        if (gherkinDocument.feature) {
            this.indexCurrentDocumentByAstNodeId(gherkinDocument);
            const tags = gherkinDocument.feature.tags.map((tag) => tag.name);
            setFeature(`${this.formatTags(tags)}${gherkinDocument.feature.keyword}: ${gherkinDocument.feature.name} (@ ${gherkinDocument.uri}:${gherkinDocument.feature.location.line}:${gherkinDocument.feature.location.column} )`);
        }
    }

    indexCurrentDocumentByAstNodeId(gherkinDocument: GherkinDocument) {

        gherkinDocument.feature?.children.forEach((featureChild) => {
            if (featureChild.background) {
                this.indexBackgroundByAstNodeId(featureChild.background);
            } else if (featureChild.scenario) {
                this.indexScenarioByAstNodeId(featureChild.scenario);
            } else if (featureChild.rule) {
                this.indexRuleByAstNodeId(featureChild.rule);
            }

        });
    }

    indexExamplesByAstNodeId(examples: Examples) {
        this.elementsByAstNodeId[examples.id] = {
            tags: examples.tags.map((tag) => tag.name),
            keyword: examples.keyword,
            name: examples.name,
            line: examples.location.line,
            column: examples.location.column
        }

        examples.tableBody.forEach((tableRow, index) => {
            this.elementsByAstNodeId[tableRow.id] = {
                tags: [],
                name: `row ${index + 1}`,
                line: tableRow.location.line,
                column: tableRow.location.column
            }
        });
    }

    indexRuleByAstNodeId(rule: Rule) {

        this.elementsByAstNodeId[rule.id] = {
            tags: rule.tags.map((tag) => tag.name),
            keyword: rule.keyword,
            name: rule.name,
            line: rule.location.line,
            column: rule.location.column
        }

        rule.children.forEach((child) => {
            if (child.background) {
                this.indexBackgroundByAstNodeId(child.background);
            } else if (child.scenario) {
                this.indexScenarioByAstNodeId(child.scenario);
            }
        });
    }

    indexBackgroundByAstNodeId(background: Background) {
        this.elementsByAstNodeId[background.id] = {
            tags: [],
            keyword: background.keyword,
            name: background.name,
            line: background.location.line,
            column: background.location.column
        }

        background.steps.forEach((step) => {
            this.elementsByAstNodeId[step.id] = {
                tags: [],
                keyword: step.keyword,
                name: step.text,
                line: step.location.line,
                column: step.location.column
            }
        });
    }

    indexScenarioByAstNodeId(scenario: Scenario) {
        this.elementsByAstNodeId[scenario.id] = {
            tags: scenario.tags.map((tag) => tag.name),
            keyword: scenario.keyword,
            name: scenario.name,
            line: scenario.location.line,
            column: scenario.location.column
        }

        scenario.steps.forEach((step) => {
            this.elementsByAstNodeId[step.id] = {
                tags: [],
                keyword: step.keyword,
                name: step.text,
                line: step.location.line,
                column: step.location.column
            }
        });

        scenario.examples.forEach((examples) => {
            this.indexExamplesByAstNodeId(examples);
        });
    }

    formatTags(tags: string[] | undefined) {
        const tagString = (tags ?? []).join(' ');
        return tagString.length > 0 ? `${tagString} ` : '';
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

    }


    onTestCaseStarted(testCaseStarted: TestCaseStarted) {
        const pickleId = this.testCases[testCaseStarted.testCaseId].pickleId;
        const scenario = this.scenarios[pickleId];
        const tags = scenario.tags.map((tag) => tag.name);
        const scenarioContent = scenario.astNodeIds.flatMap((astNodeId) =>
            this.elementsByAstNodeId[astNodeId]
        )[0];
        setScenario(`${this.formatTags(scenarioContent.tags)}${scenarioContent.keyword}: ${scenarioContent.name} (@ ${this.currentDocument?.uri}:${scenarioContent.line}:${scenarioContent.column})`);
    }

    onTestStepStarted(testStepStarted: TestStepStarted) {
        const testStepId = testStepStarted.testStepId;
        const pickleStepId = this.testSteps[testStepId].pickleStepId;
        if (pickleStepId) {
            const pickleStep = this.steps[pickleStepId];
            const stepContent = pickleStep.astNodeIds.map((astNodeId) => this.elementsByAstNodeId[astNodeId])[0];
            setCurrentStepText(`${stepContent.keyword}${stepContent.name} (@ ${this.currentDocument?.uri}:${stepContent.line}:${stepContent.column})`);
        }
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
    onTestRunFinished(/*testRunFinished: TestRunFinished*/) {
        //console.dir({ features: orderedDocuments }, { depth: 10 });
    }

    /**********END CUCUMBER MESSAGES HANDLING*******/


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

