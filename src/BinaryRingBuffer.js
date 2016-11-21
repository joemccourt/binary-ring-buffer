'use strict';

const byteToBitArray = (byte) => {
    let a = [];
    for (let i = 0; i < 8; i++) {
        a[8 - i - 1] = (byte & (1 << i)) > 0 ? 1 : 0;
    }
    return a;
};

class BinaryRingBuffer {
    constructor(n = 8) {
        this.a = new ArrayBuffer(n);
        this.cap = n * 8; // buffer capacity in bits

        // Read / write positions in bits
        this.readCursor = 0;
        this.writeCursor = 0;
    }

    // Current buffer size in bits
    size() {
        return (this.cap + (this.writeCursor - this.readCursor)) % this.cap;
    }

    // Increase the capacity of the buffer
    grow() {
        let newCap = this.cap * 2;
        let dstArray = new ArrayBuffer(newCap/8);
        let srcArray = this.a;

        let newRead = this.readCursor % 8;
        let newWrite = this.size() + newRead;

        let startByte = Math.floor(this.readCursor / 8);
        let toByte = (this.cap/8 + Math.ceil(this.writeCursor / 8) - startByte) % newCap;
        let viewDst = new Uint8Array(dstArray);
        let viewSrc = new Uint8Array(srcArray);
        for (let i = 0; i <= toByte; i++) {
            viewDst[i] = viewSrc[(startByte + i) % (this.cap/8)];
        }
        // zero out edges
        viewDst[0] &= 255 >> newRead;
        viewDst[newWrite/8|0] &= 255 << (8 - (newWrite % 8));
        this.a = dstArray;
        this.cap = newCap;
        this.readCursor = newRead;
        this.writeCursor = newWrite;
    }

    writeBits(value, bits) {
        while (bits + this.size() > this.cap) {
            this.grow();
        }

        let value0 = value;
        let bits0 = bits;

        //  * * * * * * | * * * * * * * * | * * * * * *
        //     start    |  n full bytes   |   end
        let view = new Uint8Array(this.a);

        // start byte
        let offBitStart = 8 - (this.writeCursor % 8);
        let bitsStart = offBitStart;
        let bitsEnd = bitsStart >= bits ? 0 : ((bits - bitsStart) % 8);
        let bitsMiddle = bits - bitsStart - bitsEnd;
        if (offBitStart < 8) {
            let valueStart = value;
            let bitsToWrite = 0;
            if (offBitStart - bits > 0) {
                // does not complete byte
                valueStart = valueStart << (offBitStart - bits);
                bitsToWrite = bits;
            } else {
                valueStart = valueStart >> (bits - offBitStart);
                bitsToWrite = offBitStart;
            }
            bits -= bitsToWrite;

            view[this.writeCursor/8|0] &= (255 << offBitStart) | ((1 << (offBitStart-bitsToWrite)) - 1);
            view[this.writeCursor/8|0] |= valueStart;
            this.writeCursor += bitsToWrite;
            this.writeCursor %= this.cap;
            value -= valueStart * (1 << bits);
        }

        // middle full bytes
        while (bits >= 8) {
            let byteValue = value >> (bits - 8);
            view[this.writeCursor/8] = byteValue;
            bits -= 8;
            value -= byteValue * (1 << bits);
            this.writeCursor += 8;
            this.writeCursor %= this.cap;
        }

        // end byte
        if (bits > 0) {
            view[this.writeCursor/8] &= (1 << (8 - bits)) - 1;
            view[this.writeCursor/8] |= (value0 % 256) << (8 - bits);
            this.writeCursor += bits;
            this.writeCursor %= this.cap;
        }
    }

    readBits(bits, isPeak) {

        // todo: test if reading past write
        let view = new Uint8Array(this.a);
        let value = 0;
        let valueStart = 0;
        let valueMiddle = 0;
        let valueEnd = 0;

        let c = this.readCursor;
        let bitsStart = 8 - (c % 8);
        let bitsEnd = bitsStart > bits ? 0 : ((bits - bitsStart) % 8);
        let bitsMiddle = bits - bitsStart - bitsEnd;

        // start byte
        let byteStart = view[Math.floor(c/8)];

        // clear bits left of read cursor
        valueStart = byteStart & (255 >> (8 - bitsStart));
        
        // if less than entire first byte then shift into place
        if (bits < bitsStart) {
            valueStart = valueStart >> (bitsStart - bits);
            bitsStart = bits;
        }
        c += bitsStart;
        c %= this.cap;

        // middle full bytes
        let fStart = 1;
        for (let i = bitsMiddle; i > 0; i -= 8) {
            valueMiddle = valueMiddle * 256 + view[c/8];
            fStart *= 256;
            c += 8;
            c %= this.cap;
        }

        // end byte
        let fEnd = 1;
        if (bitsEnd > 0) {
            valueEnd = view[c/8] >> (8 - bitsEnd);
            fEnd *= 1 << bitsEnd;
            c += bitsEnd;
            c %= this.cap;
        }

        if (!isPeak) {
            this.readCursor = c;
        }

        return valueEnd + valueMiddle * fEnd + valueStart * fStart * fEnd;
    }

    peakBits(bits) {
        return this.readBits(bits, true);
    }

    clear() {
        this.writeCursor = this.readCursor;
    }

    // For debugging
    viewArray() {
        let view = new Uint8Array(this.a);
        let a = [];
        let c = [];
        for (let i = 0; i < this.cap / 8; i++) {
            a.push(byteToBitArray(view[i]).join(''));
            c.push(byteToBitArray(0));
        }

        c[this.writeCursor/8|0][this.writeCursor%8] = 'W';
        c[this.readCursor/8|0][this.readCursor%8] = 'R';
        c = c.map(b => b.join(''));

        return {
            array: a.join(','),
            cursors: c.join(',')
        };
    }
}

module.exports = BinaryRingBuffer;
