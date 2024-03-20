/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-rest-params */

import { Given, BeforeAll, Before, BeforeStep, AfterAll, After, AfterStep   } from '@linkare/vitest-cucumberjs/cucumber';
// import { expect } from 'vitest';

BeforeAll({}, async function(){
     //this is a World object with "parameters" object 
    this.parameters.beforeall="beforeall";
    console.log('BeforeAll', {this:this, arguments:arguments});
});

AfterAll({}, async function(){
     //this is a World object with "parameters" object 
     this.parameters.afterall="afterall";
    console.log('AfterAll', {this:this, arguments:arguments});
});

Before({}, async function({gherkinDocument,pickle, testCaseStartedId}){
    //this is a World object with "attach", "log" methods and "parameters" object 
    // this.log("Before");
    // this.attach("Cenas");
    this.parameters.before="before";
    console.log('Before', {this:this, arguments:arguments});
});

After({}, async function({gherkinDocument,pickle, testCaseStartedId, result, willBeRetried}){
    //this is a World object with "attach", "log" methods and "parameters" object 
    // this.log("Before");
    this.parameters.after="after";
    console.log('After', {this:this, arguments:arguments});
});

BeforeStep({}, async function({gherkinDocument,pickle, pickleStep, testCaseStartedId, testStepId, result}){
    //this is a World object with "attach", "log" methods and "parameters" object
    this.parameters.beforestep="beforestep";
    console.log('BeforeStep', {this:this, arguments:arguments});
});

AfterStep({}, async function({gherkinDocument,pickle, pickleStep, testCaseStartedId, testStepId, result}){
    //this is a World object with "attach", "log" methods and "parameters" object
    this.parameters.afterstep="afterstep";
    console.log('AfterStep', {this:this, arguments:arguments});
});

Given('I have entered {int} into the calculator', async function (int) {
    //expect(int).toBe(40);
    console.log('I have entered {int} into the calculator');
    console.log({ int });
});

Given('I have entered {int} secondly into the calculator', async function (int) {
    console.log('I have entered {int} secondly into the calculator');
    console.log({ int });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // return 'pending';
});