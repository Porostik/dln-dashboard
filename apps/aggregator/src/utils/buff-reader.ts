export class BuffReader {
  constructor(
    private buff: Buffer,
    public offset: number = 0,
  ) {}

  public u8() {
    return this.buff.readUInt8(this.offset++);
  }

  public u32() {
    const v = this.buff.readUInt32LE(this.offset);
    this.offset += 4;
    return v;
  }

  public u64() {
    const v = this.buff.readBigUint64LE(this.offset);
    this.offset += 8;
    return v;
  }

  public fixed(n: number) {
    const v = this.buff.subarray(this.offset, this.offset + n);
    this.offset += n;
    return v;
  }

  public bytes() {
    const len = this.u32();
    return this.fixed(len);
  }

  public option<T>(read: () => T): T | null {
    return this.u8() === 1 ? read() : null;
  }
}
