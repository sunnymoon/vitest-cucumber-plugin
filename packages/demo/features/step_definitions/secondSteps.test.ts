import { When, Then } from '@linkare/vitest-cucumberjs/cucumber';

When('I press add', async function () {
    console.log('______ I press add');
});

Then('the result should be {int} on the screen', async function (int) {
    console.log('the result should be {int} on the screen');
    console.log({ int });
});