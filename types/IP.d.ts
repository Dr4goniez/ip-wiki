/**
 * The IPUtil class. Unlike the {@link IP} class, this class provides several static methods
 * that can be used to perform validations on an IP or CIDR address just once, or on varying
 * IP or CIDR addresses.
 *
 * Note that inherited protected methods are only for internal use.
 */
export class IPUtil extends IPBase {
    /**
     * Sanitize an IP-representing string. For example:
     * * `192.168.0.1` (for IPv4 addresses, same as {@link IPUtil.abbreviate})
     * * `fd12:3456:789a:1:0:0:0:0`
     *
     * Note that inaccurate CIDRs will be corrected:
     * * input: `fd12:3456:789a:1::1/64`
     * * output: `fd12:3456:789a:1:0:0:0:0/64`
     * @param {string} ipStr
     * @param {boolean} [capitalize] Whether to capitalize the output, which defaults to `false`.
     * @returns {string?} `null` if the input string does not represent an IP address.
     */
    static sanitize(ipStr: string, capitalize?: boolean | undefined): string | null;
    /**
     * Abbreviate an IP-representing string. For example:
     * * `192.168.0.1` (for IPv4 addresses, same as {@link IPUtil.sanitize})
     * * `fd12:3456:789a:1::`
     *
     * Note that inaccurate CIDRs will be corrected:
     * * input: `fd12:3456:789a:1:0:0:0:1/64`
     * * output: `fd12:3456:789a:1::/64`
     * @param {string} ipStr
     * @param {boolean} [capitalize] Whether to capitalize the output, which defaults to `false`.
     * @returns {string?} `null` if the input string does not represent an IP address.
     */
    static abbreviate(ipStr: string, capitalize?: boolean | undefined): string | null;
    /**
     * Lengthen an IP-representing string. For example:
     * * `192.168.000.001`
     * * `fd12:3456:789a:0001:0000:0000:0000:0000`
     *
     * Note that inaccurate CIDRs will be corrected:
     * * input: `fd12:3456:789a:1:0:0:0:1/64`
     * * output: `fd12:3456:789a:0001:0000:0000:0000:0000/64`
     * @param {string} ipStr
     * @param {boolean} [capitalize] Whether to capitalize the output, which defaults to `false`.
     * @returns {string?} `null` if the input string does not represent an IP address.
     */
    static lengthen(ipStr: string, capitalize?: boolean | undefined): string | null;
    /**
     * @typedef {"strict"} StrictCIDR
     * The strict CIDR validation mode checks whether the input string is a genuinely valid CIDR,
     * ruling out unmatching prefixes. For example, the (potential) CIDR `192.168.0.1/24` is
     * inaccurate in that the prefix `192.168.0.1` should instead be `192.168.0.0` for the bit
     * length of `24`.
     *
     * Without the validation mode on, `IP.isIP('192.168.0.1/24', true)` still returns `true`. But
     * with it on, the relevant method will return a corrected CIDR as a string instead of a boolean
     * if the input string is potentially valid as a CIDR but is inaccurate:
     * ```
     * // allowCidr: false or undefined
     * console.log(IP.isIP('192.168.0.1')); // true
     * console.log(IP.isIP('192.168.0.1/24')); // false
     * // allowCidr: true
     * console.log(IP.isIP('192.168.0.1', true)); // true
     * console.log(IP.isIP('192.168.0.1/24', true)); // true
     * console.log(IP.isIP('192.168.0.0/24', true)); // true
     * // allowCidr: 'strict'
     * console.log(IP.isIP('192.168.0.1', 'strict')); // true (just as when allowCidr is true)
     * console.log(IP.isIP('192.168.0.1/24', 'strict')); // 192.168.0.0/24
     * console.log(IP.isIP('192.168.0.0/24', 'strict')); // true
     * ```
     */
    /**
     * @callback ConditionPredicate
     * The type of the optional callback function of {@link IPUtil.validate}.
     * @param {4|6} version
     * @param {boolean} isCidr
     * @returns {boolean}
     */
    /**
     * Validate a string as an IP address under certain conditions.
     * @overload
     * @param {string} ipStr
     * @param {boolean} allowCidr
     * @param {ConditionPredicate} [conditionPredicate]
     * @returns {boolean}
     */
    /**
     * Validate a string as an IP address under certain conditions.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} allowCidr
     * @param {ConditionPredicate} [conditionPredicate]
     * @param {StringifyOptions} [options]
     * @returns {boolean|string}
     */
    /**
     * @param {string} ipStr
     * @param {boolean|StrictCIDR} allowCidr
     * @param {ConditionPredicate} [conditionPredicate]
     * @param {StringifyOptions} [options]
     * @returns {boolean|string}
     * @private
     * @internal
     */
    private static validate;
    /**
     * Evaluate whether a string represents an IP address.
     * @overload
     * @param {string} ipStr
     * @param {boolean} [allowCidr] Whether to allow CIDRs, which defaults to `false`.
     * @returns {boolean}
     */
    static isIP(ipStr: string, allowCidr?: boolean | undefined): boolean;
    /**
     * Evaluate whether a string represents an IP address, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} allowCidr
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isIP(ipStr: string, allowCidr: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether a string represents an IPv4 address.
     * @overload
     * @param {string} ipStr
     * @param {boolean} [allowCidr] Whether to allow CIDRs, which defaults to `false`.
     * @returns {boolean}
     */
    static isIPv4(ipStr: string, allowCidr?: boolean | undefined): boolean;
    /**
     * Evaluate whether a string represents an IPv4 address, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} allowCidr
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isIPv4(ipStr: string, allowCidr: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether a string represents an IPv6 address.
     * @overload
     * @param {string} ipStr
     * @param {boolean} [allowCidr] Whether to allow CIDRs, which defaults to `false`.
     * @returns {boolean}
     */
    static isIPv6(ipStr: string, allowCidr?: boolean | undefined): boolean;
    /**
     * Evaluate whether a string represents an IPv6 address, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} allowCidr
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isIPv6(ipStr: string, allowCidr: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether a string represents a CIDR.
     * @overload
     * @param {string} ipStr
     * @returns {boolean}
     */
    static isCIDR(ipStr: string): boolean;
    /**
     * Evaluate whether a string represents a CIDR, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} mode
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isCIDR(ipStr: string, mode: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether a string represents an IPv4 CIDR.
     * @overload
     * @param {string} ipStr
     * @returns {boolean}
     */
    static isIPv4CIDR(ipStr: string): boolean;
    /**
     * Evaluate whether a string represents an IPv4 CIDR, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} mode
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isIPv4CIDR(ipStr: string, mode: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether a string represents an IPv6 CIDR.
     * @overload
     * @param {string} ipStr
     * @returns {boolean}
     */
    static isIPv6CIDR(ipStr: string): boolean;
    /**
     * Evaluate whether a string represents an IPv6 CIDR, with the {@link StrictCIDR|strict CIDR validation mode} on.
     * @overload
     * @param {string} ipStr
     * @param {StrictCIDR} mode
     * @param {StringifyOptions} [options] Optional specifications of how the output CIDR string should
     * be formatted.
     * @returns {boolean|string}
     */
    static isIPv6CIDR(ipStr: string, mode: "strict", options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): boolean | string;
    /**
     * Evaluate whether the IP address associated with `ipStr` is within another IP range.
     * @param {string|IP} ipStr
     * @param {string|IP} range
     * @returns {boolean?} `null` when either of the input IP addresses is (or both are) invalid.
     */
    static isInRange(ipStr: string | IP, range: string | IP): boolean | null;
    /**
     * Evaluate whether the IP address associated with `ipStr` is within any IP range
     * specified as an array.
     * @param {string|IP} ipStr
     * @param {(string|IP)[]} ranges An array of IP- or CIDR-representing strings or IP instances.
     * @returns {number?} The index number of the first match in the `ranges` array, or `-1` if there is
     * no match. `null` will be returned if `ipStr` does not represent an IP address.
     */
    static isInAnyRange(ipStr: string | IP, ranges: (string | IP)[]): number | null;
    /**
     * Evaluate whether the IP address associated with `ipStr` is within all IP ranges
     * specified as an array.
     * @param {string|IP} ipStr
     * @param {(string|IP)[]} ranges An array of IP- or CIDR-representing strings or IP instances.
     * @returns {boolean?} `null` if:
     * * `ipStr` does not represent an IP address.
     * * `ranges` is not an array or an empty array.
     */
    static isInAllRanges(ipStr: string | IP, ranges: (string | IP)[]): boolean | null;
    /**
     * Evaluate whether the IP address associated with `ipStr1` equals `ipStr2`.
     * @param {string|IP} ipStr1
     * @param {string|IP} ipStr2
     * @returns {boolean?} `null` when either of the input IP addresses is (or both are) invalid.
     */
    static equals(ipStr1: string | IP, ipStr2: string | IP): boolean | null;
    /**
     * Evaluate whether the IP address associated with `ipStr` equals any IP address
     * in the `ips` array.
     * @param {string|IP} ipStr
     * @param {(string|IP)[]} ips An array of IP- or CIDR-representing strings or IP instances.
     * @returns {number?} The index number of the first match in the `ips` array, or `-1` if there is
     * no match. `null` will be returned if `ipStr` does not represent an IP address.
     */
    static equalsToAny(ipStr: string | IP, ips: (string | IP)[]): number | null;
    /**
     * Evaluate whether the IP address associated with `ipStr` equals all IP addresses
     * in the `ips` array.
     * @param {string|IP} ipStr
     * @param {(string|IP)[]} ips An array of IP- or CIDR-representing strings or IP instances.
     * @returns {boolean?} `null` if:
     * * `ipStr` does not represent an IP address.
     * * `ips` is not an array or an empty array.
     */
    static equalsToAll(ipStr: string | IP, ips: (string | IP)[]): boolean | null;
    /**
     * @throws
     * @hidden
     */
    constructor();
}
/**
 * The IP class. Unlike the static {@link IPUtil} class, this class provides several instance methods
 * that can be used to perform validations on the same IP or CIDR address multiple times.
 *
 * Note that inherited protected methods are only for internal use.
 */
