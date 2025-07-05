/**
 * The result type of `IPBase.parse`.
 */
export interface Parsed {
    /**
     * Array of numeric parts:
     * - 4 elements for IPv4 addresses (each `0–255`)
     * - 8 elements for IPv6 addresses (each `0–65535`)
     */
    parts: number[];
    /**
     * CIDR bit length if present, or `null` if unspecified.
     * - Range: `0–32` for IPv4, `0–128` for IPv6.
     */
    bitLen: number | null;
}

/**
 * The structure of the internal private properties of an {@link IP} instance.
 *
 * Represents the parsing result of the original IP string, forcibly interpreted
 * as a CIDR address. "Forcible interpretation" means any address is treated as
 * CIDR internally, even single IPs like `192.168.0.1 → 192.168.0.1/32`.
 *
 * @interface
 */
export interface RangeObject {
	/**
	 * Array of decimals for the first IP in the range.
	 */
	first: number[];
	/**
	 * Array of decimals for the last IP in the range.
	 */
	last: number[];
	/**
	 * CIDR bit length used for the range.
	 */
	bitLen: number;
	/**
	 * `false` if the original address was not a CIDR.
	 */
	isCidr: boolean;
}

/**
 * Options for formatting IP address output.
 */
export interface StringifyOptions {
	/**
	 * Address formatting style:
	 *
	 * - `undefined` (default):
	 *   - IPv4 returns sanitized form (e.g., `192.168.0.1`)
	 *   - IPv6 returns condensed form without aggressive shortening (e.g., `fd12:3456:789a:1:0:0:0:0`)
	 *
	 * - `'short'`: Aggressive shortening for IPv6 using `::` per RFC 5952.
	 *   - IPv4 unchanged from default.
	 *
	 * - `'long'`: Full zero-padded form.
	 *   - IPv4: `192.168.000.001`
	 *   - IPv6: `fd12:3456:789a:0001:0000:0000:0000:0000`
	 */
	mode?: "short" | "long";
	/**
	 * Whether to convert output to uppercase (applies to IPv6 hex segments).
	 */
	capitalize?: boolean;
}

/**
 * The strict CIDR validation mode ensures that CIDR addresses have a matching prefix
 * for the specified bit length. If a CIDR string is technically valid but the prefix
 * does not align with the given bit length, it will be corrected and returned as a string.
 *
 * For example, `192.168.0.1/24` is considered inaccurate because the prefix should be
 * `192.168.0.0` for a /24 subnet. In strict mode, this input is not rejected—instead,
 * it is interpreted as valid and automatically corrected.
 *
 * When strict mode is off, `IPUtil.isIP('192.168.0.1/24', true)` returns `true`.
 * When strict mode is on, the method returns the corrected CIDR string:
 *
 * ```ts
 * // allowCidr: false or undefined
 * console.log(IPUtil.isIP('192.168.0.1')); // true
 * console.log(IPUtil.isIP('192.168.0.1/24')); // false
 *
 * // allowCidr: true
 * console.log(IPUtil.isIP('192.168.0.1', true)); // true
 * console.log(IPUtil.isIP('192.168.0.1/24', true)); // true
 * console.log(IPUtil.isIP('192.168.0.0/24', true)); // true
 *
 * // allowCidr: 'strict'
 * console.log(IPUtil.isIP('192.168.0.1', 'strict')); // true (same as allowCidr: true)
 * console.log(IPUtil.isIP('192.168.0.1/24', 'strict')); // "192.168.0.0/24"
 * console.log(IPUtil.isIP('192.168.0.0/24', 'strict')); // true
 * ```
 */
export type StrictCIDR = "strict";
/**
 * The type of an optional callback function used to filter out IP addresses that do not meet
 * specific conditions.
 *
 * @param version The IP version: `4` or `6`. By default, both are accepted.
 * @param isCidr Indicates whether the address is a CIDR. By default, both CIDRs and non-CIDRs are accepted.
 * @returns Whether the IP address satisfies the specified condition(s).
 */
export type ConditionPredicate = (version: 4 | 6, isCidr: boolean) => boolean;