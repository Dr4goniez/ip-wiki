/**
 * ip-wiki — IP Address Utility Library
 * @version 1.2.1
 * @see https://dr4goniez.github.io/ip-wiki/index.html API documentation
 */
//<nowiki>
/**
 * Returns a human-readable type name for the given value.
 *
 * Differentiates between `null`, arrays, and objects with constructors.
 * For most values, this function returns results similar to `typeof`,
 * but improves clarity for:
 * - `null` → `"null"` instead of `"object"`
 * - arrays → `"array"` instead of `"object"`
 * - class instances → class name (e.g. `"Date"`, `"Map"`)
 *
 * @param {unknown} value - The value whose type is to be formatted.
 * @returns {string} A string representing the value's type.
 */
function formatType(value) {
	if (Array.isArray(value)) {
		return 'array';
	} else if (value === null) {
		return 'null';
	} else if (value && value.constructor && value.constructor.name) {
		return value.constructor.name;
	} else {
		return typeof value;
	}
}
/**
 * Abstract class with protected static utilities for IP handling.
 * Designed to be subclassed by static utility classes or instantiable IP objects.
 *
 * Prevents direct instantiation via constructor guard.
 *
 * @abstract
 */
class IPBase {

    /**
     * Constructor for abstract class.
     * Subclasses must explicitly pass `true` to override the instantiation guard.
     *
     * This pattern enforces that only intended subclasses can be instantiated,
     * while pure-static subclasses (with no `super()` call) avoid the constructor entirely.
     *
     * @param {boolean} override Must be `true` to instantiate.
     * @throws {Error} If `override` is not `true`.
     * @hidden
     */
    constructor(override) {
        if (override !== true) {
            throw new Error('IPBase is abstract and cannot be instantiated directly.');
        }
    }

    /**
     * Removes Unicode bidirectional control characters and trims whitespace.
     *
     * These invisible characters (e.g., LRM, RLM, directional overrides) can appear
     * when copying IPs from external sources, especially in web editors.
     *
     * Their presence can interfere with IP parsing, matching, or display logic.
     *
     * The specific characters removed are:
     * - U+200E LEFT-TO-RIGHT MARK (LRM)
     * - U+200F RIGHT-TO-LEFT MARK (RLM)
     * - U+202A to U+202E (directional overrides)
     *
     * This logic mirrors cleanup done in MediaWiki core:
     * {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/HEAD/includes/title/TitleParser.php TitleParser::splitTitleString}
     *
     * @param {string} str Input string (may contain invisible bidi characters).
     * @returns {string} Cleaned string, safe for IP parsing.
     */
    static clean(str) {
        return str.replace(/[\u200E\u200F\u202A-\u202E]+/g, '').trim();
    }

