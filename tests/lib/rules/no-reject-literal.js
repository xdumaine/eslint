/**
 * @fileoverview restrict values that can be used as Promise rejection reasons
 * @author Teddy Katz
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-reject-literal");
const RuleTester = require("../../../lib/testers/rule-tester");


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 8 } });

ruleTester.run("no-reject-literal", rule, {

    valid: [
        "Promise.resolve(5)",
        "Foo.reject(5)",
        "Promise.reject(foo)",
        "Promise.reject(foo.bar)",
        "Promise.reject(foo.bar())",
        "Promise.reject(new Error())",
        "Promise.reject(new TypeError)",
        "Promise.reject(new Error('foo'))",
        "new Foo((resolve, reject) => reject(5))",
        "new Promise(function(resolve, reject) { return function(reject) { reject(5) } })",
        "new Promise(function(resolve, reject) { if (foo) { const reject = somethingElse; reject(5) } })",
        "new Promise(function(resolve, {apply}) { apply(5) })",
        "new Promise(function(resolve, reject) { resolve(5, reject) })",
        "async function foo() { Promise.reject(await foo); }"
    ],

    invalid: [
        "Promise.reject(5)",
        "Promise.reject('foo')",
        "Promise.reject(`foo`)",
        "Promise.reject(!foo)",
        "Promise.reject(void foo)",
        "Promise.reject()",
        "Promise.reject(undefined)",
        "Promise.reject('foo', somethingElse)",
        "new Promise(function(resolve, reject) { reject(5) })",
        "new Promise((resolve, reject) => { reject(5) })",
        "new Promise((resolve, reject) => reject(5))",
        "new Promise((resolve, reject) => reject())",
        "new Promise(function(yes, no) { no(5) })",
        `
          new Promise((resolve, reject) => {
            fs.readFile('foo.txt', (err, file) => {
              if (err) reject('File not found')
              else resolve(file)
            })
          })
        `,
        "new Promise(({foo, bar, baz}, reject) => reject(5))",
        "new Promise(function(reject, reject) { reject(5) })",
        "new Promise(function(foo, arguments) { arguments(5) })",
        "new Promise((foo, arguments) => arguments(5))",
        "new Promise(function({}, reject) { reject(5) })",
        "new Promise(({}, reject) => reject(5))",
        "new Promise((resolve, reject, somethingElse = reject(5)) => {})"
    ].map(code => ({code, errors: [{ message: "Expected the Promise rejection reason to be an Error.", type: "CallExpression" }]}))
});
