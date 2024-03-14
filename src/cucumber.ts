import type { VitestCucumber } from "./runner.js";

declare global {
    var __vitestCucumberStateHelpers: VitestCucumber;
}

const { Given, When, Then,
    BeforeStep, Before, BeforeAll,
    AfterStep, After, AfterAll } = globalThis.__vitestCucumberStateHelpers;

export {
    Given,
    When ,
    Then,
    BeforeStep,
    Before,
    BeforeAll,
    AfterStep,
    After,
    AfterAll  
};
