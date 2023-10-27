import { step } from '@wdio/allure-reporter';
import { expect } from "expect-webdriverio";

describe('Suite', () => {
    it('should fail step', async () => {
        await browser.url("https://www.sicpdistilled.com/")
        await step('find something that doesnt exist', async () => {
            await expect($('#foobar')).toBeExisting();
        });
    });
});