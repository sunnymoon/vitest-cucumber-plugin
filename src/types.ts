import {
    Given,
    When,
    Then,
    BeforeStep,
    AfterStep,
    Before,
    After,
    BeforeAll,
    AfterAll
} from '@cucumber/cucumber';

export type IDefineStep = typeof Given;
export type IDefineStepGeneric<WorldType> = typeof Given<WorldType>;

export type DefineStepPattern = Parameters<IDefineStep>[0];
export type IDefineStepOptions = Parameters<IDefineStep>[1];

export type Step = { pattern: DefineStepPattern, todo?: boolean, skip?: boolean, userCode: Function }
export type Scenario = { name: string, steps: Step[] };
export type Feature = { name: string, scenarios: Scenario[] };

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