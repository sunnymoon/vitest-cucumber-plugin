import { afterEach, beforeEach } from 'node:test';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getCurrentSuite, createTaskCollector } from 'vitest/suite';

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

const beforeTest = labeledCreateTaskCollector("Before");
const afterTest = labeledCreateTaskCollector("After");

beforeAll(() => {
    console.log("beforeAll Unit Tests");
});


beforeEach(() => {
    console.log("beforeEach Unit Tests");
});


let cebolas = 10;

const myTest = test.extend({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cebolas: async ({ task }, use) => {
        ++cebolas;
        await use(cebolas);
    }
});

describe('Unit Tests Suite #1', () => {

    beforeTest("beforeTest Some test", () => {
        console.log("beforeTest Some test");
    });

    myTest('Some test', ({ cebolas, task }) => {
        console.dir(task);
        console.log("Some test " + cebolas);
        expect(1).toBe(1);
    });

    afterTest("afterTest Some test", () => {
        console.log("afterTest Some test");
    });
    beforeTest("beforeTest Some other test", () => {
        console.log("beforeTest Some other test");
    });
    myTest('Some other test', ({ cebolas }) => {
        console.log("Some other test " + cebolas);
        expect(2).toBe(2);
    });

    afterTest("afterTest Some other test", () => {
        console.log("afterTest Some other test");
    });
});

afterEach(() => {
    console.log("afterEach Unit Tests");
});


afterAll(() => {
    console.log("afterAll Unit Tests");
});

