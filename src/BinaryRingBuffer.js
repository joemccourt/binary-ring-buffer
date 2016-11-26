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
        if (this.writeFull) { return this.cap; }
        return (this.cap + (this.writeCursor - this.readCursor)) % this.cap;
    }

    // Increase the capacity of the buffer
    grow() {
        let newCap = this.cap * 2;
        let dstArray = new ArrayBuffer(newCap / 8);
        let srcArray = this.a;

        let newRead = this.readCursor % 8;
        let newWrite = this.size() + newRead;

        let startByte = Math.floor(this.readCursor / 8);
        let toByte = (this.cap / 8 + Math.ceil(this.writeCursor / 8) - startByte) % newCap;
        let viewDst = new Uint8Array(dstArray);
        let viewSrc = new Uint8Array(srcArray);
        for (let i = 0; i <= toByte; i++) {
            viewDst[i] = viewSrc[(startByte + i) % (this.cap / 8)];
        }
        // zero out edges
        viewDst[0] &= 255 >> newRead;
        viewDst[newWrite / 8 | 0] &= 255 << (8 - (newWrite % 8));
        this.a = dstArray;
        this.cap = newCap;
        this.readCursor = newRead;
        this.writeCursor = newWrite;
    }

    writeBits(value, bits) {
        if (bits <= 0) { return; }
        while (bits + this.size() > this.cap) {
            this.grow();
        }

        let c = this.writeCursor;
        let view = new Uint8Array(this.a);

        // calc bit sizes to write
        let offBitStart = 8 - (c % 8);
        let bitsStart = offBitStart < bits ? offBitStart : bits;
        let bitsEnd = bitsStart >= bits ? 0 : ((bits - bitsStart) % 8);
        let bitsMiddle = bits - bitsStart - bitsEnd;

        // end byte
        if (bitsEnd > 0) {
            let index = ((c + bitsStart + bitsMiddle) % this.cap) / 8;
            view[index] &= (1 << (8 - bitsEnd)) - 1;
            view[index] |= (value % 256) << (8 - bitsEnd);
            value = Math.floor(value / (1 << bitsEnd));
        }

        // middle full bytes
        for (let i = 0; i < bitsMiddle; i += 8) {
            let offset = bitsMiddle - 8 - i;
            let index = ((c + offset + bitsStart) % this.cap) / 8;
            view[index] = value % 256;
            value = Math.floor(value / 256);
        }

        // first byte
        // if does not complete byte then shift value
        if (offBitStart > bits) {
            value <<= offBitStart - bits;
        }

        // mask out what bits we're writing and then set
        view[c / 8 | 0] &= (255 << offBitStart) | (255 >> ((c % 8) + bitsStart));
        view[c / 8 | 0] |= value;

        // advance cursor
        this.writeCursor += bits;
        this.writeCursor %= this.cap;

        // set is full buffer bool
        this.writeFull = this.writeCursor === this.readCursor;
    }

    readBits(bits, isPeak) {
        if (bits <= 0) { return 0; }

        // clamp bits if going past write
        if (bits > this.size()) {
            bits = this.size();
        }

        let view = new Uint8Array(this.a);
        let valueStart = 0;
        let valueMiddle = 0;
        let valueEnd = 0;

        let c = this.readCursor;
        let bitsStart = 8 - (c % 8);
        let bitsEnd = bitsStart > bits ? 0 : ((bits - bitsStart) % 8);
        let bitsMiddle = bits - bitsStart - bitsEnd;

        // start byte
        let byteStart = view[Math.floor(c / 8)];

        // clear bits left of read cursor
        valueStart = byteStart & (255 >> (8 - bitsStart));

        // if less than entire first byte then shift into place
        if (bits < bitsStart) {
            valueStart >>= bitsStart - bits;
            bitsStart = bits;
        }
        c += bitsStart;
        c %= this.cap;

        // middle full bytes
        let fStart = 1;
        for (let i = bitsMiddle; i > 0; i -= 8) {
            valueMiddle = valueMiddle * 256 + view[c / 8];
            fStart *= 256;
            c += 8;
            c %= this.cap;
        }

        // end byte
        let fEnd = 1;
        if (bitsEnd > 0) {
            valueEnd = view[c / 8] >> (8 - bitsEnd);
            fEnd *= 1 << bitsEnd;
            c += bitsEnd;
            c %= this.cap;
        }

        if (!isPeak) {
            this.readCursor = c;
            this.writeFull = false;
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

        c[this.writeCursor / 8 | 0][this.writeCursor % 8] = 'W';
        c[this.readCursor / 8 | 0][this.readCursor % 8] = 'R';
        c = c.map(b => b.join(''));

        return {
            array: a.join(','),
            cursors: c.join(','),
        };
    }
}

module.exports = BinaryRingBuffer;
