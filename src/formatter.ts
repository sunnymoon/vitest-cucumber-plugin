import { Formatter, IFormatterOptions } from '@cucumber/cucumber';
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

const { setFeature, setScenario, missingStep } = globalThis.__vitestCucumberStateHelpers;


export default class SimpleFormatter extends Formatter {



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

    onTestRunFinished(/*testRunFinished: TestRunFinished*/) {
        //ignore - set at the runner
    }

    constructor(options: IFormatterOptions) {
        super(options);

        options.eventBroadcaster.on('envelope', (envelope: Envelope) => {

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
        })
    }



}