import assert from "node:assert/strict";
import {
  ais140DeviceId,
  computeAis140Checksum,
  extractAis140Frames,
  parseAis140Frame,
} from "./ais140-mh.adapter.js";

function withChecksum(body: string): string {
  return `${body}*${computeAis140Checksum(body)}`;
}

// Maharashtra SOP normal packet (core fields; trailing fields abbreviated)
const NMP_BODY =
  "$NMP,ABCD01A,1.6.5,NR,6,L,888888888888999,MH01P80000,1,24032019,060122,29.7599630,N,77.6277844,E,022.5,320.55";
const NMP_FRAME = withChecksum(
  `${NMP_BODY},04,183.5,1.0,0.3,Airtel,1,1,12.5,4.2,0,C,25,404,10,00D6,CFBD,-74,1806,2031,-74,1878,151,-77,1906,2012,-81,1906,2032,0001,01,000005,03.1,10.2,0`,
);

// Maharashtra SOP emergency packet
const EPB_BODY =
  "$EPB,EMR,888888888888888,NM,11052019104331,A,30.9825130,N,75.9476639,E,183.5,022.5,G,221,MH01PB0000,09001001001";
const EPB_FRAME = withChecksum(EPB_BODY);

const HLP_FRAME = "$HLP,ABCD01A,1.6.7,888888888888888,30,20,600,001100,00";

// --- NMP ---
const nmp = parseAis140Frame(NMP_FRAME);
assert.equal(nmp.kind, "location");
assert.ok(nmp.update);
assert.equal(nmp.update.deviceId, ais140DeviceId("888888888888999"));
assert.equal(nmp.update.latitude, 29.759963);
assert.equal(nmp.update.longitude, 77.6277844);
assert.equal(nmp.update.speed, 22.5);
assert.equal(nmp.update.heading, 320.55);
assert.equal(nmp.update.source, "ais140");
assert.equal(nmp.update.timestamp, "2019-03-24T06:01:22.000Z");

// --- EPB ---
const epb = parseAis140Frame(EPB_FRAME);
assert.equal(epb.kind, "location");
assert.ok(epb.update);
assert.equal(epb.update.deviceId, ais140DeviceId("888888888888888"));
assert.equal(epb.update.latitude, 30.982513);
assert.equal(epb.update.longitude, 75.9476639);
assert.equal(epb.update.timestamp, "2019-05-11T10:43:31.000Z");

// --- HLP ---
const hlp = parseAis140Frame(HLP_FRAME);
assert.equal(hlp.kind, "health");
assert.ok(hlp.health);
assert.equal(hlp.health.imei, "888888888888888");

// --- frame extraction ---
const buffered = `garbage${NMP_FRAME}\r\n${EPB_FRAME}`;
const { frames, remainder } = extractAis140Frames(buffered);
assert.equal(frames.length, 2);
assert.equal(remainder, "");
assert.equal(parseAis140Frame(frames[0]!).kind, "location");

// --- checksum strict mode ---
parseAis140Frame(NMP_FRAME, true);
assert.throws(() => parseAis140Frame(`${NMP_BODY}*00`, true), /Checksum mismatch/);

console.log("ais140-mh.adapter tests passed");
