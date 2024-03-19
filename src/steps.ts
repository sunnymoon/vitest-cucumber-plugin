import { IWorld } from '@cucumber/cucumber';
import {
    CukesGiven,
    CukesWhen,
    CukesThen,
    CukesBeforeStep,
    CukesBefore,
    CukesBeforeAll,
    CukesAfterStep,
    CukesAfter,
    CukesAfterAll
}
    from './types.ts';

import type {
    IDefineStepGeneric,
    Feature,
    IDefineStep,
    IHookRun,
    IHookTestCaseGeneric,
    IHookTestCaseCode,
    IHookTestCaseOptions,
    IHookStepGeneric,
    IHookRunCode,
    IHookRunOptions,
    IHookStepOptions,
    IHookStepCode,
    IHookRunCodeThis,
    Hook,
    Step
} from './types.ts';

let currentStepName: string = '';

export const orderedDocuments: Feature[] = [];

let currentStepBefores: Hook[] = [];

export const setFeature = (name: string) => {

    orderedDocuments.push({
        name,
        scenarios: [],
        befores: [],
        afters: []
    });

}

export const setScenario = (name: string) => {
    orderedDocuments[orderedDocuments.length - 1].scenarios.push({
        name,
        steps: [],
        befores: [],
        afters: []
    });
}

export const setCurrentStepText = (name: string) => {
    currentStepName = name;
}


export const missingStep = (name: string) => {
    const newStep: Step = {
        name,
        missing: true,
        userCode: () => {
            throw new Error(`Step not implemented: '${name}'\n\Look for code suggestions in the console log.`);
        },
        befores: [],
        afters: []
    };
    const currentDocument = orderedDocuments[orderedDocuments.length - 1];
    const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
    if (currentStepBefores.length > 0) {
        newStep.befores = [...currentStepBefores];
        currentStepBefores=[];
    }
    currentScenario.steps.push(newStep);
}

export class PendingStepImplementationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PendingStepImplementationError';
    }
}

const StepCollector = <WorldType>(cukesCollectorFn: IDefineStepGeneric<WorldType>) => {
    return (
        pattern: Parameters<IDefineStep>[0],
        options: Parameters<IDefineStep>[1],
        code?: Parameters<IDefineStep>[2]
    ): void => {
        const oldStack = new Error().stack!;

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
        function cukeMakeBelieveStep(this: any, ...args: any[]) {
            const newStep : Step = {
                name: currentStepName,
                userCode: async () => {
                    const retVal = await realUserCodeFn.apply(this, args);
                    if (retVal === 'pending') {
                        throw new PendingStepImplementationError(`Pending step '${pattern}' @ ${realUserCodeFn.toString()}`);
                    }
                },
                befores: [...(currentStepBefores ?? [])],
                afters: []
            };
            currentStepName = '';
            const currentDocument = orderedDocuments[orderedDocuments.length - 1];
            const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
            currentStepBefores=[];
            currentScenario.steps.push(newStep);

        };
        //DON'T ASK!!!!!
        Object.defineProperty(cukeMakeBelieveStep, "length", { value: realUserCodeFn.length });

        const previousPrepareStackTrace = Error.prepareStackTrace ?? null;
        try {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = (err, callsites) => {
                    const previousStack = oldStack.substring(oldStack.indexOf('\n', oldStack.indexOf('\n') + 1));
                    return previousStack;
                }
            }
            cukesCollectorFn.apply(this,
                [pattern,
                    options,
                    cukeMakeBelieveStep]
            );
        } finally {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = previousPrepareStackTrace;
            }
        }

    };

};

export const Given = StepCollector(CukesGiven);
export const When = StepCollector(CukesWhen);
export const Then = StepCollector(CukesThen);


const HookStepCollector = (hooksCollectorFn: IHookStepGeneric, kind: "BeforeStep" | "AfterStep") => {
    return (
        options: string | IHookStepOptions | IHookStepCode,
        code?: IHookStepCode
    ): void => {
        const oldStack = new Error().stack!;

        if (typeof options === 'string') {
            options = { tags: options };
        }
        else if (typeof options === 'function') {
            code = options;
            options = {};
        }
        if (!code) {
            throw new Error(`${kind} must have a code implementation`);
        }

        const realUserCodeFn = code;

        //This is the second argument of the Given(..., here!), which is a TestStepFunction<WorldType>
        function cukeMakeBelieveStepHook(this: IWorld<any>, ...args: Parameters<typeof realUserCodeFn>) {
            const newHook = {
                kind,
                userCode: () => realUserCodeFn.apply(this, args)
            };
            const currentDocument = orderedDocuments[orderedDocuments.length - 1];
            const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
            if (kind === "BeforeStep") {
                currentStepBefores.push(newHook);
            }
            else {
                const currentStep = currentScenario.steps[currentScenario.steps.length - 1];
                currentStep.afters.push(newHook);
            }
        };
        //DON'T ASK!!!!!
        Object.defineProperty(cukeMakeBelieveStepHook, "length", { value: realUserCodeFn.length });

        const previousPrepareStackTrace = Error.prepareStackTrace ?? null;
        try {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = (err, callsites) => {
                    const previousStack = oldStack.substring(oldStack.indexOf('\n', oldStack.indexOf('\n') + 1));
                    return previousStack;
                }
            }
            hooksCollectorFn.apply(this, [options, cukeMakeBelieveStepHook]);
        } finally {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = previousPrepareStackTrace;
            }
        }

    };
};

