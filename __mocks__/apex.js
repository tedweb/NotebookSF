// The @lwc/jest-transformer rewrites every `import method from '@salesforce/apex/...'`
// to: `variable = require('@salesforce/apex/...').default`
// So this mock must export the jest.fn() on BOTH module.exports AND .default.
const fn = jest.fn();
fn.default = fn;
module.exports = fn;