export class IP extends IPBase {
    /**
     * Initialize an IP instance from a string.
     * @param {string} ipStr An IP- or CIDR-representing string.
     * @returns {IP?} `null` if the input string is invalid as an IP address.
     */
    static newFromText(ipStr: string): IP | null;
    /**
     * Initialize an IP instance from a string and a range (aka bit length).
     * @param {string} ipStr An IP- or CIDR-representing string. If a CIDR string is passed, the `/XX` part
     * will be overriden by `range`.
     * @param {number} range `0-32` for IPv4, `0-128` for IPv6.
     * @returns {IP?} `null` if:
     * * The input string is not a valid IP address.
     * * The bit length specified by `range` is invalid.
     * @throws If `range` is not a number.
     */
    static newFromRange(ipStr: string, range: number): IP | null;
    /**
     * Private constructor. Use {@link IP.newFromText} instead.
     * @param {RangeObject} range An object that stores CIDR information.
     * @private
     */
    private constructor();
    /**
     * @type {number[]}
     * @readonly
     * @private
     */
    private readonly first;
    /**
     * @type {number[]}
     * @readonly
     * @private
     */
    private readonly last;
    /**
     * @type {number}
     * @readonly
     * @private
     */
    private readonly bitLen;
    /**
     * @type {boolean}
     * @readonly
     * @private
     */
    private readonly isCidr;
    /**
     * Get a copy of the private instance properties as an object.
     * @returns {RangeObject}
     */
    getProperties(): {
        /**
         * An array of decimals that represent the first IP of the CIDR address.
         */
        first: number[];
        /**
         * An array of decimals that represent the last IP of the CIDR address.
         */
        last: number[];
        /**
         * The bit length of the CIDR address.
         */
        bitLen: number;
        /**
         * `false` if the original address was not a CIDR.
         */
        isCidr: boolean;
    };
    /**
     * Return the IP version as a number.
     */
    get version(): 4 | 6;
    /**
     * Get the IP version as a string in the format of `IPvN`.
     */
    getVersion(): string;
    /**
     * Stringify the IP instance.
     * @param {StringifyOptions} [options] Options to specify the format of the output.
     * If not provided, the "sanitized" format will be used.
     * @returns {string}
     * Note that even if the instance was initialized from an inaccurate CIDR string, the output will
     * be in a "corrected" format:
     * ```
     * const ip = IP.newFromText('fd12:3456:789a:1::1/64');
     * ip.stringify(); // fd12:3456:789a:1:0:0:0:0/64
     * ```
     */
    stringify(options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): string;
    /**
     * Evaluate whether the IP address associated with the instance is an IPv4 address.
     * @param {boolean} [allowCidr] Whether to allow a CIDR address, which defaults to false.
     * @returns {boolean}
     */
    isIPv4(allowCidr?: boolean | undefined): boolean;
    /**
     * Evaluate whether the IP address associated with the instance is an IPv6 address.
     * @param {boolean} [allowCidr] Whether to allow a CIDR address, which defaults to false.
     * @returns {boolean}
     */
    isIPv6(allowCidr?: boolean | undefined): boolean;
    /**
     * Evaluate whether the IP address associated with the instance is a CIDR address.
     * @returns {boolean}
     */
    isCIDR(): boolean;
    /**
     * Evaluate whether the IP address associated with the instance is an IPv4 CIDR address.
     * @returns {boolean}
     */
    isIPv4CIDR(): boolean;
    /**
     * Evaluate whether the IP address associated with the instance is an IPv6 CIDR address.
     * @returns {boolean}
     */
    isIPv6CIDR(): boolean;
    /**
     * Get the bit length of the IP instance.
     *
     * Note that this always returns a number between `0-32` for IPv4 and `0-128` for IPv6.
     * To evaluate whether the instance is a CIDR, use {@link IP.isCIDR}.
     * @returns {number}
     */
    getBitLength(): number;
    /**
     * Get range information of the IP instance. The return value includes:
     * * The (forced) CIDR notation of the IP address associated with the instance.
     * * The bit length of the CIDR as a number.
     * * The starting IP address of the CIDR as a *string*.
     * * The ending IP address of the CIDR as a *string*.
     * @overload
     * @param {false} [getObject]
     * @param {StringifyOptions} [options]
     * @returns {{bitLen: number; cidr: string; first: string; last: string;}}
     */
    getRange(getObject?: false | undefined, options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): {
        bitLen: number;
        cidr: string;
        first: string;
        last: string;
    };
    /**
     * Get range information of the IP instance. The return value includes:
     * * The (forced) CIDR notation of the IP address associated with the instance.
     * * The bit length of the CIDR as a number.
     * * The starting IP address of the CIDR as an *IP object*.
     * * The ending IP address of the CIDR as an *IP object*.
     * @overload
     * @param {true} getObject
     * @param {StringifyOptions} [options]
     * @returns {{bitLen: number; cidr: string; first: IP; last: IP;}}
     */
    getRange(getObject: true, options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): {
        bitLen: number;
        cidr: string;
        first: IP;
        last: IP;
    };
    /**
     * Evaluate whether the IP address associated with this intance is within an IP range.
     * @param {string|IP} range
     * @returns {boolean?} `null` when `range` is not a valid IP address.
     */
    isInRange(range: string | IP): boolean | null;
    /**
     * Evaluate whether the IP address associated with this intance is within any IP range
     * in the `ranges` array.
     * @param {(string|IP)[]} ranges An array of IP- or CIDR-representing strings or IP instances.
     * @returns {number} The index number of the first match in the `ranges` array, or `-1` otherwise.
     */
    isInAnyRange(ranges: (string | IP)[]): number;
    /**
     * Evaluate whether the IP address associated with this intance is within all IP ranges
     * in the `ranges` array.
     * @param {(string|IP)[]} ranges An array of IP- or CIDR-representing strings or IP instances.
     * @returns {boolean}
     */
    isInAllRanges(ranges: (string | IP)[]): boolean;
    /**
     * Evaluate whether the IP address associated with this intance equals another IP address.
     * @param {string|IP} ipStr An IP- or CIDR-representing string, or an IP instance.
     * @returns {boolean?} `null` if `ipStr` does not represent an IP address.
     */
    equals(ipStr: string | IP): boolean | null;
    /**
     * Evaluate whether the IP address associated with this intance equals any IP address
     * in the `ips` array.
     * @param {(string|IP)[]} ips An array of IP- or CIDR-representing strings or IP instances.
     * @returns {number} The index number of the first match in the `ranges` array, or `-1` otherwise.
     */
    equalsToAny(ips: (string | IP)[]): number;
    /**
     * Evaluate whether the IP address associated with this intance equals all IP addresses
     * in the `ips` array.
     * @param {(string|IP)[]} ips An array of IP- or CIDR-representing strings or IP instances.
     * @returns {boolean}
     */
    equalsToAll(ips: (string | IP)[]): boolean;
}
/**
 * Abstract class with protected methods.
 * @internal
 */
