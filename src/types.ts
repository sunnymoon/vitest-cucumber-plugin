import {
    Given,
    When,
    Then,
    BeforeStep,
    AfterStep,
    Before,
    After,
    BeforeAll,
    AfterAll,
    IWorld
} from '@cucumber/cucumber';

export type IDefineStep = typeof Given;
export type IDefineStepGeneric<WorldType> = typeof Given<WorldType>;

export type DefineStepPattern = Parameters<IDefineStep>[0];
export type IDefineStepOptions = Parameters<IDefineStep>[1];


export type IHookStep = typeof BeforeStep;
export type IHookStepGeneric<T=IWorld<any>> = typeof BeforeStep<T>;
export type IHookStepOptions<T=IWorld<any>> = Parameters<IHookStepGeneric<T>>[0];
export type IHookStepCode<T=IWorld<any>> = Parameters<IHookStepGeneric<T>>[1];

export type IHookTestCase = typeof Before;
export type IHookTestCaseGeneric<T=IWorld<any>> = typeof Before<T>;
export type IHookTestCaseOptions<T=IWorld<any>> = Parameters<IHookTestCaseGeneric<T>>[0];
export type IHookTestCaseCode<T=IWorld<any>> = Parameters<IHookTestCaseGeneric<T>>[1];

export type IHookRun = typeof BeforeAll;
export type IHookRunOptions = Parameters<IHookRun>[0];
export type IHookRunCode = Parameters<IHookRun>[1];
export type IHookRunCodeThis=ThisParameterType<IHookRunCode>;

export type Hook = { 
    kind: string, 
    userCode: Function 
};

export type Step = { 
    name: string, 
    missing?: boolean, 
    userCode: Function 
    befores: Hook[],
    afters: Hook[]
};

export type Scenario = { 
    name: string, 
    steps: Step[] 
    befores: Hook[],
    afters: Hook[]
};
export type Feature = { 
    name: string, 
    scenarios: Scenario[] 
    befores: Hook[],
    afters: Hook[]
};

export {
    Given as CukesGiven,
    When as CukesWhen,
    Then as CukesThen,
    BeforeStep as CukesBeforeStep,
    AfterStep as CukesAfterStep,
    Before as CukesBefore,
    After as CukesAfter,
    BeforeAll as CukesBeforeAll,
    AfterAll as CukesAfterAll
};