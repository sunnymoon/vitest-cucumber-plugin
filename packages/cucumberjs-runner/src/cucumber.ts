
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
    };
}

const { Given,
    When,
    Then,
    BeforeStep,
    Before,
    BeforeAll,
    AfterStep,
    After,
    AfterAll } = globalThis._cucumberHelpers;

export {
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