declare class IPBase {
    /**
     * Return a trimmed string from which all occurrences of unicode bidi characters are removed.
     *
     * "Unicode bidi characters" are special characters shown as red dots in WikiEditor, which can
     * slip into cut-and-pasted strings. When we evaluate whether a string represents an IP address,
     * these can cause serious trouble.
     * @see MediaWikiTitleCodec::splitTitleString in MediaWiki core
     *
     * @param {string} str
     * @returns {string}
     */
    static clean(str: string): string;
    /**
     * @typedef {object} Parsed
     * The return type of `IPBase.parse`.
     * @property {number[]} parts Parts of the IP as an array of decimals.
     * @property {number?} bitLen The bit length if the parsed address is a CIDR.
     */
    /**
     * Parse a string that potentially represents an IP or CIDR address.
     * @param {string} ipStr
     * @param {number} [bitLen] An optional bit length of the IP address.
     * @returns {Parsed?} A parsed object, or `null` when:
     * * `ipStr` is not a string.
     * * `ipStr` does not represent an IP address.
     * * `ipStr` contains an invalid bit length for a CIDR.
     * @protected
     */
    protected static parse(ipStr: string, bitLen?: number | undefined): {
        /**
         * Parts of the IP as an array of decimals.
         */
        parts: number[];
        /**
         * The bit length if the parsed address is a CIDR.
         */
        bitLen: number | null;
    } | null;
    /**
     * @typedef {object} RangeObject
     * The architecture of the internal private properties of an instance of the {@link IP} class
     * (where a copy of the properties can be obtained by {@link IP#getProperties}).
     *
     * This object stores the parsing result of the original IP string, forcibly interpreted as a
     * CIDR address. The "forcible interpretation" stands for the internal conversion of any IP
     * address into a CIDR address, e.g. `192.168.0.1` -> `192.168.0.1/32`, stored as arrays of
     * decimals with a bit length. The `isCidr` property remembers whether the original string
     * really was a CIDR.
     * @property {number[]} first An array of decimals that represent the first IP of the CIDR address.
     * @property {number[]} last An array of decimals that represent the last IP of the CIDR address.
     * @property {number} bitLen The bit length of the CIDR address.
     * @property {boolean} isCidr `false` if the original address was not a CIDR.
     */
    /**
     * Get the start and end IP addresses for the range of `bitLen` as an object of arrays of decimals.
     * @param {number[]} parts
     * @param {number?} bitLen
     * @returns {RangeObject}
     * @protected
     */
    protected static parseRange(parts: number[], bitLen: number | null): {
        /**
         * An array of decimals that represent the first IP of the CIDR address.
         */
        first: number[];
        /**
         * An array of decimals that represent the last IP of the CIDR address.
         */
        last: number[];
        /**
         * The bit length of the CIDR address.
         */
        bitLen: number;
        /**
         * `false` if the original address was not a CIDR.
         */
        isCidr: boolean;
    };
    /**
     * @typedef {object} StringifyOptions
     * @property {"short"|"long"} [mode] The format of the output.
     *
     * `undefined`: Return the IP address in its "sanitized" notation. For example:
     * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
     * * `fd12:3456:789a:1:0:0:0:0`
     *
     * `'short'`: Return the IP address in its shortest notation. For example:
     * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
     * * `fd12:3456:789a:1::`
     *
     * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
     * For example:
     * * `192.168.000.001`
     * * `fd12:3456:789a:0001:0000:0000:0000:0000`
     * @property {boolean} [capitalize] Whether to capitalize the output IP address.
     */
    /**
     * Stringify an array of IP parts in decimals.
     * @param {number[]} decimals
     * @param {string} suffix
     * @param {StringifyOptions} [options]
     * @returns {string}
     * @protected
     */
    protected static stringify(decimals: number[], suffix: string, options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): string;
    /**
     * Change the casing of a string.
     * @param {string} str
     * @param {boolean} [upper] Whether to capitalize the output, which defaults to `false`.
     * @returns {string} The original string if `upper` isn't true.
     * @protected
     */
    protected static modCase(str: string, upper?: boolean | undefined): string;
    /**
     * Parse an IP string into an array and convert back into a string.
     * @param {string} ipStr
     * @param {StringifyOptions} [options]
     * @returns {string?} `null` if the input string does not represent an IP address.
     * @protected
     */
    protected static parseAndStringify(ipStr: string, options?: {
        /**
         * The format of the output.
         *
         * `undefined`: Return the IP address in its "sanitized" notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: 'short'`)
         * * `fd12:3456:789a:1:0:0:0:0`
         *
         * `'short'`: Return the IP address in its shortest notation. For example:
         * * `192.168.0.1` (for IPv4 addresses, same as `mode: undefined`)
         * * `fd12:3456:789a:1::`
         *
         * `'long'`: Return the IP address in its longest notation, with each bit chunk padded with `0`.
         * For example:
         * * `192.168.000.001`
         * * `fd12:3456:789a:0001:0000:0000:0000:0000`
         */
        mode?: "short" | "long" | undefined;
        /**
         * Whether to capitalize the output IP address.
         */
        capitalize?: boolean | undefined;
    } | undefined): string | null;
    /**
     * Check whether a given IP falls within a range.
     * @param {RangeObject} ipObj An object of arrays of the IP parts in decimals.
     * @param {string|IP} ipRange
     * @returns {boolean?} `null` if `ipRange` does not represent an IP address.
     * @protected
     */
    protected static fallsWithin(ipObj: {
        /**
         * An array of decimals that represent the first IP of the CIDR address.
         */
        first: number[];
        /**
         * An array of decimals that represent the last IP of the CIDR address.
         */
        last: number[];
        /**
         * The bit length of the CIDR address.
         */
        bitLen: number;
        /**
         * `false` if the original address was not a CIDR.
         */
        isCidr: boolean;
    }, ipRange: string | IP): boolean | null;
    /**
     * Given an IP string or instance, parse it into an object of arrays of decimals that
     * represent the parts of the first and last IPs.
     * @param {string|IP} ip
     * @returns {RangeObject?} `null` if the input string does not represent an IP address.
     * @protected
     */
    protected static getRangeObject(ip: string | IP): {
        /**
         * An array of decimals that represent the first IP of the CIDR address.
         */
        first: number[];
        /**
         * An array of decimals that represent the last IP of the CIDR address.
         */
        last: number[];
        /**
         * The bit length of the CIDR address.
         */
        bitLen: number;
        /**
         * `false` if the original address was not a CIDR.
         */
        isCidr: boolean;
    } | null;
    /**
     * Check the equality of two IP addresses.
     * @param {RangeObject} ipObj An object of arrays of the IP parts in decimals.
     * @param {string|IP} ipStr An IP- or CIDR-representing string, or an IP instance.
     * @returns {boolean?} `null` if `ipStr` does not represent an IP address.
     * @protected
     */
    protected static checkEquality(ipObj: {
        /**
         * An array of decimals that represent the first IP of the CIDR address.
         */
        first: number[];
        /**
         * An array of decimals that represent the last IP of the CIDR address.
         */
        last: number[];
        /**
         * The bit length of the CIDR address.
         */
        bitLen: number;
        /**
         * `false` if the original address was not a CIDR.
         */
        isCidr: boolean;
    }, ipStr: string | IP): boolean | null;
    /**
     * @param {any} override
     * @throws
     * @hidden
     */
    constructor(override: any);
}
export {};
