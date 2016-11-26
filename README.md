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

### Benchmarks

You can run benchmarks yourself by running `node benchmark.js`

Test | buffer | normal arrays
------------ | ------------- | -------------
write bit | 2,861 ops/sec | 115,299 ops/sec
write and read bit | 1,653 ops/sec | 98,280 ops/sec
read and write while growing | 150 ops/sec | 314 ops/sec
write zeros | 799 ops/sec | 1,863 ops/sec

I/O for ring buffer is much slower than normal arrays in most cases.  So wouldn't recommend it for high throughput tasks.  Performance might be able to be improved by batching writes using normal arrays.  The main advantage of the buffer is to use minimal memory.
