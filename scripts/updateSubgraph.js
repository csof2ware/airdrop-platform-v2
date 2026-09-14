const fs = require('fs');
const path = require('path');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'backend', 'config.json'), 'utf8'));
const yamlPath = path.join(__dirname, '..', 'subgraph', 'subgraph.yaml');

console.log('chaves config.json: ' + Object.keys(cfg).join(', '));
function pick() {
  for (var i = 0; i < arguments.length; i++) {
    if (cfg[arguments[i]]) return cfg[arguments[i]];
  }
  return null;
}

var map = {
  token:  pick('address', 'token', 'airdropToken'),
  merkle: pick('merkleAirdrop', 'airdrop', 'merkle'),
  signed: pick('signedAirdrop', 'signed')
};

function nameToKey(n) {
  var s = n.toLowerCase();
  if (s.indexOf('signed') !== -1) return 'signed';
  if (s.indexOf('merkle') !== -1 || (s.indexOf('airdrop') !== -1 && s.indexOf('token') === -1)) return 'merkle';
  return 'token';
}

var current = null;
var changed = 0;
var lines = fs.readFileSync(yamlPath, 'utf8').split('\n').map(function(line) {
  var mName = line.match(/^  - name:\s*(\S+)/);
  if (mName) current = mName[1];
  
  var mAddr = line.match(/^(\s*address:\s*)(0x[0-9a-fA-F]{40})\s*$/);
  if (mAddr && current) {
    var novo = map[nameToKey(current)];
    if (novo && novo.toLowerCase() !== mAddr[2].toLowerCase()) {
      changed++;
      console.log('address ' + current + ': ' + mAddr[2] + ' -> ' + novo);
      return mAddr[1] + novo;
    }
  }
  
  var mSb = line.match(/^(\s*startBlock:\s*)(\d+)\s*$/);
  if (mSb && mSb[2] !== '0') {
    changed++;
    console.log('startBlock ' + current + ': ' + mSb[2] + ' -> 0');
    return mSb[1] + '0';
  }
  
  return line;
});

fs.writeFileSync(yamlPath, lines.join('\n'));
console.log(changed ? 'OK: ' + changed + ' alteracao(oes)' : 'Nada para alterar');
