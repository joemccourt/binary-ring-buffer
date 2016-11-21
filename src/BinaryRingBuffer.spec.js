const BinaryRingBuffer = require('./BinaryRingBuffer');

describe('Binary ring buffer reading and writing', function () {
    it('simple byte write and read', function () {
        let buf = new BinaryRingBuffer();
        let expected = [3, 95, 0, 255, 9, 64];

        expected.forEach(v => {
            buf.writeBits(v, 8);
            expect(buf.readBits(8)).toEqual(v);
        });
    });

    it('simple bits write and read', function () {
        let buf = new BinaryRingBuffer();
        let expected = [[3, 3], [1, 3], [250, 8], [1, 1], [63, 6], [7, 5], [3, 3]];

        expected.forEach(v => {
            buf.writeBits(v[0], v[1]);
            expect(buf.readBits(v[1])).toEqual(v[0]);
        });
    });

    it('larger than one byte write and read', function () {
        let buf = new BinaryRingBuffer();
        let expected = [[38, 6], [0, 2], [1023, 10], [255, 8], [0, 17], [10, 4], [256, 9]];

        expected.forEach(v => {
            buf.writeBits(v[0], v[1]);
            expect(buf.readBits(v[1])).toEqual(v[0]);
        });
    });

    it('read multiple writes', function () {
        let buf = new BinaryRingBuffer();
        buf.writeBits(1, 1);
        buf.writeBits(0, 1);
        buf.writeBits(1, 1);
        buf.writeBits(0, 1);
        expect(buf.readBits(4)).toEqual(10);

        buf.writeBits(15, 4);
        buf.writeBits(15, 4);
        expect(buf.readBits(8)).toEqual(255);

        buf.writeBits(0, 4);
        buf.writeBits(15, 4);
        buf.writeBits(15, 4);
        expect(buf.readBits(12)).toEqual(255);
    });

    it('read over multiple full bytes', function () {
        let buf = new BinaryRingBuffer();
        buf.writeBits(6, 3);
        buf.readBits(3);
        buf.writeBits((1 << 16) - 1, 16);
        buf.writeBits((1 << 16) - 1, 16);
        expect(buf.readBits(30)).toEqual((1 << 30) - 1);
    });

    it('capacity is the same after many reads and writes', function () {
        let buf = new BinaryRingBuffer();
        let cap0 = buf.cap;
        let bitsPerOp = 3;
        let bits = 1000;
        while (bits > 0) {
            buf.writeBits(5, bitsPerOp);
            let readValue = buf.readBits(bitsPerOp);
            expect(readValue).toEqual(5);
            bits -= bitsPerOp;
        }
        expect(buf.size()).toEqual(0);
        expect(buf.cap).toEqual(cap0);
    });

    it('wrap around does not alter written values', function () {
        let buf = new BinaryRingBuffer(1);
        buf.writeBits(0, 2);
        buf.readBits(2);
        buf.writeBits(127, 7);
        expect(buf.readBits(7)).toEqual(127);
        buf.writeBits(255, 8);
        expect(buf.readBits(8)).toEqual(255);
        buf.writeBits(5, 3);
        buf.writeBits(5, 3);
        expect(buf.readBits(6)).toEqual(45);
    });

    it('can dynamically increase size', function () {
        let buf = new BinaryRingBuffer(1);
        buf.writeBits(0, 8 * 1024);

        buf = new BinaryRingBuffer(1);
        buf.writeBits(1, 3);
        buf.writeBits(1, 3);
        expect(buf.readBits(3)).toEqual(1);
        buf.writeBits(1, 3);
        buf.writeBits(1, 3);
        expect(buf.readBits(3)).toEqual(1);
        buf.writeBits(1, 3);
        expect(buf.readBits(3)).toEqual(1);
        expect(buf.readBits(3)).toEqual(1);

        buf = new BinaryRingBuffer(1);
        let array = [];
        for (let i = 0; i < 1000; i++) {
            let d = Math.random() * 8 | 0;
            array.push(d);
            array.push(d);
            buf.writeBits(d, 3);
            buf.writeBits(d, 3);
            let v = buf.readBits(3);
            expect(v).toEqual(array.shift());
        }
    });

    it('read 16 bit int', function () {
        let buf = new BinaryRingBuffer();
        buf.writeBits(0, 3);
        buf.readBits(3);

        buf.writeBits(Math.pow(2, 16) - 1, 16);
        expect(buf.readBits(16)).toEqual(Math.pow(2, 16) - 1);
    });


    it('read 32 bit int', function () {
        let buf = new BinaryRingBuffer();
        buf.writeBits(0, 3);
        buf.readBits(3);

        buf.writeBits(Math.pow(2, 32) - 1, 32);
        expect(buf.readBits(32)).toEqual(Math.pow(2, 32) - 1);
    });

    it('read 64 bit int', function () {
        let buf = new BinaryRingBuffer();
        buf.writeBits(0, 5);
        buf.readBits(5);


        // TODO: support accurate writing past 53 bits
        // buf.writeBits(Math.pow(2, 64) - 1, 64);
        buf.writeBits(1023, 10);
        buf.writeBits(1023, 10);
        buf.writeBits(1023, 10);
        buf.writeBits(1023, 10);
        buf.writeBits(1023, 10);
        buf.writeBits(1023, 10);
        buf.writeBits(15, 4);

        // Note we lose precision here but not accuracy
        expect(buf.readBits(64)).toEqual(Math.pow(2, 64));
    });
});

describe('Buffer clear', function () {
    it('does do not grow at all when clearing', function () {
        buf = new BinaryRingBuffer(1);
        let array = [];
        for (let i = 0; i < 1000; i++) {
            let d = Math.floor(Math.random() * 32);
            buf.writeBits(d, 5);
            expect(buf.size()).toEqual(5);
            buf.clear();
            expect(buf.size()).toEqual(0);
            expect(buf.cap).toEqual(8);
        }
    });
});

describe('Peak read', function () {
    it('peak does not move', function () {
        // write 0xFF00
        let buf = new BinaryRingBuffer(2);
        buf.writeBits(255, 8);
        buf.writeBits(0, 8);

        // Peak first 6 bits
        expect(buf.peakBits(6)).toEqual(63);
        let view = buf.viewArray();
        expect(view.cursors).toEqual('R0000000,00000000');

        // Read should have same result
        expect(buf.readBits(6)).toEqual(63);
        view = buf.viewArray();
        expect(view.cursors).toEqual('W00000R0,00000000');

        // now moved
        expect(buf.peakBits(3)).toEqual(6);
        view = buf.viewArray();
        expect(view.cursors).toEqual('W00000R0,00000000');
    });
});

describe('View array helper', function () {
    it('all ones in a single byte', function () {
        let buf = new BinaryRingBuffer(1);
        buf.writeBits(255, 8);
        let view = buf.viewArray();
        expect(view.array).toEqual('11111111');
        expect(view.cursors).toEqual('R0000000');
    });
    it('multiple bytes and different R/W cursors', function () {
        let buf = new BinaryRingBuffer(3);
        buf.writeBits(1, 8);
        buf.writeBits(1, 8);
        let view = buf.viewArray();
        expect(view.array).toEqual('00000001,00000001,00000000');
        expect(view.cursors).toEqual('R0000000,00000000,W0000000');
    });
});