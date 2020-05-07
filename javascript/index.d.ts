// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import Assert from 'base/test/assert.js';
import Server from './server.js';

import 'base/index.d.ts';
import 'base/test/index.d.ts';

declare global {
    // Global functions provided by PlaygroundJS.
    function addEventListener(eventName: string, listener: Function): void;
    function captureProfile(duration: number, filename: string): void;
    function clearModuleCache(filenamePrefix: string): void;
    function dispatchEvent(eventName: string, event?: any): void;
    function frameCounter(): { duration: number; fps: number };
    function glob(base: string, pattern: string): Array<string>;
    function hasEventListener(eventName: string, listener: Function): boolean;
    function highResolutionTime(): number;
    function isPlayerMinimized(playerId: number): boolean;
    function killServer(): void;
    function notifyReady(): void;
    function pawnInvoke(native: string, signature?: string, ...parameters: any): any;
    function provideNative(native: string, signature: string, handler: Function): void;
    function readFile(filename: string): string;
    function removeEventListener(eventName: string, listener: Function): void;
    function reportTestsFinished(totalTests: number, failedTests: number): void;
    function require(specifier: string): any;
    function startTrace();
    function stopTrace(filename?: string);
    function wait(milliseconds: number): Promise<void>;

    interface Console {
        log(...parameters: any): void;
    }

    const console: Console;
    let server: Server;

    // ---------------------------------------------------------------------------------------------
    // Test infrastructure
    // ---------------------------------------------------------------------------------------------

    type TestCaseFunction = (assert: Assert) => any;
    type TestCaseDefinition = (description: string, testCase: TestCaseFunction) => void;
    type TestSuiteFunction =
        (it: TestCaseDefinition, beforeEach: TestCaseFunction, afterEach: TestCaseFunction) => void;

    function describe(what: string, populateFn: TestSuiteFunction);
}

export { };
