/*
    These functions were copied from a Stack Overflow answer by Jon Musselwhite.
    https://stackoverflow.com/a/77969073
*/

function bigIntReplacer(key, value) {
  if (typeof value === "bigint") {
    return value.toString() + "n";
  }
  return value;
}

function bigIntReviver(key, value) {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}
