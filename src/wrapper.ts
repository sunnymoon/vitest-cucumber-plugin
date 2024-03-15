import {
    IdGenerator,
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
import { loadConfiguration, loadSupport, runCucumber } from '@cucumber/cucumber/api';
import { supportCodeLibraryBuilder } from '@cucumber/cucumber';

import { expect, it, suite } from 'vitest';

import {
    setFeature, setScenario, missingStep, orderedDocuments
} from './steps.ts';

import { Given, When, Then, BeforeStep, Before, BeforeAll, AfterStep, After, AfterAll, } from './steps.ts'


import { extname } from 'path';
import fastGlob from 'fast-glob';

import type {
    Given as StepsGiven, 
    When as StepsWhen, 
    Then as StepsThen, 
    BeforeStep as StepsBeforeStep, 
    Before as StepsBefore, 
    BeforeAll as StepsBeforeAll, 
    AfterStep as StepsAfterStep, 
    After as StepsAfter, 
    AfterAll as StepsAfterAll
} from './steps.ts';

declare global {
    var _cenas: {
        glueCode: string[];
        filepath: string;
    };
    var _cucumberHelpers: {
        Given: typeof StepsGiven,
        When: typeof StepsWhen,
        Then: typeof StepsThen,
        BeforeStep: typeof StepsBeforeStep,
        Before: typeof StepsBefore,
        BeforeAll: typeof StepsBeforeAll,
        AfterStep: typeof StepsAfterStep,
        After: typeof StepsAfter,
        AfterAll: typeof StepsAfterAll
    }
}

globalThis._cucumberHelpers = {
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

const { glueCode, filepath } = globalThis._cenas;

const scenarios: {
    [id: string]: Pickle
} = {};
const steps: {
    [id: string]: PickleStep
} = {};
const testCases: {
    [id: string]: TestCase
} = {};
const testSteps: {
    [id: string]: TestStep
} = {};

const glueCodeFiles = await fastGlob(glueCode, {
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

console.log({ CWD: process.cwd() });

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
    (await fastGlob(glueCode, {
        absolute: true,
        onlyFiles: true
    }))
        .map(
            async (importMatch) => {
                if (extname(importMatch) !== '.feature') {
                    await import(importMatch);
                }
            }
        )
);

const supportCode = supportCodeLibraryBuilder.finalize();

const { success } = await runCucumber({
    ...runConfiguration,
    support: supportCode,
},
    {},
    handleCucumberMessages
);
console.log({ cucumberSuccess: success });

for (const feature of orderedDocuments) {
    suite(feature.name, async () => {
        for (const scenario of feature.scenarios) {
            suite(scenario.name, async () => {
                for (const step of scenario.steps) {
                    it(step.pattern.toString(), async (...args) => {
                        await step.userCode.apply(args);
                    });
                }
            });
        }
    });
}


/**********CUCUMBER MESSAGES HANDLING*******/

function handleCucumberMessages(envelope: Envelope) {

    if (envelope.gherkinDocument) {
        onGherkinDocument(envelope.gherkinDocument)
    }
    //envelope<pickle> is a scenario with => pickle.id
    else if (envelope.pickle) {
        onPickle(envelope.pickle);
    }
    //envelope<testCase> has id and pickleId => scenario 
    else if (envelope.testCase) {
        onTestCase(envelope.testCase);
    }
    //envelope<testCaseStarted> has testcaseId => testCase.id
    //THEN we have test steps ;)
    else if (envelope.testCaseStarted) {
        onTestCaseStarted(envelope.testCaseStarted);
    }
    else if (envelope.testStepFinished) {
        onTestStepFinished(envelope.testStepFinished);
    }
    else if (envelope.testRunFinished) {
        onTestRunFinished();
    }
}


function onGherkinDocument(gherkinDocument: GherkinDocument) {
    if (gherkinDocument.feature) {
        setFeature(`${formatTags(gherkinDocument.feature.tags)}\n${gherkinDocument.feature.keyword}: ${gherkinDocument.feature.name} (@${gherkinDocument.uri}~${gherkinDocument.feature.location.line})`);
    }
}

function formatTags(tags: readonly Tag[]) {
    const tagString = tags.map(tag => `@${tag.name}`).join(' ');
    if (tagString.length > 0) {
        return `${tagString}\n`;
    } else {
        return '';
    }
}

function onPickle(pickle: Pickle) {
    scenarios[pickle.id] = {
        ...pickle
    }
    pickle.steps.forEach(step => {
        steps[step.id] = {
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

function onTestCase(testCase: TestCase) {
    testCases[testCase.id] = {
        ...testCase
    }
    testCase.testSteps.forEach(testStep => {
        testSteps[testStep.id] = {
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
function onTestCaseStarted(testCaseStarted: TestCaseStarted) {
    const pickleId = testCases[testCaseStarted.testCaseId].pickleId;
    const scenarioName = scenarios[pickleId].name;
    setScenario(scenarioName);
}
function onTestStepFinished(testStepFinished: TestStepFinished) {
    if (testStepFinished.testStepResult.status === TestStepResultStatus.UNDEFINED) {
        const testStepId = testStepFinished.testStepId;
        const pickleStepId = testSteps[testStepId].pickleStepId;
        if (pickleStepId) {
            const pickleStep = steps[pickleStepId];
            missingStep(pickleStep.text);
        }
    }
}
function onTestRunFinished(/*testRunFinished: TestRunFinished*/) {
    //console.dir({ features: orderedDocuments }, { depth: 10 });
}

/**********END CUCUMBER MESSAGES HANDLING*******/

