import {spawnSync} from "child_process";
import allureReporter from '@wdio/allure-reporter';
import {Test, TestResult} from "@wdio/types/build/Frameworks";
import * as fs from "fs";

export const config: WebdriverIO.Config  = {
    runner: 'local',
    specs: ['./test/specs/*.ts'],
    maxInstances: 1,
    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: 'tsconfig.json',
        },
    },
    capabilities: [
        {
            maxInstances: 1,
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: [
                    // remove '--headless' to watch how test is executed in browser
                    ...(process.argv.includes('--show_browser')
                        ? []
                        : ['--no-sandbox', '--disable-gpu']),
                    '--window-size=1920,1080',
                    '--lang=en',
                    '--disable-dev-shm-usage',
                ]
            }
        },
    ],
    logLevel: 'error',
    bail: 0,
    waitforTimeout: 1000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,
    services: ['chromedriver'],
    framework: 'jasmine',
    reporters: [
        [
            'allure',
            {
                outputDir: './reports/allure-results',
                disableWebdriverStepsReporting: true,
                disableWebdriverScreenshotsReporting: true,
                useCucumberStepReporter: false,
                disableMochaHooks: true,
                addConsoleLogs: true,
            },
        ],
    ],
    jasmineOpts: {
        defaultTimeoutInterval: 100000,
    },
    async onComplete(): Promise<void> {
        const allureCmd = process.platform === 'win32' ? 'allure.cmd' : 'allure';
        console.log('Generating Allure report');

        const generateReport = spawnSync(
            allureCmd,
            ['generate', './reports/allure-results', '-o', './reports/allure-report', '--clean'],
            { encoding: 'utf8' }
        );

        if (generateReport.status === 0) {
            if (
                fs.existsSync('./reports/allure-report/history') &&
                !fs.existsSync('./reports/allure-report/history')
            ) {
                fs.mkdirSync('./reports/allure-report/history');
            }

            if (
                fs.existsSync('./reports/allure-results/') &&
                !fs.existsSync('./reports/allure-results/history')
            ) {
                fs.mkdirSync('./reports/allure-results/history');
            }

            try {
                fs.cpSync('./reports/allure-report/history', './reports/allure-results/history', {
                    recursive: true,
                });
            } catch (err) {
                console.log(err);
            }

            console.log('Generating report completed.');

            if (process.argv.includes('--serve_report')) {
                console.log('Serving report at http://localhost:9000. Pres Crtl+C to exit.');
                spawnSync(
                    allureCmd,
                    ['open', './reports/allure-report', '-h', 'localhost', '-p', '9000'],
                    { encoding: 'utf8' }
                );
            }
        } else if (generateReport.error) {
            console.error('Generating report failed: ', generateReport.error);
        } else {
            console.log('Generating report failed:', generateReport.stderr);
        }
    },
    async beforeTest(_test): Promise<void> {
        await browser.reloadSession();
        await browser.maximizeWindow();
    },
    async afterTest(test: Test, _context, result: TestResult): Promise<void> {
        if (result.error || test['failedExpectations'].length > 0) {
            await browser.takeScreenshot().then((screen) => {
                const attachment = Buffer.from(screen, 'base64');
                const date = new Date().toISOString().replace(/(\.|:)/gm, '_');
                allureReporter.addAttachment(`screenshot_${date}`, attachment, 'image/png');
            });
        }
    },
    async after(): Promise<void> {
        if (browser) {
            await browser.closeWindow();
            await browser.deleteSession();
        }
    },
}