	/**
	 * Parses a string potentially representing an IP address or CIDR.
	 *
	 * Supports both IPv4 and IPv6 formats, optionally with CIDR bit lengths.
	 * Returns `null` if the input is invalid or outside expected ranges.
	 *
	 * Accepted formats:
	 * - IPv4: `'x.x.x.x'` or `'x.x.x.x/bitLen'`, where x = `0–255`, bitLen = `0–32`
	 * - IPv6: `'xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx:xxxx'` or shortened `'::'` forms,
	 *   optional `'/bitLen'` with bitLen = `0–128`
	 *
	 * Limitations:
	 * - Does not handle IPv4-mapped IPv6 addresses (e.g., `::ffff:192.168.0.1`).
	 *
	 * @param {string} ipStr The string to parse.
	 * @param {number} [bitLen] Optional bit length to enforce for CIDR. If provided, any bit length
	 * specified in `ipStr` will be overridden.
	 * @returns {Parsed?} A parsed object with parts and optional bit length, or `null` if invalid.
	 * @protected
	 */
	static _parse(ipStr, bitLen) {

		if (typeof ipStr !== 'string') {
			return null;
		}

		ipStr = this.clean(ipStr);
		if (typeof bitLen === 'number') {
			ipStr = ipStr.replace(/\/\d+$/, '') + '/' + bitLen;
		}

		// IPv4 pattern
		let m = ipStr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,3}))?$/);
		if (m) {
			/** @type {Parsed} */
			const ret = {
				parts: [],
				bitLen: m[5] !== undefined ? parseInt(m[5], 10) : null
			};
			if (ret.bitLen !== null && !(0 <= ret.bitLen && ret.bitLen <= 32)) {
				return null;
			}
			for (let i = 1; i <= 4; i++) {
				const num = parseInt(m[i], 10);
				if (Number.isNaN(num) || num < 0 || num > 255 || m[i].length > 3) {
					return null;
				}
				ret.parts.push(num);
			}
			return ret;
		}

		// IPv6 pattern
		m = ipStr.match(/^([\p{Hex_Digit}:]+)(?:\/(\d{1,3}))?$/u);
		if (m && !/:::/.test(ipStr) && (ipStr.match(/::/g) || []).length < 2) {
			/** @type {Parsed} */
			const ret = {
				parts: [],
				bitLen: m[2] !== undefined ? parseInt(m[2], 10) : null
			};
			if (ret.bitLen !== null && !(0 <= ret.bitLen && ret.bitLen <= 128)) {
				return null;
			}
			ipStr = m[1];
			let parts = ipStr.split(':');
			if (ipStr.includes('::')) {
				const missing = 8 - (parts.length - 1);  // Subtract 1 for empty slot from '::'
				const replacement = new Array(missing + 1).join('0:').slice(0, -1);
				ipStr = ipStr.replace('::', replacement ? `:${replacement}:` : ':');
				parts = ipStr.split(':');
			}
			if (parts.length !== 8) {
				return null;
			}
			for (const el of parts) {
				const num = el === '' ? 0 : parseInt(el, 16);
				if (Number.isNaN(num) || num < 0 || num > 0xffff || el.length > 4) {
					return null;
				}
				ret.parts.push(num);
			}
			return ret;
		}

		return null;
	}

	/**
	 * Returns the first and last IPs in the given CIDR range.
	 *
	 * Accepts both IPv4 and IPv6 addresses, represented as arrays of decimal parts.
	 * If no `bitLen` is provided, the address is treated as a single host (non-CIDR).
	 *
	 * @param {number[]} parts - Array of decimal IP parts:
	 * - 4 elements for IPv4 (each `0–255`)
	 * - 8 elements for IPv6 (each `0–65535`)
	 * @param {number?} bitLen - Optional CIDR bit length (`0–32` for IPv4, `0–128` for IPv6).
	 * @returns {RangeObject} Object with the first and last IPs in the range.
	 * @throws {Error} If `parts` is not a valid IPv4 or IPv6 array.
	 * @protected
	 */
	static _parseRange(parts, bitLen) {
		if (parts.length !== 4 && parts.length !== 8) {
			throw new Error(`Unexpected error: The IP has ${parts.length} parts.`);
		}

		// If no CIDR bit length is specified, treat this as a single-address range.
		const isV4 = parts.length === 4;
		if (typeof bitLen !== 'number') {
			return {
				first: parts,
				last: parts,
				bitLen: isV4 ? 32 : 128,
				isCidr: false
			};
		}

		// Construct the netmask for this CIDR. For example, IPv4 /20 → [255, 255, 240, 0]
		const partBits = isV4 ? 8 : 16;
		const partMax = isV4 ? 0xff : 0xffff;
		const netMaskParts = parts.map((_, i) => {
			const bitsRemaining = bitLen - i * partBits;
			if (bitsRemaining >= partBits) {
				// This segment is fully covered by the mask (all 1s)
				return partMax;
			}
			if (bitsRemaining > 0) {
				// This segment is partially covered (some 1s followed by 0s)
				return (partMax << (partBits - bitsRemaining)) & partMax;
			}
			// This segment is outside the mask (all 0s)
			return 0;
		});

		return {
			// Network address: IP AND netmask
			first: parts.map((val, i) => val & netMaskParts[i]),
			// Broadcast address: IP OR inverted netmask
			last: parts.map((val, i) => val | (~netMaskParts[i] & partMax)),
			bitLen,
			isCidr: true
		};
	}

	/**
	 * Converts an array of decimal IP parts into a string.
	 *
	 * @param {number[]} decimals Array of decimal IP parts.
	 * @param {string} suffix String to append after the address (e.g., CIDR `/24` or empty string).
	 * @param {StringifyOptions} [options] Formatting options.
	 * @returns {string} Formatted IP address string.
	 * @protected
	 */
	static _stringify(decimals, suffix, options = {}) {

		const version = decimals.length === 4 ? 4 : 6;
		const delimiter = version === 4 ? '.' : ':';
		const { mode, capitalize } = options;

		/** @type {(number | string)[]} */
		let parts = version === 6
			? decimals.map(el => el.toString(16)) // Convert to hex
			: decimals;

		// IPv6 Shortening (RFC 5952)
		if (mode === 'short' && version === 6) {

			// Find longest zero-run
			let maxStart = -1, maxLen = 0;
			for (let i = 0; i < parts.length;) {
				if (parts[i] !== '0') {
					i++;
					continue;
				}
				const start = i;
				while (i < parts.length && parts[i] === '0') i++;
				const len = i - start;
				if (len > maxLen) {
					maxStart = start;
					maxLen = len;
				}
			}

			// Replace the zero-run, if found,  with "::"
			if (maxLen >= 2) {
				const compressed = [
					...parts.slice(0, maxStart),		// Segments before the run
					'',									// Placeholder for "::"
					...parts.slice(maxStart + maxLen)	// Segments after the run
				];
				let ret = compressed.join(':');
				if (ret.startsWith(':')) ret = ':' + ret;
				if (ret.endsWith(':')) ret += ':';
				ret = ret.replace(/:{2,}/, '::');
				ret += suffix;
				return capitalize ? ret.toUpperCase() : ret;
			}

			// No compression possible
			const ret = parts.join(':') + suffix;
			return capitalize ? ret.toUpperCase() : ret;
		}

		// Long mode zero-padding
		if (mode === 'long') {
			const padLen = version === 4 ? 3 : 4;
			parts = parts.map((el) => {
				const str = el.toString();
				return '0'.repeat(padLen - str.length) + str;
			});
		}

		const ret = parts.join(delimiter) + suffix;
		return capitalize ? ret.toUpperCase() : ret;
	}

	/**
	 * Parses and stringifies an IP string with optional filtering.
	 *
	 * @param {string} ipStr IP address or CIDR string to parse.
	 * @param {StringifyOptions} options Formatting options for output.
	 * @param {ConditionPredicate} [conditionPredicate] Optional callback to filter addresses.
	 * @returns {string?} Formatted IP string, or `null` if:
	 * - The input is invalid.
	 * - The address fails the `conditionPredicate`.
	 * @protected
	 */
	static _parseAndStringify(ipStr, options, conditionPredicate) {
		const parsed = this._parse(ipStr);
		if (!parsed) {
			return null;
		}

		const { parts, bitLen } = parsed;
		const version = parts.length === 4 ? 4 : 6;
		const isCidr = bitLen !== null;

		// Apply filter predicate if provided
		if (conditionPredicate && !conditionPredicate(version, isCidr)) {
			return null;
		}

		// Normalize IP parts to first address if CIDR provided
		const normalized = this._parseRange(parts, bitLen);
		const suffix = isCidr ? '/' + bitLen : '';

		return this._stringify(normalized.first, suffix, options);
	}

	/**
	 * Compares two IP address ranges to check for inclusion.
	 *
	 * @param {RangeObject} ip1 Range object of the first IP (typically the "narrower" one).
	 * @param {string | IP} ip2 IP string or IP instance to compare against.
	 * @param {"<" | ">"} comparator Use `<` to check if `ip2` contains `ip1`, or `>` if `ip1` contains `ip2`.
	 * @returns {boolean?} `null` if `ip2` is not a valid IP; `false` if not contained; `true` otherwise.
	 * @protected
	 */
	static _compareRanges(ip1, ip2, comparator) {
		const range1 = ip1;
		const range2 = this._getRangeObject(ip2);
		if (!range2) {
			return null;
		}

		// Defensive: Ensure matching IP version (length check)
		const len = range1.first.length;
		if (![range1.last, range2.first, range2.last].every((arr) => arr.length === len)) {
			return false;
		}

		// Determine broader and narrower ranges based on comparator
		const [broader, narrower] = comparator === '<'
			? [range2, range1]
			: comparator === '>'
			? [range1, range2]
			: (() => { throw new Error('Invalid comparator provided.'); })();

		for (let i = 0; i < len; i++) {
			if (broader.first[i] > narrower.first[i] || narrower.last[i] > broader.last[i]) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Converts an IP string or IP instance into a range object.
	 *
	 * @param {string | IP} ip IP/CIDR string or IP instance.
	 * @returns {RangeObject?} Range object for the given IP, or `null` if invalid.
	 * @protected
	 */
	static _getRangeObject(ip) {
		if (ip instanceof IP) {
			return ip.getProperties();
		}
		const parsed = this._parse(ip);
		if (!parsed) {
			return null;
		}
		return this._parseRange(parsed.parts, parsed.bitLen);
	}

	/**
	 * Checks if two IP addresses are equal.
	 *
	 * Compares both the IP parts and CIDR bit length.
	 *
	 * @param {RangeObject} ipObj Range object of the first IP.
	 * @param {string | IP} ipStr IP string, CIDR, or IP instance to compare.
	 * @returns {boolean?} `true` if equal, `false` if not equal, `null` if second input is invalid.
	 * @protected
	 */
	static _checkEquality(ipObj, ipStr) {
		const ip1 = ipObj;
		const ip2 = this._getRangeObject(ipStr);
		if (!ip2) {
			return null;
		}
		// Must match version (part length) and bit length
		if (ip1.first.length !== ip2.first.length || ip1.bitLen !== ip2.bitLen) {
			return false;
		}
		// Compare each part
		return ip1.first.every((part, i) => part === ip2.first[i]);
	}

	/**
	 * Computes the narrowest CIDR range that fully encompasses two IP ranges,
	 * while enforcing optional prefix length constraints.
	 *
	 * Supports both IPv4 and IPv6, as long as both input ranges are of the same version.
	 * The input ranges must be pre-parsed {@link RangeObject} objects (with `.first` and `.last` arrays).
	 *
	 * **Behavior:**
	 * - Returns the smallest CIDR block that includes both input ranges.
	 * - If the IP versions differ (e.g. one is IPv4 and the other is IPv6), returns `null`.
	 * - If the computed prefix length falls outside the allowed bounds, returns `null`.
	 * - If `verbose` is `true`, logs warnings for invalid inputs, version mismatches,
	 *   and out-of-bound results to the console.
	 *
	 * **Options:**
	 *
	 * The `options` object can include the following optional prefix constraints and flags:
	 * - `minV4`: Minimum allowed prefix length for IPv4 (default: `0`, i.e. `/0`)
	 * - `maxV4`: Maximum allowed prefix length for IPv4 (default: `32`, i.e. `/32`)
	 * - `minV6`: Minimum allowed prefix length for IPv6 (default: `0`, i.e. `/0`)
	 * - `maxV6`: Maximum allowed prefix length for IPv6 (default: `128`, i.e. `/128`)
	 * - `verbose`: If `true`, warnings are logged to the console instead of silently returning `null`
	 *
	 * **Errors:**
	 * Throws when:
	 * - Any of the prefix constraint values are not numbers.
	 * - Any of the values are out of bounds (e.g. `minV4 > maxV4`, or `maxV6 > 128`).
	 *
	 * @param {RangeObject} range1 - First IP range (must have `.first` and `.last` arrays).
	 * @param {RangeObject} range2 - Second IP range (same version as `range1`).
	 * @param {IntersectOptions} [options] - Optional prefix length bounds and debug flag.
	 * @returns {RangeObject | null} A CIDR-aligned `RangeObject` covering both inputs,
	 * or `null` if the IP versions differ or the result violates constraints.
	 * @throws {TypeError} If any option is not a number.
	 * @throws {RangeError} If any option is out of bounds or if `min > max`.
	 * @protected
	 */
	static _getCommonRange(range1, range2, options = {}) {
		const {
			minV4,
			maxV4,
			minV6,
			maxV6,
			verbose
		} = this._validateIntersectOptions(options);

		// Check for IP version mismatch
		if (range1.first.length !== range2.first.length) {
			if (verbose) {
				const ips = [range1, range2].map((r) => {
					const suffix = r.isCidr ? `/${r.bitLen}` : '';
					return this._stringify(r.first, suffix, { mode: 'short' });
				});
				console.warn(`"range1" and "range2" must be of the same version: ${ips.join(', ')}`);
			}
			return null;
		}

		const len = range1.first.length;
		const isV4 = len === 4;
		const partBits = isV4 ? 8 : 16;
		const minAllowed = isV4 ? minV4 : minV6;
		const maxAllowed = isV4 ? maxV4 : maxV6;

		// Compute the lowest and highest address across both ranges
		const /** @type {number[]} */ first = [];
		const /** @type {number[]} */ last = [];
		for (let i = 0; i < len; i++) {
			first[i] = Math.min(range1.first[i], range2.first[i]);
			last[i] = Math.max(range1.last[i], range2.last[i]);
		}

		// Calculate the common prefix length
		let commonPrefixLen = 0;

		for (let i = 0; i < len; i++) {
			// Per-bit comparison in each IP part
			for (let b = partBits - 1; b >= 0; b--) {
				const mask = 1 << b;
				if ((first[i] & mask) !== (last[i] & mask)) {
					// Divergence found here
					if (commonPrefixLen < minAllowed || commonPrefixLen > maxAllowed) {
						return errOutsideAllowedRange();
					}
					return this._parseRange(first, getBitLength());
				}
				commonPrefixLen++;
			}
		}

		// No divergence: both inputs are fully contained within the same CIDR block
		if (commonPrefixLen < minAllowed || commonPrefixLen > maxAllowed) {
			return errOutsideAllowedRange();
		}
		return this._parseRange(first, getBitLength());

		/**
		 * Logs a warning and returns `null` if the computed prefix length is outside the allowed range.
		 *
		 * @returns {null}
		 */
		function errOutsideAllowedRange() {
			if (verbose) {
				console.warn(`Computed prefix length ${commonPrefixLen} is outside allowed range (${minAllowed}–${maxAllowed}).`);
			}
			return null;
		}

		/**
		 * Returns the prefix length unless it represents the full length of the address space (i.e. /32 or /128),
		 * in which case `null` is returned. This is used to omit redundant prefix notation for single-IP ranges.
		 *
		 * @returns {number?}
		 */
		function getBitLength() {
			return (isV4 && commonPrefixLen !== 32) || (!isV4 && commonPrefixLen !== 128)
				? commonPrefixLen
				: null;
		}
	}

	/**
	 * Validates options for {@link _getCommonRange}.
	 *
	 * @param {IntersectOptions} options The options to validate.
	 * @returns {Required<IntersectOptions>} The validated options.
	 * @throws If `options` includes invalid entries.
	 * @protected
	 */
	static _validateIntersectOptions(options) {
		const {
			minV4 = 0,
			maxV4 = 32,
			minV6 = 0,
			maxV6 = 128,
			verbose = false
		} = options;

		if (typeof minV4 !== 'number') {
			throw new TypeError(`Expected number for "minV4", but got ${formatType(minV4)}.`);
		}
		if (typeof maxV4 !== 'number') {
			throw new TypeError(`Expected number for "maxV4", but got ${formatType(maxV4)}.`);
		}
		if (typeof minV6 !== 'number') {
			throw new TypeError(`Expected number for "minV6", but got ${formatType(minV6)}.`);
		}
		if (typeof maxV6 !== 'number') {
			throw new TypeError(`Expected number for "maxV6", but got ${formatType(maxV6)}.`);
		}

		if (!Number.isInteger(minV4) || minV4 < 0 || minV4 > 32) {
			throw new RangeError(`"minV4" must be an integer between 0 and 32, but got ${minV4}.`);
		}
		if (!Number.isInteger(maxV4) || maxV4 < 0 || maxV4 > 32) {
			throw new RangeError(`"maxV4" must be an integer between 0 and 32, but got ${maxV4}.`);
		}
		if (!Number.isInteger(minV6) || minV6 < 0 || minV6 > 128) {
			throw new RangeError(`"minV6" must be an integer between 0 and 128, but got ${minV6}.`);
		}
		if (!Number.isInteger(maxV6) || maxV6 < 0 || maxV6 > 128) {
			throw new RangeError(`"maxV6" must be an integer between 0 and 128, but got ${maxV6}.`);
		}

		if (minV4 > maxV4) {
			throw new RangeError(`"minV4" (${minV4}) cannot be greater than "maxV4" (${maxV4}).`);
		}
		if (minV6 > maxV6) {
			throw new RangeError(`"minV6" (${minV6}) cannot be greater than "maxV6" (${maxV6}).`);
		}

		return {
			minV4,
			maxV4,
			minV6,
			maxV6,
			verbose
		};
	}

}
/**
 * A utility class that provides static methods for validating and formatting IP and CIDR strings.
 * Unlike the {@link IP} class, these methods are stateless and ideal for one-off checks or
 * transformations on varying inputs.
 */
class IPUtil extends IPBase {

	/**
	 * @throws {Error} Always throws. This class cannot be instantiated.
	 * @hidden
	 */
	constructor() {
		super(true);
		throw new Error('Static class cannot be instantiated.');
	}

	/**
	 * Returns a sanitized representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.0.1` (IPv4; same as {@link IPUtil.abbreviate})
	 * * `fd12:3456:789a:1:0:0:0:0`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1::1/64`
	 * * Output: `fd12:3456:789a:1:0:0:0:0/64`
	 *
	 * @param {string} ipStr IP or CIDR string to sanitize.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate]
	 * Optional condition for filtering valid IPs.
	 * @returns {string?} Sanitized string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static sanitize(ipStr, capitalize, conditionPredicate) {
		return this._parseAndStringify(ipStr, { capitalize: !!capitalize }, conditionPredicate);
	}

	/**
	 * Returns an abbreviated representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.0.1` (IPv4; same as {@link IPUtil.sanitize})
	 * * `fd12:3456:789a:1::`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1:0:0:0:1/64`
	 * * Output: `fd12:3456:789a:1::/64`
	 *
	 * @param {string} ipStr IP or CIDR string to abbreviate.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate] Optional condition for filtering valid IPs.
	 * @returns {string?} Abbreviated string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static abbreviate(ipStr, capitalize, conditionPredicate) {
		return this._parseAndStringify(ipStr, { mode: 'short', capitalize: !!capitalize }, conditionPredicate);
	}

	/**
	 * Returns a fully expanded (lengthened) representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.000.001`
	 * * `fd12:3456:789a:0001:0000:0000:0000:0000`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1:0:0:0:1/64`
	 * * Output: `fd12:3456:789a:0001:0000:0000:0000:0000/64`
	 *
	 * @param {string} ipStr IP or CIDR string to expand.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate] Optional condition for filtering valid IPs.
	 * @returns {string?} Expanded string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static lengthen(ipStr, capitalize, conditionPredicate) {
		return this._parseAndStringify(ipStr, { mode: 'long', capitalize: !!capitalize }, conditionPredicate);
	}

	/**
	 * Validates whether a string is a valid IP or CIDR address.
	 *
	 * - If `allowCidr` is `true`, CIDR suffixes are allowed.
	 * - If `allowCidr` is `'strict'`, the method returns a normalized CIDR string if the input is valid
	 * but not in canonical form.
	 * - If `allowCidr` is `false`, CIDR suffixes are disallowed.
	 *
	 * ### Return values:
	 * * `true`: The input is valid.
	 * * `false`: The input is invalid.
	 * * `string`: A corrected CIDR string (only if `allowCidr === 'strict'` and normalization is needed).
	 *
	 * @param {string} ipStr The IP or CIDR string to validate.
	 * @param {boolean | StrictCIDR} allowCidr Whether to allow CIDRs, or require strict CIDR format.
	 * @param {ConditionPredicate} [conditionPredicate] Optional function to apply additional validation.
	 * @param {StringifyOptions} [options] Output formatting options (used only if returning a string).
	 * @returns {boolean | string} See above.
	 * @protected
	 */
	static _validate(ipStr, allowCidr, conditionPredicate, options) {
		const { parts, bitLen } = this._parse(ipStr) || { parts: null, bitLen: null };
		const isCidr = bitLen !== null;
		if (
			// Not a valid IP, or
			!parts ||
			// Disallowed to be CIDR but is CIDR, or
			!allowCidr && isCidr ||
			// Doesn't meet the conditions of the predicate
			conditionPredicate && !conditionPredicate(parts.length === 4 ? 4 : 6, isCidr)
		) {
			return false;
		}
		if (allowCidr === 'strict' && isCidr) {
			// On strict CIDR validation mode, return a corrected CIDR if the prefix is inaccurate
			const { first } = this._parseRange(parts, bitLen);
			if (!first.every((num, i) => num === parts[i])) {
				return this._stringify(first, '/' + bitLen, options);
			}
		}
		return true;
	}

	/**
	 * Checks whether the input is a valid IP or CIDR address.
	 *
	 * @param {string} ipStr The IP or CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIP(ipStr, allowCidr = false, options = {}) {
		return this._validate(ipStr, allowCidr, void 0, options);
	}

	/**
	 * Checks whether the input is a valid IPv4 address or IPv4 CIDR.
	 *
	 * @param {string} ipStr The IPv4 or IPv4 CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv4(ipStr, allowCidr = false, options = {}) {
		return this._validate(ipStr, allowCidr, (v) => v === 4, options);
	}

	/**
	 * Checks whether the input is a valid IPv6 address or IPv6 CIDR.
	 *
	 * @param {string} ipStr The IPv6 or IPv6 CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv6(ipStr, allowCidr = false, options = {}) {
		return this._validate(ipStr, allowCidr, (v) => v === 6, options);
	}

	/**
	 * Checks whether the input is a valid CIDR (either IPv4 or IPv6).
	 *
	 * @param {string} ipStr The CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isCIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this._validate(ipStr, allowCidr, (_, isCidr) => isCidr, options);
	}

	/**
	 * Checks whether the input is a valid IPv4 CIDR.
	 *
	 * @param {string} ipStr The IPv4 CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv4CIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this._validate(ipStr, allowCidr, (v, isCidr) => v === 4 && isCidr, options);
	}

	/**
	 * Checks whether the input is a valid IPv6 CIDR.
	 *
	 * @param {string} ipStr The IPv6 CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv6CIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this._validate(ipStr, allowCidr, (v, isCidr) => v === 6 && isCidr, options);
	}

	/**
	 * Checks whether a given IP address is within the CIDR range of another.
	 *
	 * @param {string | IP} ipStr The target IP address to evaluate.
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the range.
	 * @returns {boolean?} `true` if `ipStr` is within the range of `cidrStr`, `false` if not, or `null`
	 * if either input is invalid.
	 */
	static isInRange(ipStr, cidrStr) {
		const ip = this._getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return this._compareRanges(ip, cidrStr, '<');
	}

	/**
	 * Checks whether a given IP address is within any of the CIDR ranges in the array.
	 *
	 * @param {string | IP} ipStr The IP address to evaluate.
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {number?} The index of the first matching CIDR in the array, `-1` if none match, or `null`
	 * if `ipStr` is invalid.
	 */
	static isInAnyRange(ipStr, cidrArr) {
		const ip = this._getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return cidrArr.findIndex((cidr) => !!this._compareRanges(ip, cidr, '<'));
	}

	/**
	 * Checks whether a given IP address is within all CIDR ranges in the array.
	 *
	 * @param {string | IP} ipStr The IP address to evaluate.
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {boolean?} `true` if the IP is within all CIDRs, `false` if not, or `null` if `ipStr` is invalid
	 * or `cidrArr` is not an array or an empty array.
	 */
	static isInAllRanges(ipStr, cidrArr) {
		if (!Array.isArray(cidrArr) || !cidrArr.length) {
			return null;
		}
		const ip = this._getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return cidrArr.every((cidr) => !!this._compareRanges(ip, cidr, '<'));
	}

	/**
	 * Checks whether a CIDR range contains the specified IP address.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {string | IP} ipStr The target IP address to check.
	 * @returns {boolean?} `true` if `cidrStr` contains `ipStr`, `false` if not, or `null` if either input is invalid.
	 */
	static contains(cidrStr, ipStr) {
		const cidr = this._getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return this._compareRanges(cidr, ipStr, '>');
	}

	/**
	 * Checks whether a CIDR range contains any of the IP addresses in the array.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {number?} The index of the first match in `ipArr`, `-1` if none match, or `null` if `cidrStr` is invalid.
	 */
	static containsAny(cidrStr, ipArr) {
		const cidr = this._getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return ipArr.findIndex((ip) => !!this._compareRanges(cidr, ip, '>'));
	}

	/**
	 * Checks whether a CIDR range contains all of the IP addresses in the array.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {boolean?} `true` if all IPs are contained, `false` if any are not, or `null` if `cidrStr` is invalid or
	 * `ipArr` is not an array or an empty array.
	 */
	static containsAll(cidrStr, ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const cidr = this._getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return ipArr.every((ip) => !!this._compareRanges(cidr, ip, '>'));
	}

	/**
	 * Checks whether two IP addresses are equal.
	 *
	 * @param {string | IP} ipStr1 The first IP address to compare.
	 * @param {string | IP} ipStr2 The second IP address to compare.
	 * @returns {boolean?} `true` if the IPs are equal, `false` if not, or `null` if either input is invalid.
	 */
	static equals(ipStr1, ipStr2) {
		const ip1 = this._getRangeObject(ipStr1);
		if (ip1 === null) {
			return null;
		}
		return this._checkEquality(ip1, ipStr2);
	}

	/**
	 * Checks whether an IP address is equal to any address in a given array.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to check against.
	 * @returns {number?} The index of the first match in `ipArr`, `-1` if none match, or `null` if `ipStr` is invalid.
	 */
	static equalsAny(ipStr, ipArr) {
		const ip1 = this._getRangeObject(ipStr);
		if (ip1 === null) {
			return null;
		}
		return ipArr.findIndex((ip2) => !!this._checkEquality(ip1, ip2));
	}

	/**
	 * Checks whether an IP address is equal to all addresses in a given array.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to compare against.
	 * @returns {boolean?} `true` if all addresses are equal to `ipStr`, `false` otherwise, or `null` if `ipStr` is invalid
	 * or `ipArr` is not an array or an empty array.
	 */
	static equalsAll(ipStr, ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const ip1 = this._getRangeObject(ipStr);
		if (ip1 === null) {
			return null;
		}
		return ipArr.every((ip2) => !!this._checkEquality(ip1, ip2));
	}

	/**
	 * Returns the narrowest CIDR range that encompasses two IP addresses or subnets,
	 * provided they are of the same version (both IPv4 or both IPv6).
	 *
	 * @param {string | IP} ip1 First IP address or CIDR to intersect.
	 * @param {string | IP} ip2 Second IP address or CIDR to intersect.
	 * @param {IntersectOptions} [options] Optional prefix length constraints and verbosity flag.
	 * @returns {IP?} An {@link IP} instance representing the narrowest common range, or `null` if:
	 * - Either `ip1` or `ip2` is invalid.
	 * - The IP versions differ (e.g., one is IPv4 and the other is IPv6).
	 */
	static intersect(ip1, ip2, options = {}) {

		const { verbose = false } = options;

		const range1 = this._getRangeObject(ip1);
		const range2 = this._getRangeObject(ip2);
		if (!range1 || !range2) {
			const invalidInputs = [];
			if (!range1) {
				invalidInputs.push(ip1);
			}
			if (!range2) {
				invalidInputs.push(ip2);
			}
			if (verbose) {
				console.warn(`Invalid inputs: ${invalidInputs.join(', ')}.`);
			}
			return null;
		}

		const result = this._getCommonRange(range1, range2, options);
		return result && new IP(result);
	}

}
/**
 * The IP class. Unlike the static {@link IPUtil} class, this class provides several instance methods
 * that can be used to perform validations on the same IP or CIDR address multiple times.
 *
 * To initialize a new instance, use {@link IP.newFromText} or {@link IP.newFromRange}:
 * ```ts
 * const ip = IP.newFromText('fd12:3456:789a:1::1');
 * if (!ip) return;
 * console.log(ip.stringify()); // fd12:3456:789a:1:0:0:0:1
 * ```
 */
class IP extends IPBase {

	/**
	 * Initializes an IP instance from a string.
	 *
	 * @param {string} ipStr An IP- or CIDR-representing string.
	 * @returns {IP?} A new `IP` instance if parsing succeeds, or `null` if the input is invalid.
	 */
	static newFromText(ipStr) {
		const parsed = this._parse(ipStr);
		return parsed && new IP(this._parseRange(parsed.parts, parsed.bitLen));
	}

	/**
	 * Initializes an IP instance from a string and a range (*aka.* a bit length).
	 *
	 * @param {string} ipStr An IP- or CIDR-representing string. If a CIDR string is passed, the `/XX` part
	 * will be overridden by `range`.
	 * @param {number} range The desired CIDR bit length (0–32 for IPv4, 0–128 for IPv6).
	 * @returns {IP?} A new `IP` instance if parsing succeeds, or `null` if the input or range is invalid.
	 * @throws {TypeError} If `range` is not a number.
	 */
	static newFromRange(ipStr, range) {
		if (typeof range !== 'number') {
			throw new TypeError('The "range" parameter for IP.newFromRange must be a number.');
		}
		const parsed = this._parse(ipStr, range);
		return parsed && new IP(this._parseRange(parsed.parts, parsed.bitLen));
	}

	/**
	 * Private constructor. Use {@link IP.newFromText} or {@link IP.newFromRange} to create a new instance.
	 *
	 * @param {RangeObject} range An object containing internal CIDR information.
	 * @hidden
	 */
	constructor(range) {
		super(true);
		/**
		 * @type {number[]}
		 * @readonly
		 * @protected
		 */
		this.first = range.first;
		/**
		 * @type {number[]}
		 * @readonly
		 * @protected
		 */
		this.last = range.last;
		/**
		 * @type {number}
		 * @readonly
		 * @protected
		 */
		this.bitLen = range.bitLen;
		/**
		 * @type {boolean}
		 * @readonly
		 * @protected
		 */
		this.isCidr = range.isCidr;
	}

	/**
	 * Gets a copy of the internal CIDR-related properties.
	 *
	 * @returns {RangeObject} An object containing `first`, `last`, `bitLen`, and `isCidr`.
	 */
	getProperties() {
		return {
			first: this.first.slice(),
			last: this.last.slice(),
			bitLen: this.bitLen,
			isCidr: this.isCidr
		};
	}

	/**
	 * Returns the IP version as a number.
	 *
	 * @returns {4 | 6} The IP version: `4` for IPv4 or `6` for IPv6.
	 */
	get version() {
		if (this.first.length === 4) {
			return 4;
		} else if (this.first.length === 8) {
			return 6;
		} else {
			throw new Error('The internal array of the IP instance seems to be broken.');
		}
	}

	/**
	 * Gets the IP version as a string in the format `IPv4` or `IPv6`.
	 *
	 * @returns {string} A string representation of the IP version.
	 */
	getVersion() {
		return 'IPv' + this.version;
	}

	/**
	 * Returns the stringified form of this IP or CIDR block.
	 *
	 * @param {StringifyOptions} [options] Optional formatting options.
	 * If omitted, a default "sanitized" format will be used.
	 * @returns {string} A properly formatted string representation of the IP or CIDR.
	 *
	 * Note: If the instance was initialized from an imprecise CIDR string,
	 * the output will reflect the corrected internal format.
	 * ```ts
	 * const ip = IP.newFromText('fd12:3456:789a:1::1/64');
	 * ip.stringify(); // fd12:3456:789a:1:0:0:0:0/64
	 * ```
	 */
	stringify(options = {}) {
		const suffix = this.isCidr ? '/' + this.bitLen : '';
		return IP._stringify(this.first, suffix, options);
	}

	/**
	 * Alias for {@link IP.stringify} with default options.
	 *
	 * @returns {string} A stringified representation of the IP.
	 */
	toString() {
		return this.stringify();
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in an abbreviated format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option set to `'short'`.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	abbreviate(capitalize = false) {
		return this.stringify({ capitalize, mode: 'short' });
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in a sanitized format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option unset.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	sanitize(capitalize = false) {
		return this.stringify({ capitalize });
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in a lengthened format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option set to `'long'`.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	lengthen(capitalize = false) {
		return this.stringify({ capitalize, mode: 'long' });
	}

	/**
	 * Checks whether the current instance represents an IPv4 address.
	 *
	 * @param {boolean} [allowCidr=false] Whether to allow a CIDR address.
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv4 address.
	 */
	isIPv4(allowCidr = false) {
		return this.version === 4 && !(!allowCidr && this.isCidr);
	}

	/**
	 * Checks whether the current instance represents an IPv6 address.
	 *
	 * @param {boolean} [allowCidr=false] Whether to allow a CIDR address.
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv6 address.
	 */
	isIPv6(allowCidr = false) {
		return this.version === 6 && !(!allowCidr && this.isCidr);
	}

	/**
	 * Checks whether the current instance represents a CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents a CIDR address.
	 */
	isCIDR() {
		return this.isCidr;
	}

	/**
	 * Checks whether the current instance represents an IPv4 CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv4 CIDR address.
	 */
	isIPv4CIDR() {
		return this.version === 4 && this.isCidr;
	}

	/**
	 * Checks whether the current instance represents an IPv6 CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv6 CIDR address.
	 */
	isIPv6CIDR() {
		return this.version === 6 && this.isCidr;
	}

	/**
	 * Gets the bit length of the current instance.
	 *
	 * This always returns a number between `0-32` for IPv4 and `0-128` for IPv6.
	 * To check whether the current instance represents a CIDR address, use {@link IP.isCIDR}.
	 * @returns {number} The bit length as a number.
	 */
	getBitLength() {
		return this.bitLen;
	}

	/**
	 * Gets range information of the IP instance.
	 *
	 * @overload
	 * @param {false} [getInstance=false] Whether to get the start and end IP addresses as IP instances.
	 * @param {StringifyOptions} [options] Optional formatting options for the `cidr`, `first`,
	 * and `last` properties.
	 * @returns {{ bitLen: number; cidr: string; first: string; last: string; }}
	 */
	/**
	 * Gets range information of the IP instance.
	 *
	 * @overload
	 * @param {true} getInstance Whether to get the start and end IP addresses as IP instances.
	 * @param {StringifyOptions} [options] Optional formatting options for the `cidr` property.
	 * @returns {{ bitLen: number; cidr: string; first: IP; last: IP; }}
	 */
	/**
	 * @param {boolean} [getInstance]
	 * @param {StringifyOptions} [options]
	 * @returns {{ bitLen: number; cidr: string; first: string | IP; last: string | IP; }}
	 */
	getRange(getInstance, options = {}) {
		let { first, last, bitLen, isCidr } = this.getProperties();
		if (!getInstance) {
			const firstStr = IP._stringify(first, '', options);
			return {
				bitLen,
				cidr: firstStr + '/' + bitLen,
				first: firstStr,
				last: IP._stringify(last, '', options)
			};
		} else {
			first = first.slice();
			last = last.slice();
			const bl = first.length === 4 ? 32 : 128;
			isCidr = false;
			return {
				bitLen,
				cidr: IP._stringify(first, '/' + bitLen, options),
				first: new IP({ first, last: first, bitLen: bl, isCidr }),
				last: new IP({ first: last, last, bitLen: bl, isCidr })
			};
		}
	}

	/**
	 * Checks whether the IP address associated with this instance is within the CIDR range of another.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the range.
	 * @returns {boolean?} A boolean indicating whether the IP address is within the CIDR range, or
	 * `null` if `cidrStr` is invalid.
	 */
	isInRange(cidrStr) {
		return IP._compareRanges(this.getProperties(), cidrStr, '<');
	}

	/**
	 * Checks whether the IP address associated with this instance is within any of the CIDR ranges in the array.
	 *
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {number} The index of the first matching CIDR in the array, or `-1` if none match.
	 */
	isInAnyRange(cidrArr) {
		const props = this.getProperties();
		return cidrArr.findIndex((cidr) => !!IP._compareRanges(props, cidr, '<'));
	}

	/**
	 * Checks whether the IP address associated with this instance is within all CIDR ranges in the array.
	 *
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {boolean?} `true` if the IP is within all CIDRs, `false` if not, or `null` if `cidrArr` is
	 * not an array or an empty array.
	 */
	isInAllRanges(cidrArr) {
		if (!Array.isArray(cidrArr) || !cidrArr.length) {
			return null;
		}
		const props = this.getProperties();
		return cidrArr.every((cidr) => !!IP._compareRanges(props, cidr, '<'));
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains the specified IP address.
	 *
	 * @param {string | IP} ipStr The target IP address to check.
	 * @returns {boolean?} `true` if the CIDR range contains `ipStr`, `false` if not, or `null` if `ipStr` is invalid.
	 */
	contains(ipStr) {
		return IP._compareRanges(this.getProperties(), ipStr, '>');
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains any of the IP addresses in the array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {number} The index of the first match in `ipArr`, or `-1` if none match.
	 */
	containsAny(ipArr) {
		const props = this.getProperties();
		return ipArr.findIndex((ip) => !!IP._compareRanges(props, ip, '>'));
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains all of the IP addresses in the array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {boolean?} `true` if all IPs are contained, `false` if any are not, or `null` if
	 * `ipArr` is not an array or an empty array.
	 */
	containsAll(ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const props = this.getProperties();
		return ipArr.every((ip) => !!IP._compareRanges(props, ip, '>'));
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to a given IP address.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @returns {boolean?} `true` if the IPs are equal, `false` if not, or `null` if `ipStr` is invalid.
	 */
	equals(ipStr) {
		const props = this.getProperties();
		return IP._checkEquality(props, ipStr);
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to any address in a given array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to check against.
	 * @returns {number} The index of the first match in `ipArr`, or `-1` if none match.
	 */
	equalsAny(ipArr) {
		const props = this.getProperties();
		return ipArr.findIndex((ip) => !!IP._checkEquality(props, ip));
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to all addresses in a given array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to compare against.
	 * @returns {boolean?} `true` if all addresses are equal to this IP instance, `false` otherwise, or
	 * `null` if `ipArr` is not an array or an empty array.
	 */
	equalsAll(ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const props = this.getProperties();
		return ipArr.every((ip) => !!IP._checkEquality(props, ip));
	}

	/**
	 * Returns the narrowest CIDR range that encompasses this IP and another IP address or subnet,
	 * provided they are of the same version (both IPv4 or both IPv6).
	 *
	 * @param {string | IP} ip IP address or CIDR string to intersect with this instance.
	 * @param {IntersectOptions} [options] Optional prefix length constraints and verbosity flag.
	 * @returns {IP?} A new {@link IP} instance representing the narrowest common CIDR range, or `null` if:
	 * - The input `ip` is invalid.
	 * - The IP versions differ.
	 */
	intersect(ip, options = {}) {

		const { verbose = false } = options;

		const range1 = this.getProperties();
		const range2 = IP._getRangeObject(ip);
		if (!range2) {
			if (verbose) {
				console.warn(`Invalid input: ${ip}.`);
			}
			return null;
		}

		const result = IP._getCommonRange(range1, range2, options);
		return result && new IP(result);
	}

}
/**
 * @typedef {import('./IP-types.ts').Parsed} Parsed
 * @typedef {import('./IP-types.ts').RangeObject} RangeObject
 * @typedef {import('./IP-types.ts').StringifyOptions} StringifyOptions
 * @typedef {import('./IP-types.ts').StrictCIDR} StrictCIDR
 * @typedef {import('./IP-types.ts').ConditionPredicate} ConditionPredicate
 * @typedef {import('./IP-types.ts').IntersectOptions} IntersectOptions
 */
module.exports = {
	IPUtil,
	IP
};
//</nowiki>