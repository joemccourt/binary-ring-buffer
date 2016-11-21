## Binary Ring Buffer [![Build Status](https://travis-ci.org/joemccourt/binary-ring-buffer.svg?branch=master)](https://travis-ci.org/joemccourt/binary-ring-buffer) [![Coverage Status](https://coveralls.io/repos/github/joemccourt/binary-ring-buffer/badge.svg?branch=master)](https://coveralls.io/github/joemccourt/binary-ring-buffer?branch=master)

Abstraction over JS ArrayBuffer.  This provides an easy and space efficient way to write and read individual bits.

### API
 * `writeBits(value, numberOfBits)` Writes a value into the buffer.  Values are expected to be positive integers and less than `2^numberOfBits`, no guarantees what will happen otherwise.  Only accurate up to 53 bits at a time.  Values are padded left with zeros, e.g. `writeBits(3, 5)` will write `00011`.

 * `readBits(numberOfBits)` Read number of bits and return as a number.  Exact up to 53 bits, accurate past it, but precision decaying as double floating point number does.

 * `peakBits(numberOfBits)` Read bits without advancing the read position.

 * `clear` Reset the buffer.


### Example Write / Read individual bits

```
const BinaryRingBuffer = require('binary-ring-buffer');
let buf = new BinaryRingBuffer();
buf.writeBits(1, 1); // 1
buf.writeBits(0, 2); // 100
buf.writeBits(1, 1); // 1001
console.log(buf.readBits(4)); // '9'
```

## Installation
`npm i binary-ring-buffer`

### TODO
 * Safety checks for input values
 * Clamp reading up to write position, returning padded zeros.
 * Make writeBits accurate past 53 bits
 * Add benchmarks
