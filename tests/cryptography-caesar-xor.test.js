const test = require('node:test');
const assert = require('node:assert/strict');
const lab = require('../museum/cryptography-lab/caesar-xor/lab.js');
test('Caesar cipher shifts, wraps, decrypts, and preserves nonletters', () => { assert.equal(lab.caesar('ABC xyz!', 0), 'ABC xyz!'); assert.equal(lab.caesar('HELLO', 3), 'KHOOR'); assert.equal(lab.caesar('XYZ', 3), 'ABC'); assert.equal(lab.caesar('KHOOR, 123!', -3), 'HELLO, 123!'); });
test('ROT13 is an involution', () => { assert.equal(lab.rot13('HELLO'), 'URYYB'); assert.equal(lab.rot13(lab.rot13('THE MUSEUM')), 'THE MUSEUM'); });
test('substitution alphabets are unique and transform reversibly with inverse', () => { const map='QWERTYUIOPASDFGHJKLZXCVBNM'; assert.equal(lab.validAlphabet(map), true); assert.equal(lab.validAlphabet('A'.repeat(26)), false); const inverse = [...lab.ALPHABET].map(letter => lab.ALPHABET[map.indexOf(letter)]).join(''); assert.equal(lab.substitute(lab.substitute('MEET AT 9', map), inverse), 'MEET AT 9'); });
test('XOR truth and repeating-key bytes are deterministic and reversible', () => { assert.equal(0 ^ 0, 0); assert.equal(0 ^ 1, 1); assert.equal(1 ^ 0, 1); assert.equal(1 ^ 1, 0); assert.deepEqual(lab.xorBytes('HELLO','KEY'), [3,0,21,7,10]); assert.equal(lab.xorText(lab.xorText('HELLO','KEY'),'KEY'), 'HELLO'); });
