const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver'],
    moduleNameMapper: {
        // Map every @salesforce/apex/* import to a generic jest.fn() mock
        '^@salesforce/apex/(.+)$': '<rootDir>/__mocks__/apex.js',
        ...jestConfig.moduleNameMapper,
    },
};
