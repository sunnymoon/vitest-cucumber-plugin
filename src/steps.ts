import {
    type IDefineStepGeneric,
    type DefineStepPattern,
    type IDefineStepOptions,
    CukesGiven,
    CukesWhen,
    CukesThen,
    CukesBeforeStep,
    CukesBefore,
    CukesBeforeAll,
    CukesAfterStep,
    CukesAfter,
    CukesAfterAll,
    Feature
} from './types.js';

export const orderedDocuments: Feature[] = [];
export const setFeature = (name: string) => {

    orderedDocuments.push({
        name,
        scenarios: []
    });

}

export const setScenario = (name: string) => {
    orderedDocuments[orderedDocuments.length - 1].scenarios.push({
        name,
        steps: []
    });
}

export const missingStep = (pattern: string) => {
    const newStep = {
        pattern,
        todo: true,
        userCode: () => {
            throw new Error(`Step not implemented: '${pattern}'\n\Look for code suggestions in the console log.`);
        }
    };
    const currentDocument = orderedDocuments[orderedDocuments.length - 1];
    const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
    currentScenario.steps.push(newStep);
}

class PendingStepImplementationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PendingStepImplementationError';
    }
}

const StepCollector = <WorldType>(cukesCollectorFn: IDefineStepGeneric<WorldType>) => {
    return (
        pattern: DefineStepPattern,
        options: IDefineStepOptions | Function,
        code?: Function
    ): void => {
        //remember the original step code!
        if (typeof options === 'function') {
            code = options;
            options = {};
        }
        if (!code) {
            throw new Error(`Step ${pattern} must have a code implementation`);
        }

        const realUserCodeFn = code;
        //This is the second argument of the Given(..., here!), which is a TestStepFunction<WorldType>
        const cukeMakeBelieveStep=(...args: any[])=> {
            const newStep = {
                pattern,
                userCode: async () => {
                    const retVal = await realUserCodeFn(args);
                    if (retVal === 'pending') {
                        throw new PendingStepImplementationError(`Pending step '${pattern}' @ ${realUserCodeFn.toString()}`);
                    }
                }
            };
            const currentDocument = orderedDocuments[orderedDocuments.length - 1];
            const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
            currentScenario.steps.push(newStep);
           
        };
        //DON'T ASK!!!!!
        Object.defineProperty(cukeMakeBelieveStep, "length", { value: realUserCodeFn.length });

        cukesCollectorFn(
            pattern,
            options,
            cukeMakeBelieveStep
        );

    };

};

export const Given = StepCollector(CukesGiven);
export const When = StepCollector(CukesWhen);
export const Then = StepCollector(CukesThen);


type HookStepType = typeof CukesBeforeStep;
const HookStepCollector = (hooksCollectorFn: HookStepType) => {
    return hooksCollectorFn
};

type HookTestCaseType = typeof CukesBefore;
const HookTestCaseCollector = (hooksCollectorFn: HookTestCaseType) => {
    return hooksCollectorFn;
}

type HookRunType = typeof CukesBeforeAll;
const HookRunCollector = (hooksCollectorFn: HookRunType) => {
    return hooksCollectorFn;
}


export const BeforeStep: typeof CukesBeforeStep = HookStepCollector(CukesBeforeStep);
export const AfterStep: typeof CukesAfterStep = HookStepCollector(CukesAfterStep);
export const Before: typeof CukesBefore = HookTestCaseCollector(CukesBefore);
export const After: typeof CukesAfter = HookTestCaseCollector(CukesAfter);
export const BeforeAll: typeof CukesBeforeAll = HookRunCollector(CukesBeforeAll);
export const AfterAll: typeof CukesAfterAll = HookRunCollector(CukesAfterAll);