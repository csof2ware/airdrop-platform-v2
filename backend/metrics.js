const counters = {};

function inc(name) {
  counters[name] = (counters[name] || 0) + 1;
}

function render() {
  return Object.keys(counters).map(function (k) {
    return "airdrop_" + k + " " + counters[k];
  }).join("\n");
}

module.exports = { inc, render };
