import { createTaskCollector, getCurrentSuite } from 'vitest/suite'

import { describe, test } from 'vitest';

const labeledCreateTaskCollector = (kind: "Before" | "After") => {
    return createTaskCollector(function (name, handler, timeout) {
        console.log("beforeTest");
        getCurrentSuite().task(name, {
            meta: {
                kind
            },
            handler,
            timeout,
        });
    });
}

const beforeScenario = labeledCreateTaskCollector("Before");
const afterScenario = labeledCreateTaskCollector("After");
const featureToVitest = describe;
const scenarioToVitest = describe;
const stepToVitest = test;

// const beforeScenario = test;
// const afterScenario = test;
export { afterScenario, beforeScenario, featureToVitest, scenarioToVitest, stepToVitest };


