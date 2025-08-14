import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.152.0/testing/asserts.ts";
import { senderFLC, setRO } from "../../src/runtime/runtime.esm.js";

function receiver () {
    return senderFLC();
}

function msjsR$ () { // message pipeline - receiver side
    return receiver();
}

function msjsS$ () { // message pipeline - sender side
    return msjsR$();
}

function sender () {
    return msjsS$(); // <-- this line in FLC
}

Deno.test("senderFLC", () => {
    const flc = sender();

    assert(flc, "senderFLC should return an object");
    assertEquals(flc.file.endsWith("/runtime/senderFLC.test.js"), true);
    assertEquals(flc.line, 20);
    // Column can be brittle, so we just check that it's a number.
    assertEquals(typeof flc.column, "number");
});