const HookTestCaseCollector = (hooksCollectorFn: IHookTestCaseGeneric, kind: "Before" | "After") => {
    return (
        options: string | IHookTestCaseOptions | IHookTestCaseCode,
        code?: IHookTestCaseCode
    ): void => {
        const oldStack = new Error().stack!;

        if (typeof options === 'string') {
            options = { tags: options };
        }
        if (typeof options === 'function') {
            code = options;
            options = {};
        }
        if (!code) {
            throw new Error(`${kind} must have a code implementation`);
        }

        const realUserCodeFn = code;

        //This is the second argument of the Given(..., here!), which is a TestStepFunction<WorldType>
        function cukeMakeBelieveTestCaseHook(this: IWorld<any>, ...args: Parameters<typeof realUserCodeFn>) {

            const newHook = {
                kind,
                userCode: () => realUserCodeFn.apply(this, args)
            };
            const currentDocument = orderedDocuments[orderedDocuments.length - 1];
            const currentScenario = currentDocument.scenarios[currentDocument.scenarios.length - 1];
            kind === "Before" ? currentScenario.befores.push(newHook) : currentScenario.afters.push(newHook);
        };
        //DON'T ASK!!!!!
        Object.defineProperty(cukeMakeBelieveTestCaseHook, "length", { value: realUserCodeFn.length });

        const previousPrepareStackTrace = Error.prepareStackTrace ?? null;
        try {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = (err, callsites) => {
                    const previousStack = oldStack.substring(oldStack.indexOf('\n', oldStack.indexOf('\n') + 1));
                    return previousStack;
                }
            }
            hooksCollectorFn.apply(this, [options, cukeMakeBelieveTestCaseHook]);
        } finally {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = previousPrepareStackTrace;
            }
        }

    };
}

const HookRunCollector = (hooksCollectorFn: IHookRun, kind: "BeforeAll" | "AfterAll") => {

    return (
        options: IHookRunOptions | IHookRunCode,
        code?: IHookRunCode
    ): void => {

        const oldStack = new Error().stack!;
        //remember the original step code!
        if (typeof options === 'function') {
            code = options;
            options = {};
        }
        if (!code) {
            throw new Error(`${kind} must have a code implementation`);
        }

        const realUserCodeFn = code;

        //This is the second argument of the Given(..., here!), which is a TestStepFunction<WorldType>
        function cukeMakeBelieveRunHook(this: IHookRunCodeThis, ...args: Parameters<typeof realUserCodeFn>) {
            const newHook = {
                kind,
                userCode: () => realUserCodeFn.apply(this, args)
            };
            const currentDocument = orderedDocuments[orderedDocuments.length - 1];
            kind === "BeforeAll" ? currentDocument.befores.push(newHook) : currentDocument.afters.push(newHook);
        };
        //DON'T ASK!!!!!
        Object.defineProperty(cukeMakeBelieveRunHook, "length", { value: realUserCodeFn.length });

        const previousPrepareStackTrace = Error.prepareStackTrace ?? null;
        try {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = (err, callsites) => {
                    const previousStack = oldStack.substring(oldStack.indexOf('\n', oldStack.indexOf('\n') + 1));
                    return previousStack;
                }
            }
            hooksCollectorFn.apply(this, [options, cukeMakeBelieveRunHook]);
        } finally {
            if (previousPrepareStackTrace) {
                Error.prepareStackTrace = previousPrepareStackTrace;
            }
        }

    };
}

export const BeforeStep: IHookStepGeneric = HookStepCollector(CukesBeforeStep, "BeforeStep");
export const AfterStep: IHookStepGeneric = HookStepCollector(CukesAfterStep, "AfterStep");
export const Before: IHookTestCaseGeneric = HookTestCaseCollector(CukesBefore, "Before");
export const After: IHookTestCaseGeneric = HookTestCaseCollector(CukesAfter, "After");
export const BeforeAll: IHookRun = HookRunCollector(CukesBeforeAll, "BeforeAll");
export const AfterAll: IHookRun = HookRunCollector(CukesAfterAll, "AfterAll");