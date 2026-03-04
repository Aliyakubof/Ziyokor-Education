const text = "2 vö—ær Fò †VÇ —ær „äð";
// this looks like mojibake. Let's try converting from WinAnsi/ISO-8859-1 back to UTF-8 or CP1251
const buff = Buffer.from(text, 'binary');
console.log('UTF-8:', buff.toString('utf8'));
console.log('Hex:', buff.toString('hex'));
