const { expect } = require('chai');

describe('Basic Test Suite', () => {
    it('should perform a simple assertion', () => {
        expect(1 + 1).to.equal(2);
    });

    it('should verify string length', () => {
        expect('hello').to.have.lengthOf(5);
    });
});