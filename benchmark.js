const Benchmark = require('benchmark');
const BinaryRingBuffer = require('./src/BinaryRingBuffer.js');
let suite = new Benchmark.Suite;

suite.add('write#buffer', function() {
    let buf = new BinaryRingBuffer();
    for (let i = 0; i < 1e3; i++) {
        buf.writeBits(1, 1);
    }
})
.add('write#array', function() {
    let array = [];
    for (let i = 0; i < 1e3; i++) {
        array.push(1);
    }
})
.add('writeRead#buffer', function() {
    let buf = new BinaryRingBuffer();
    for (let i = 0; i < 1e3; i++) {
        buf.writeBits(1, 1);
        buf.readBits(1);
    }
})
.add('writeRead#array', function() {
    let array = [];
    for (let i = 0; i < 1e3; i++) {
        array.push(1);
        array.shift();
    }
})
.add('writeReadGrowing#buffer', function() {
    let buf = new BinaryRingBuffer();
    for (let i = 0; i < 1e4; i++) {
        buf.writeBits(6, 4);
        buf.readBits(2);
    }
})
.add('writeReadGrowing#array', function() {
    let array = [];
    for (let i = 0; i < 1e4; i++) {
        array.push(0);
        array.push(1);
        array.push(1);
        array.push(0);
        array.shift();
        array.shift();
    }
})
.add('writeZeros#buffer', function() {
    let buf = new BinaryRingBuffer();
    for (let i = 0; i < 1e3; i++) {
        buf.writeBits(0, 64);
    }
})
.add('writeZeros#array', function() {
    let array = [];
    for (let i = 0; i < 1e3 * 64; i++) {
        array.push(0);
    }
})
// add listeners
.on('cycle', function(event) {
  console.log(String(event.target));
})
.run();
