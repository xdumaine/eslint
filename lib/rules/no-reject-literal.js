/**
 * @fileoverview restrict values that can be used as Promise rejection reasons
 * @author Teddy Katz
 */
"use strict";

const astUtils = require("../ast-utils");

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "disallow using literals as Promise rejection reasons",
            category: "Best Practices",
            recommended: false
        },
        fixable: null,
        schema: []
    },

    create(context) {

        const resolveRejectFuncs = new WeakSet();
        const rejectFuncIdentifiers = new WeakSet();

        //----------------------------------------------------------------------
        // Helpers
        //----------------------------------------------------------------------

        /**
        * Checks the argument of a reject() or Promise.reject() CallExpression, and reports it if it can't be an Error
        * @param {ASTNode} callExpression A CallExpression node which is used to reject a Promise
        * @returns {void}
        */
        function checkRejectedLiteral(callExpression) {
            if (
                !callExpression.arguments.length ||
                !astUtils.couldBeError(callExpression.arguments[0]) ||
                callExpression.arguments[0].type === "Identifier" && callExpression.arguments[0].name === "undefined"
            ) {
                context.report({
                    node: callExpression,
                    message: "Expected the Promise rejection reason to be an Error."
                });
            }
        }

        /**
        * Checks references to the `reject` argument in a resolveRejectFunc, which is a function(resolve, reject) { }) that was passed
        * as an argument to the Promise constructor.
        * @param {ASTNode} node The `FunctionExpression` or `ArrowFunctionExpression` node that was passed
        * as an argument to the Promise constructor. This function must have at least two parameters, and the second parameter
        * must be an `Identifier` (i.e. no destructuring). Also, this must be the node that is currently being traversed.
        * @returns {void}
        */
        function checkResolveRejectFunc(node) {
            if (resolveRejectFuncs.has(node)) {

                // Get all variables in the function's scope.
                context.getScope().variables

                    /*
                    * Find the first variable that matches the second parameter's name.
                    * If the first parameter has the same name as the second parameter, then the variable will actually
                    * be "declared" when the first parameter is evaluated, but then it will be immediately overwritten
                    * by the second parameter. It's not possible for an expression with the variable to be evaluated before
                    * the variable is overwritten, because functions with duplicate parameters cannot have destructuring or
                    * default assignments in their parameter lists. Therefore, it's not necessary to explicitly account for
                    * this case.
                    */
                    .find(variable => variable.name === node.params[1].name)

                    // Get all references to the second parameter that read its value.
                    .references.filter(ref => ref.isRead())

                    /*
                    * Add the identifier for each reference to a `rejectFuncIdentifiers` set. If this identifier is
                    * part of a CallExpression with something like `reject(5)`, then the argument will be checked
                    * when the CallExpression is traversed.
                    */
                    .forEach(ref => rejectFuncIdentifiers.add(ref.identifier));
            }
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {

            CallExpression(node) {
                if (

                    // Check `Promise.reject(value)` calls
                    node.callee.type === "MemberExpression" &&
                    node.callee.object.type === "Identifier" && node.callee.object.name === "Promise" &&
                    node.callee.property.type === "Identifier" && node.callee.property.name === "reject" ||

                    // Also, check any `reject(value)` calls (where `reject` is the second parameter of a Promise constructor argument)
                    rejectFuncIdentifiers.has(node.callee)
                ) {
                    checkRejectedLiteral(node);
                }
            },

            NewExpression(node) {
                if (

                    // Check for `new Promise((resolve, reject) => {})`, and mark the function argument to be checked for `reject` calls
                    node.callee.type === "Identifier" && node.callee.name === "Promise" &&
                    node.arguments.length && astUtils.isFunction(node.arguments[0]) &&
                    node.arguments[0].params.length > 1 && node.arguments[0].params[1].type === "Identifier"
                ) {
                    resolveRejectFuncs.add(node.arguments[0]);
                }
            },

            FunctionExpression: checkResolveRejectFunc,
            ArrowFunctionExpression: checkResolveRejectFunc
        };
    }
};
