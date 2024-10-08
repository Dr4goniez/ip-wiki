# `ip-wiki` — IP Address Utility Library for Wikipedia and NodeJS

`ip-wiki` is a JavaScript library written in ES6 that provides classes for manipulating IP and CIDR addresses. As the name suggests, it was developed for use on (front-end) Wikipedia; however, it also works as a NodeJS module in back-end environments.

* **[API documentation](https://dr4goniez.github.io/ip-wiki/modules.html)** is avaiable!
* The library is TypeScript-compatible!
* No external dependencies!

## Installation
```
npm install ip-wiki
```
If you only need type definitions:
```
npm install -D ip-wiki
```

## Usage
### NodeJS
In CommonJS:
```js
const {IP, IPUtil} = require('ip-wiki');
```
In ES modules:
```js
import {IP, IPUtil} from 'ip-wiki';
```
Then:

![Intellisense for NodeJS projects.](assets/Intellisense_nodejs.png)

### Wikipedia

Load and import [ja:MediaWiki:Gadget-ip-wiki.js](https://ja.wikipedia.org/wiki/MediaWiki:Gadget-ip-wiki.js). In this case, this package is for Intellisense (you may also want to install [types-mediawiki](https://www.npmjs.com/package/types-mediawiki) as a dev dependency).
```js
/**
 * @returns {JQueryPromise<import('ip-wiki')>}
 */
function getIpWiki() {
	const gadget = 'ext.gadget.ip-wiki';
	return mw.loader.using(gadget).then((req) => req(gadget));
}

getIpWiki().then((ipWiki) => {
	const {IP, IPUtil} = ipWiki;
	// ...
});
```
Note that you may need to cross-wiki-load the gadget if a module named `ip-wiki` is not defined in the local Gadgets-definition:
```js
/**
 * @returns {JQueryPromise<import('ip-wiki')>}
 */
function getIpWikiX() {
	const gadget = 'ext.gadget.ip-wiki';
	return mw.loader.getScript('https://ja.wikipedia.org/w/load.php?modules=' + gadget).then(() => {
		return mw.loader.using(gadget).then((req) => req(gadget));
	});
}
```

Then:

![Intellisense for Wikipedia projects.](assets/Intellisense_wiki.png)

## Class showcases
This library has two main classes: the [IP](https://dr4goniez.github.io/ip-wiki/classes/IP.html) class and the static [IPUtil](https://dr4goniez.github.io/ip-wiki/classes/IPUtil.html) class:
* Use the IP class when you need to do manipulations on the same IP recursively (more efficient than to use IPUtil because we can skip the parsing process of the relevant input IP string).
* Use the IPUtil class for one-time manipulations (i.e. when there is no need to create a class instance).

### Class IP
Suppose that you need to retrieve the indexes of IP-representing elements in the `ipArr` array that equal the IP address `192.168.1.1`:
```js
const ip = IP.newFromText('192.168.1.1');
if (!ip) {
	return;
}
const ipArr = [
	'192.168.1.1/32',
	'::1',
	'192.168.001.001'
];
const indexes = ipArr.reduce(/** @param {number[]} acc */ (acc, ipStr, i) => {
	if (ip.equals(ipStr)) { // Not IPUtil.equals('192.168.1.1', ipStr)
		acc.push(i);
	}
	return acc;
}, []);
console.log(indexes); // [ 0, 2 ]

```

### Class IPUtil
Suppose that you need to filter the `ipArr` array so that it will only contain IPv6 addresses and CIDRs:
```js
const ipArr = [
	'192.168.1.1/32',
	'::1',
	'192.168.001.001'
];
const filtered = ipArr.filter((ip) => IPUtil.isIPv6(ip, true));
console.log(filtered); // [ '::1' ]
```

Suppose that you need to create an array of IPv6 CIDRs in their sanitized notations out of the `ipArr` array:
```js
const ipArr = [
	'foo',
	'192.168.1.0',
	'fd12:3456:789a:1::1',
	'fd12:3456:789a:0:0:0:0:0/48',
	'fd12:3456:789a:1::/64'
];
const ipv6Cidrs = ipArr.reduce(/** @param {string[]} acc */ (acc, ipStr) => {
	const sanitized = IPUtil.sanitize(ipStr, false, (version, isCidr) => version === 6 && isCidr);
	if (sanitized) {
		acc.push(sanitized);
	}
	return acc;
}, []);
console.log(ipv6Cidrs); // [ 'fd12:3456:789a:0:0:0:0:0/48', 'fd12:3456:789a:1:0:0:0:0/64' ]
```

### Methods
For a number of other methods, see the **[API documentation](https://dr4goniez.github.io/ip-wiki/modules.html)**!