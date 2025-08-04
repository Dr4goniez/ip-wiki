/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe } from 'mocha';
import { assert } from 'chai';
import { IP, IPUtil } from '../src/IP';

/**
 * Extracts the keys of all static methods from a given class or object type.
 *
 * @template T An object or class whose static method names are to be extracted.
 */
type StaticMethodKeys<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Maps method names to their respective parameter tuple types.
 *
 * @template T An object or class with methods.
 */
type MethodParamsMap<T> = {
	[K in StaticMethodKeys<T>]: T[K] extends (...args: infer P) => any ? P : never;
};

/**
 * Represents a single test case for a static method.
 *
 * @template T An object or class containing static methods.
 * @template K A key of T that refers to a static method.
 */
interface TestCase<T, K extends StaticMethodKeys<T>> {
	/**
	 * The arguments to pass to the method.
	 */
	args: MethodParamsMap<T>[K];
	/**
	 * The expected return value from the method.
	 */
	expected: unknown;
	/**
	 * Whether to stringify the actual result (using `toString()`) before comparing with {@link expected}.
	 */
	stringify?: true;
	/**
	 * Whether an error is expected when the method is called.
	 */
	error?: true;
}

/**
 * A mapping of static method names to their test cases.
 * Each method is associated with an array of test cases
 * whose arguments are properly typed for that method.
 *
 * @template T A class or object with static methods.
 */
type TestMap<T> = Map<
	StaticMethodKeys<T>,
	TestCase<T, StaticMethodKeys<T>>[]
>;

/**
 * Calls a static method on a class-like object with typed arguments.
 *
 * @template T The class or object containing static methods.
 * @template K The method name, limited to callable static keys.
 */
const callStaticMethod = <
	T,
	K extends StaticMethodKeys<T>
>(
	cls: T,
	method: K,
	args: MethodParamsMap<T>[K]
): T[K] extends (...args: any[]) => infer R ? R : never => {
	const fn = cls[method];
	if (typeof fn !== 'function') {
		throw new TypeError(`Property ${String(method)} is not callable`);
	}
	return fn.bind(cls)(...args) as any;
};

/**
 * Serializes function arguments for display in test case descriptions.
 *
 * @param args The arguments to serialize.
 * @returns A JS-like representation of the arguments in parentheses.
 */
const joinArgs = (...args: unknown[]): string => {
	const seen = new WeakSet();

	const serialize = (arg: unknown): string => {
		switch (typeof arg) {
			case 'string':
				return `'${arg}'`;
			case 'number':
			case 'boolean':
			case 'undefined':
			case 'bigint':
			case 'symbol':
				return String(arg);
			case 'function':
				return arg.toString().replace(/\s+/g, ' ').slice(0, 60) + '...';
			case 'object':
				if (arg === null) return 'null';
				if (seen.has(arg)) return '[Circular]';
				seen.add(arg);
				try {
					return JSON.stringify(arg, (_, val) => {
						if (typeof val === 'function') {
							return val.toString().replace(/\s+/g, ' ');
						}
						return val;
					});
				} catch {
					return '[Unserializable]';
				}
			default:
				return '[Unknown]';
		}
	};

	return `(${args.map(serialize).join(', ')})`;
};

/**
 * A mapping of IPUtil static method names to their test cases.
 */
const ipUtilMap: TestMap<typeof IPUtil> = new Map([
	['sanitize', [
		// Basic IPv4 address
		{
			args: ['192.168.0.1'] as const,
			expected: '192.168.0.1',
		},
		// Zero-padded IPv4, should coerced into `{ format: 'default' }`
		{
			args: ['192.168.000.001', { format: 'long' }] as const,
			expected: '192.168.0.1',
		},
		// Uppercase hex segments for IPv6
		{
			args: ['fd12:3456:789a:1::1', { capitalize: true }] as const,
			expected: 'FD12:3456:789A:1:0:0:0:1',
		},
		// Condensed IPv6, should coerced into `{ format: 'default' }`
		{
			args: ['fd12:3456:789a:1::1', { format: 'short' }] as const,
			expected: 'fd12:3456:789a:1:0:0:0:1',
		},
		// The deprecated `mode` should work the same way
		{
			args: ['fd12:3456:789a:1::1', { mode: 'short' } as any] as const,
			expected: 'fd12:3456:789a:1:0:0:0:1',
		},
		// CIDR with normalization
		{
			args: ['fd12:3456:789a:1::1/64'] as const,
			expected: 'fd12:3456:789a:1:0:0:0:0/64',
		},
		// Full-length CIDR suppressed (default)
		{
			args: ['192.168.0.1/32'] as const,
			expected: '192.168.0.1',
		},
		// Full-length CIDR not suppressed
		{
			args: ['192.168.0.1/32', { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
		},
		// Invalid IP input
		{
			args: ['invalid_ip'] as const,
			expected: null,
		},
		// Rejected by predicate
		{
			args: ['192.168.0.1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: null,
		},
		// Accepted by predicate
		{
			args: ['fd12::1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: 'fd12:0:0:0:0:0:0:1',
		},
		// CIDR rejected by predicate
		{
			args: ['fd12::1/64', {
				conditionPredicate: (version, isCidr) => version === 6 && !isCidr,
			}] as const,
			expected: null,
		},
		// CIDR accepted by predicate with the prefix corrected
		{
			args: ['192.168.0.1/24', {
				conditionPredicate: (version, isCidr) => version === 4 && isCidr,
			}] as const,
			expected: '192.168.0.0/24',
		},
	]],
	['abbreviate', [
		// Basic IPv4 address
		{
			args: ['192.168.0.1'] as const,
			expected: '192.168.0.1',
		},
		// Zero-padded IPv4, should coerced into `{ format: 'short' }`
		{
			args: ['192.168.000.001', { format: 'long' }] as const,
			expected: '192.168.0.1',
		},
		// Uppercase hex segments for IPv6
		{
			args: ['fd12:3456:789a:1::1', { capitalize: true }] as const,
			expected: 'FD12:3456:789A:1::1',
		},
		// Condensed IPv6, should coerced into `{ format: 'short' }`
		{
			args: ['::1', { format: 'default' }] as const,
			expected: '::1',
		},
		// The deprecated `mode` should work the same way
		{
			args: ['::1', { mode: 'default' } as any] as const,
			expected: '::1',
		},
		// CIDR with aggressive shortening and prefix correction
		{
			args: ['fd12:3456:789a:1::1/64'] as const,
			expected: 'fd12:3456:789a:1::/64',
		},
		// Full-length CIDR suppressed (default)
		{
			args: ['192.168.0.1/32'] as const,
			expected: '192.168.0.1',
		},
		// Full-length CIDR not suppressed
		{
			args: ['192.168.0.1/32', { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
		},
		// Invalid IP input
		{
			args: ['invalid_ip'] as const,
			expected: null,
		},
		// Rejected by predicate
		{
			args: ['192.168.0.1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: null,
		},
		// Accepted by predicate
		{
			args: ['fd12::1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: 'fd12::1',
		},
		// CIDR rejected by predicate
		{
			args: ['fd12::1/64', {
				conditionPredicate: (version, isCidr) => version === 6 && !isCidr,
			}] as const,
			expected: null,
		},
		// CIDR accepted by predicate with the prefix corrected
		{
			args: ['192.168.0.1/24', {
				conditionPredicate: (version, isCidr) => version === 4 && isCidr,
			}] as const,
			expected: '192.168.0.0/24',
		},
	]],
	['lengthen', [
		// Basic IPv4 address
		{
			args: ['192.168.0.1'] as const,
			expected: '192.168.000.001',
		},
		// Zero-padded IPv4, should coerced into `{ format: 'long' }`
		{
			args: ['192.168.000.001', { format: 'short' }] as const,
			expected: '192.168.000.001',
		},
		// Uppercase hex segments for IPv6
		{
			args: ['fd12:3456:789a:1::1', { capitalize: true }] as const,
			expected: 'FD12:3456:789A:0001:0000:0000:0000:0001',
		},
		// Condensed IPv6, should coerced into `{ format: 'long' }`
		{
			args: ['1::', { format: 'default' }] as const,
			expected: '0001:0000:0000:0000:0000:0000:0000:0000',
		},
		// The deprecated `mode` should work the same way
		{
			args: ['1::', { mode: 'default' } as any] as const,
			expected: '0001:0000:0000:0000:0000:0000:0000:0000',
		},
		// CIDR with zeros padded and prefix corrected
		{
			args: ['fd12:3456:789a:1::1/64'] as const,
			expected: 'fd12:3456:789a:0001:0000:0000:0000:0000/64',
		},
		// Full-length CIDR suppressed (default)
		{
			args: ['192.168.0.1/32'] as const,
			expected: '192.168.000.001',
		},
		// Full-length CIDR not suppressed
		{
			args: ['192.168.0.1/32', { suppressFullLengthCidr: false }] as const,
			expected: '192.168.000.001/32',
		},
		// Invalid IP input
		{
			args: ['invalid_ip'] as const,
			expected: null,
		},
		// Rejected by predicate
		{
			args: ['192.168.0.1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: null,
		},
		// Accepted by predicate
		{
			args: ['fd12::1', {
				conditionPredicate: (version) => version === 6,
			}] as const,
			expected: 'fd12:0000:0000:0000:0000:0000:0000:0001',
		},
		// CIDR rejected by predicate
		{
			args: ['fd12::1/64', {
				conditionPredicate: (version, isCidr) => version === 6 && !isCidr,
			}] as const,
			expected: null,
		},
		// CIDR accepted by predicate with the prefix corrected
		{
			args: ['192.168.0.1/24', {
				conditionPredicate: (version, isCidr) => version === 4 && isCidr,
			}] as const,
			expected: '192.168.000.000/24',
		},
	]],
	['isIP', [
		{
			args: ['192.168.0.1'] as const,
			expected: true
		},
		// Invalid IPv4-like string
		{
			args: ['192.168.0.256'] as const,
			expected: false
		},
		// Invalid IPv6-like string
		{
			args: ['fd12:3456:789a:1:::1'] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24'] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24', true] as const,
			expected: true
		},
		// Full-length CIDR (1)
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234/128'] as const,
			expected: false
		},
		// Full-length CIDR (2)
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234/128', true] as const,
			expected: true
		},
		// Full-length CIDR (3)
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234/128', 'strict'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/24', 'strict'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/33', 'strict'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/24', 'strict', { mode: 'long' } as any] as const, // mode test
			expected: '192.168.000.000/24'
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'strict', { format: 'short', capitalize: true }] as const,
			expected: 'FD12:3456:789A:1::/64'
		},
	]],
	['isIPv4', [
		{
			args: ['192.168.0.1'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/24'] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24', true] as const,
			expected: true
		},
		{
			args: ['fd12::1'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/24', 'strict', { mode: 'default' } as any] as const, // mode test
			expected: '192.168.0.0/24'
		},
		{
			args: ['192.168.0.1/24', 'strict', { format: 'long' }] as const,
			expected: '192.168.000.000/24'
		},
	]],
	['isIPv6', [
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1::/64'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::/64', true] as const,
			expected: true
		},
		{
			args: ['192.168.0.1'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'strict', { mode: 'default' } as any] as const, // mode test
			expected: 'fd12:3456:789a:1:0:0:0:0/64'
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'strict', { format: 'long' }] as const,
			expected: 'fd12:3456:789a:0001:0000:0000:0000:0000/64'
		},
	]],
	['isCIDR', [
		{
			args: ['192.168.0.1'] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24'] as const,
			expected: true
		},
		{
			args: ['192.168.0.1/32'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1:0:0:0:0/64', 'strict'] as const,
			expected: true
		},
		{
			args: ['fd12::1/64', 'strict', { mode: 'default' } as any] as const,
			expected: 'fd12:0:0:0:0:0:0:0/64'
		},
		{
			args: ['fd12::1/64', 'strict', { format: 'short' }] as const,
			expected: 'fd12::/64'
		},
	]],
	['isIPv4CIDR', [
		{
			args: ['192.168.0.1'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/32'] as const,
			expected: true
		},
		{
			args: ['192.168.0.1/24'] as const,
			expected: true
		},
		{
			args: ['fd12::1/64'] as const,
			expected: false
		},
		{
			args: ['fd12::1/64', 'strict'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/24', 'strict', { mode: 'long' } as any] as const,
			expected: '192.168.000.000/24'
		},
		{
			args: ['192.168.0.1/24', 'strict', { format: 'short', capitalize: true }] as const,
			expected: '192.168.0.0/24'
		},
	]],
	['isIPv6CIDR', [
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234/128'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1::1/64'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/24'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/24', 'strict'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'strict', { mode: 'default' } as any] as const, // mode test
			expected: 'fd12:3456:789a:1:0:0:0:0/64'
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'strict', { format: 'long' }] as const,
			expected: 'fd12:3456:789a:0001:0000:0000:0000:0000/64'
		},
	]],
	['isInRange', [
		{
			args: ['192.168.0.100', '192.168.0.0/24'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', 'fd12:3456:789a:1:dead:beef:0::/112'] as const,
			expected: true
		},
		{
			args: ['192.168.0.100', 'fd12:3456:789a:1:dead:beef:0::/112'] as const,
			expected: false
		},
		{
			args: ['invalid_ip', '192.168.0.0/24'] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/25', '192.168.0.0/24'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/23', '192.168.0.0/24'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1:dead::/80', 'fd12:3456:789a:1::/64'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a::/48', 'fd12:3456:789a:1::/64'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1', '192.168.0.1/32', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['192.168.0.16/30', '192.168.0.0/24', { excludeEquivalent: false }] as const,
			expected: true
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/64', 'fd12:3456:789a:1:0:0:0:0/64', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1:0:0:0:0/63', { excludeEquivalent: false }] as const,
			expected: true
		},
	]],
	['isInAnyRange', [
		{
			args: ['192.168.0.100', ['192.168.1.0/24', '192.168.0.0/24']] as const,
			expected: 1
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', ['fd12:3456:789a:2::/64', 'fd12:3456:789a:1::/64']] as const,
			expected: 1
		},
		{
			args: ['192.168.0.100', ['192.168.1.0/24', '192.168.2.0/24']] as const,
			expected: -1
		},
		{
			args: ['invalid_ip', ['192.168.0.0/24']] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/25', ['192.168.0.0/24', '192.168.0.0/23']] as const,
			expected: 0
		},
		{
			args: ['192.168.0.0/23', ['192.168.0.0/24', '192.168.0.0/25']] as const,
			expected: -1
		},
		{
			args: ['fd12:3456:789a:1:dead::/80', ['fd12:3456:789a:2::/64', 'fd12:3456:789a:1::/64']] as const,
			expected: 1
		},
		{
			args: ['fd12:3456:789a::/48', ['fd12:3456:789a::/50', 'fd12:3456:789a:1::/64']] as const,
			expected: -1
		},
		{
			args: ['192.168.0.1/32', ['192.168.0.1', '192.168.0.0/31'], { excludeEquivalent: true }] as const,
			expected: 1
		},
		{
			args: ['192.168.0.16/32', ['192.168.0.16', '192.168.0.0/27'], { excludeEquivalent: false }] as const,
			expected: 0
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/64', ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1::/63'], { excludeEquivalent: true }] as const,
			expected: 1
		},
		{
			args: ['fd12:3456:789a:1::/64', ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1::/63'], { excludeEquivalent: false }] as const,
			expected: 0
		},
	]],
	['isInAllRanges', [
		{
			args: ['192.168.0.16', ['192.168.0.0/24', '192.168.0.0/27']] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1:dead:beef:0::/112']] as const,
			expected: true
		},
		{
			args: ['192.168.0.16', ['192.168.0.0/24', '192.168.1.0/24']] as const,
			expected: false
		},
		{
			args: ['invalid_ip', ['192.168.0.0/24']] as const,
			expected: null
		},
		{
			args: ['192.168.0.16', []] as const,
			expected: null
		},
		{
			args: ['192.168.0.16', {}] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/25', ['192.168.0.0/24', '192.168.0.0/23']] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/23', ['192.168.0.0/24', '192.168.0.0/25']] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1:dead::/80', ['fd12:3456:789a:1:de00::/72', 'fd12:3456:789a:1::/64']] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a::/48', ['fd12:3456:789a::/50', 'fd12:3456:789a:1::/64']] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/32', ['192.168.0.1', '192.168.0.0/31'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/32', ['192.168.0.1', '192.168.0.0/31'], { excludeEquivalent: false }] as const,
			expected: true
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/64', ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1::/63'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::/64', ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1::/63'], { excludeEquivalent: false }] as const,
			expected: true
		},
	]],
	['contains', [
		{
			args: ['192.168.0.0/24', '192.168.0.100'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0::/112', 'fd12:3456:789a:1:dead:beef:0:1234'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0::/112', '192.168.0.100'] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24', 'invalid_ip'] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/24', '192.168.0.0/25'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/24', '192.168.0.0/23'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1:dead::/80'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1::/64', 'fd12:3456:789a::/48'] as const,
			expected: false
		},
		{
			args: ['192.168.0.1/32', '192.168.0.1', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/24', '192.168.0.16/30', { excludeEquivalent: false }] as const,
			expected: true
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/64', 'fd12:3456:789a:1:0:0:0:1/64', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::1/64', 'fd12:3456:789a:1:0:0:0:1/64', { excludeEquivalent: false }] as const,
			expected: true
		},
	]],
	['containsAny', [
		{
			args: ['192.168.0.0/24', ['192.168.1.0/24', '192.168.0.100']] as const,
			expected: 1
		},
		{
			args: ['fd12:3456:789a:1::/64', ['fd12:3456:789a:2::/64', 'fd12:3456:789a:1:dead:beef:0:1234']] as const,
			expected: 1
		},
		{
			args: ['192.168.1.0/24', ['192.168.0.100', '192.168.2.0/24']] as const,
			expected: -1
		},
		{
			args: ['invalid_ip', ['192.168.0.0/24']] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/31', ['192.168.0.0/31', '192.168.0.1/32'], { excludeEquivalent: true }] as const,
			expected: 1
		},
		{
			args: ['192.168.0.0/31', ['192.168.0.0/31', '192.168.0.1/32'], { excludeEquivalent: false }] as const,
			expected: 0
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/63', ['fd12:3456:789a:1::/63', 'fd12:3456:789a:1::/64'], { excludeEquivalent: true }] as const,
			expected: 1
		},
		{
			args: ['fd12:3456:789a:1::/63', ['fd12:3456:789a:1::/63', 'fd12:3456:789a:1::/64'], { excludeEquivalent: false }] as const,
			expected: 0
		},
	]],
	['containsAll', [
		{
			args: ['192.168.0.0/24', ['192.168.0.16', '192.168.0.0/27']] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1::/64', ['fd12:3456:789a:1:dead:beef:0:1234', 'fd12:3456:789a:1:dead:beef:0::/112']] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/24', ['192.168.0.16', '192.168.1.0/24']] as const,
			expected: false
		},
		{
			args: ['invalid_ip', ['192.168.0.0/24']] as const,
			expected: null
		},
		{
			args: ['192.168.0.16', []] as const,
			expected: null
		},
		{
			args: ['192.168.0.16', {}] as const,
			expected: null
		},
		{
			args: ['192.168.0.0/31', ['192.168.0.1', '192.168.0.0/31'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['192.168.0.0/31', ['192.168.0.1', '192.168.0.0/31'], { excludeEquivalent: false }] as const,
			expected: true
		},
		// The first CIDR is inaccurate
		{
			args: ['fd12:3456:789a:1::1/63', ['fd12:3456:789a:1::/63', 'fd12:3456:789a:1::/64'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1::/63', ['fd12:3456:789a:1::/63', 'fd12:3456:789a:1::/64'], { excludeEquivalent: false }] as const,
			expected: true
		},
	]],
	['equals', [
		{
			args: ['192.168.0.1/32', '192.168.0.1'] as const,
			expected: true
		},
		{
			args: ['192.168.0.0/30', '192.168.0.0/31'] as const,
			expected: false
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234/128', 'fd12:3456:789a:1:dead:beef:0:1234'] as const,
			expected: true
		},
		{
			args: ['fd12:3456:789a:1::/64', 'fd12:3456:789a:1::/65'] as const,
			expected: false
		},
		{
			args: ['invalid_ip', '192.168.0.1'] as const,
			expected: null
		},
		{
			args: ['192.168.0.1', 'invalid_ip'] as const,
			expected: null
		},
	]],
	['intersect', [
		{
			args: ['192.168.0.1', '192.168.0.60'] as const,
			expected: '192.168.0.0/26',
			stringify: true
		},
		{
			args: ['192.168.0.1', '192.168.0.60', { minV4: 27 }] as const,
			expected: null
		},
		{
			args: ['192.168.0.1', '192.168.0.60', { maxV4: 25 }] as const,
			expected: null
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', 'fd12:3456:789a:2:cef7:1:50ef:1234'] as const,
			expected: 'fd12:3456:789a:0:0:0:0:0/62',
			stringify: true
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', 'fd12:3456:789a:2:cef7:1:50ef:1234', { minV6: 63 }] as const,
			expected: null
		},
		{
			args: ['fd12:3456:789a:1:dead:beef:0:1234', 'fd12:3456:789a:2:cef7:1:50ef:1234', { maxV6: 61 }] as const,
			expected: null
		},
		{
			args: ['192.168.0.1', 'invalid_ip'] as const,
			expected: null
		},
		{
			args: ['192.168.0.1', 'fd12:3456:789a:1:dead:beef:0:1234'] as const,
			expected: null
		}
	]]
]);

describe('IPUtil', () => {
	ipUtilMap.forEach((arr, method) => {
		arr.forEach(({ args, expected, stringify, error }) => {
			describe(String(method) + joinArgs(...args), () => {
				const inst = stringify ? 'an IP instance representing ' : '';
				const msg = error
					? 'should throw an error'
					: `should return ${inst}${expected}`;
				it(msg, () => {
					if (error) {
						assert.throw(() => callStaticMethod(IPUtil, method, args));
						return;
					}
					const result = callStaticMethod(IPUtil, method, args);
					if (stringify) {
						if (result instanceof IP) {
							assert.strictEqual(result.toString(), expected);
						} else {
							assert.fail(`Expected an IP instance for method ${String(method)}`);
						}
					} else {
						assert.strictEqual(result, expected);
					}
				});
			});
		});
	});
});

const ips = {
	/** `192.168.0.1/32` */
	'0': IP.newFromText('192.168.0.1/32', { suppressFullLengthCidr: false })!,
	/** `fd12:3456:789a:2:0:0:50ef:1234/128` */
	'1': IP.newFromText('fd12:3456:789a:2:0:0:50ef:1234/128', { suppressFullLengthCidr: false })!,
	/** 192.168.0.128/24, base address: 192.168.0.0/24 */
	'2': IP.newFromText('192.168.0.128/24')!,
	/** fd12:3456:789a:2:8000::/64, base address: fd12:3456:789a:2::/64 */
	'3': IP.newFromText('fd12:3456:789a:2:8000::/64')!,
};
for (const key in ips) {
	const instance = ips[key as keyof typeof ips];
	if (!(instance instanceof IP)) {
		throw new TypeError(`ips[${key}] is not an IP instance.`);
	}
}

/**
 * A mapping of IP static method names to their test cases.
 */
const ipStaticMap: TestMap<typeof IP> = new Map([
	['newFromText', [
		{
			args: ['192.168.0.1/32'] as const,
			expected: '192.168.0.1',
			stringify: true
		},
		{
			args: ['192.168.0.1/32', { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
			stringify: true
		},
		{
			args: ['192.168.0.1/32', {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234/128'] as const,
			expected: 'fd12:3456:789a:2:cef7:1:50ef:1234',
			stringify: true
		},
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234/128', { suppressFullLengthCidr: false }] as const,
			expected: 'fd12:3456:789a:2:cef7:1:50ef:1234/128',
			stringify: true
		},
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234/128', {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 6 && !isCidr
			}] as const,
			expected: null
		},
		{
			args: [ips[0]] as const,
			expected: '192.168.0.1',
			stringify: true
		},
		{
			args: [ips[0], { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
			stringify: true
		},
		{
			args: [ips[0], {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
		{
			args: [ips[1]] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234',
			stringify: true
		},
		{
			args: [ips[1], { suppressFullLengthCidr: false }] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234/128',
			stringify: true
		},
		{
			args: [ips[1], {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
	]],
	['newFromRange', [
		// IPv4 /32 -> /30
		{
			args: ['192.168.0.1', 30] as const,
			expected: '192.168.0.0/30',
			stringify: true
		},
		// IPv4 /32, the full-length prefix should be preserved
		{
			args: ['192.168.0.1/32', 32, { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
			stringify: true
		},
		// IPv4 /32, CIDR input disallowed
		{
			args: ['192.168.0.1/32', 32, {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
		// IPv4 /24 (string) -> /25, the network address should be calculated based on the input string
		{
			args: ['192.168.0.128/24', 25] as const,
			expected: '192.168.0.128/25',
			stringify: true
		},
		// IPv6 /128 -> /112
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234', 112] as const,
			expected: 'fd12:3456:789a:2:cef7:1:50ef:0/112',
			stringify: true
		},
		// IPv6 /128, the full-length prefix should be preserved
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234/128', 128, { suppressFullLengthCidr: false }] as const,
			expected: 'fd12:3456:789a:2:cef7:1:50ef:1234/128',
			stringify: true
		},
		// IPv6 /128, CIDR input disallowed
		{
			args: ['fd12:3456:789a:2:cef7:1:50ef:1234/128', 128, {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 6 && !isCidr
			}] as const,
			expected: null
		},
		// IPv4 /64 (string) -> /65, the network address should be calculated based on the input string
		{
			args: ['fd12:3456:789a:2:8000::/64', 65] as const,
			expected: 'fd12:3456:789a:2:8000:0:0:0/65',
			stringify: true
		},
		{
			args: [ips[0], 30] as const,
			expected: '192.168.0.0/30',
			stringify: true
		},
		{
			args: [ips[0], 32, { suppressFullLengthCidr: false }] as const,
			expected: '192.168.0.1/32',
			stringify: true
		},
		{
			args: [ips[0], 32, {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
		{
			args: [ips[2], 25] as const,
			expected: '192.168.0.0/25',
			stringify: true
		},
		{
			args: [ips[1], 112] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:0/112',
			stringify: true
		},
		{
			args: [ips[1], 128, { suppressFullLengthCidr: false }] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234/128',
			stringify: true
		},
		{
			args: [ips[1], 128, {
				suppressFullLengthCidr: false,
				conditionPredicate: (v, isCidr) => v === 4 && !isCidr
			}] as const,
			expected: null
		},
		{
			args: [ips[3], 65] as const,
			expected: 'fd12:3456:789a:2:0:0:0:0/65',
			stringify: true
		},
	]]
]);

describe('IP', () => {
	ipStaticMap.forEach((arr, method) => {
		arr.forEach(({ args, expected, stringify, error }) => {
			describe(String(method) + joinArgs(...args), () => {
				const inst = stringify ? 'an IP instance representing ' : '';
				const msg = error
					? 'should throw an error'
					: `should return ${inst}${expected}`;
				it(msg, () => {
					if (error) {
						assert.throw(() => callStaticMethod(IP, method, args));
						return;
					}
					const result = callStaticMethod(IP, method, args);
					if (stringify) {
						if (result instanceof IP) {
							assert.strictEqual(result.toString(), expected);
						} else {
							assert.fail(`Expected an IP instance for method ${String(method)}`);
						}
					} else {
						assert.strictEqual(result, expected);
					}
				});
			});
		});
	});
});

/**
 * Extracts keys of all instance methods from a given class prototype.
 *
 * @template T A class whose instance method names are to be extracted.
 */
type InstanceMethodKeys<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

/**
 * Maps instance method names to their respective parameter tuple types.
 *
 * @template T An instance of a class with methods.
 */
type InstanceMethodParamsMap<T> = {
	[K in InstanceMethodKeys<T>]: T[K] extends (...args: infer P) => any ? P : never;
};

/**
 * Represents a single test case for an instance method.
 *
 * @template T An instance of a class.
 * @template K A key of T that refers to an instance method.
 */
interface InstanceTestCase<T, K extends InstanceMethodKeys<T>> {
	/**
	 * The name of the instance method to be tested.
	 */
	method: K;
	/**
	 * The arguments to pass to the method.
	 */
	args: InstanceMethodParamsMap<T>[K];
	/**
	 * The expected return value from the method.
	 */
	expected: unknown;
	/**
	 * Enables stringification of the result before comparing with {@link expected}.
	 *
	 * - If `true`, calls `toString()` on the result (assumes it is a stringifiable object, e.g. an IP instance).
	 * - If a `string`, accesses `result[string]`, then calls `toString()` on that value.
	 *   Useful for comparing specific fields within a returned object.
	 */
	stringify?: true | string;
	/**
	 * Whether the method is expected to throw an error when called with {@link args}.
	 */
	error?: true;
}

/**
 * A mapping of instance method names to their test cases.
 *
 * @template T A class instance.
 */
type InstanceTestMap<T> = Map<
	T,
	InstanceTestCase<T, InstanceMethodKeys<T>>[]
>;

/**
 * Calls an instance method on a class instance with typed arguments.
 *
 * @template T The instance containing methods.
 * @template K The method name, limited to callable instance keys.
 */
const callInstanceMethod = <
	T,
	K extends InstanceMethodKeys<T>
>(
	instance: T,
	method: K,
	args: InstanceMethodParamsMap<T>[K]
): T[K] extends (...args: any[]) => infer R ? R : never => {
	const fn = instance[method];
	if (typeof fn !== 'function') {
		throw new TypeError(`Property ${String(method)} is not callable`);
	}
	return fn.apply(instance, args) as any;
};

/**
 * Constructs a strongly typed test case object for instance methods, preserving the method name,
 * its parameters, and expected return value.
 *
 * This utility supports methods with overloads by allowing you to explicitly specify the method's
 * type signature, ensuring correct type inference for both the `args` and `expected` fields.
 *
 * @template T The class or object type containing the method.
 * @template K The key of the instance method being tested.
 * @template M The specific function signature (overload) of the method.
 *
 * @param method The name of the instance method to test.
 * @param args The arguments to call the method with.
 * @param expected The expected return value from calling the method.
 * @returns A test case object used for instance method testing.
 */
const testCase = <
	T,
	K extends InstanceMethodKeys<T>,
	M extends T[K] & ((...args: any[]) => any)
>(
	method: K,
	args: Parameters<M>,
	expected: ReturnType<M>
): InstanceTestCase<T, K> => {
	return { method, args, expected };
};

const ipInstanceMap: InstanceTestMap<IP> = new Map([
	[ips[0], [
		{
			method: 'getProperties',
			args: [] as const,
			expected: {
				first: [ 192, 168, 0, 1 ],
				last: [ 192, 168, 0, 1 ],
				bitLen: 32,
				isCidr: true
			}
		},
		{
			method: 'getVersion',
			args: [] as const,
			expected: 'IPv4'
		},
		{
			method: 'stringify',
			args: [] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'stringify',
			args: [{ format: 'default' }] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'stringify',
			args: [{ format: 'short' }] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'stringify',
			args: [{ format: 'long' }] as const,
			expected: '192.168.000.001/32'
		},
		{
			method: 'stringify',
			args: [{ mode: 'short' } as any] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'stringify',
			args: [{ mode: 'long' } as any] as const,
			expected: '192.168.000.001/32'
		},
		{
			method: 'abbreviate',
			args: [true] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'sanitize',
			args: [true] as const,
			expected: '192.168.0.1/32'
		},
		{
			method: 'lengthen',
			args: [true] as const,
			expected: '192.168.000.001/32'
		},
		{
			method: 'isIPv4',
			args: [] as const,
			expected: false
		},
		{
			method: 'isIPv4',
			args: [true] as const,
			expected: true
		},
		{
			method: 'isIPv6',
			args: [] as const,
			expected: false
		},
		{
			method: 'isIPv6',
			args: [true] as const,
			expected: false
		},
		{
			method: 'isCIDR',
			args: [] as const,
			expected: true
		},
		{
			method: 'isIPv4CIDR',
			args: [] as const,
			expected: true
		},
		{
			method: 'isIPv6CIDR',
			args: [] as const,
			expected: false
		},
		{
			method: 'getBitLength',
			args: [] as const,
			expected: 32
		},
		{
			method: 'getRange',
			args: [],
			expected: {
				bitLen: 32,
				cidr: '192.168.0.1/32',
				first: '192.168.0.1',
				last: '192.168.0.1'
			}
		},
		testCase('getRange', [false, { format: 'long' }], {
			bitLen: 32,
			cidr: '192.168.000.001/32',
			first: '192.168.000.001',
			last: '192.168.000.001'
		}),
		{
			method: 'getRange',
			args: [true] as const,
			expected: '192.168.0.1',
			stringify: 'first'
		},
		{
			method: 'getRange',
			args: [true, { mode: 'long' } as any] as const,
			expected: '192.168.0.1', // `long` is applied to `cidr`, `last` is an IP instance
			stringify: 'last'
		},
		{
			method: 'isInRange',
			args: ['192.168.0.0/24'] as const,
			expected: true
		},
		{
			method: 'isInRange',
			args: ['192.168.0.1', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'isInRange',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'isInRange',
			args: [ips[2]] as const,
			expected: true
		},
		{
			method: 'isInAnyRange',
			args: [['192.168.0.0/24']] as const,
			expected: 0
		},
		{
			method: 'isInAnyRange',
			args: [['192.168.0.1'], { excludeEquivalent: true }] as const,
			expected: -1
		},
		{
			method: 'isInAnyRange',
			args: [['invalid_ip']] as const,
			expected: -1
		},
		{
			method: 'isInAnyRange',
			args: [['invalid_ip', ips[2]]] as const,
			expected: 1
		},
		{
			method: 'isInAllRanges',
			args: [['192.168.0.0/24']] as const,
			expected: true
		},
		{
			method: 'isInAllRanges',
			args: [['192.168.0.1'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'isInAllRanges',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'isInAllRanges',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'isInAllRanges',
			args: [[ips[2]]] as const,
			expected: true
		},
		{
			method: 'contains',
			args: ['192.168.0.1'] as const,
			expected: true
		},
		{
			method: 'contains',
			args: ['192.168.0.1', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'contains',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'contains',
			args: [ips[0]] as const,
			expected: true
		},
		{
			method: 'containsAny',
			args: [['192.168.0.1']] as const,
			expected: 0
		},
		{
			method: 'containsAny',
			args: [['192.168.0.1'], { excludeEquivalent: true }] as const,
			expected: -1
		},
		{
			method: 'containsAny',
			args: [['invalid_ip']] as const,
			expected: -1
		},
		{
			method: 'containsAny',
			args: [['invalid_ip', ips[0]]] as const,
			expected: 1
		},
		{
			method: 'containsAll',
			args: [['192.168.0.1']] as const,
			expected: true
		},
		{
			method: 'containsAll',
			args: [['192.168.0.1'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'containsAll',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'containsAll',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'containsAll',
			args: [[ips[0]]] as const,
			expected: true
		},
		{
			method: 'equals',
			args: ['192.168.0.1'] as const,
			expected: true
		},
		{
			method: 'equals',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'equals',
			args: [ips[0]] as const,
			expected: true
		},
		{
			method: 'equalsAny',
			args: [['192.168.0.0', '192.168.0.1']] as const,
			expected: 1
		},
		{
			method: 'equalsAny',
			args: [['invalid_ip', '192.168.0.0']] as const,
			expected: -1
		},
		{
			method: 'equalsAny',
			args: [[ips[0], 'invalid_ip']] as const,
			expected: 0
		},
		{
			method: 'equalsAll',
			args: [['192.168.0.0', '192.168.0.1']] as const,
			expected: false
		},
		{
			method: 'equalsAll',
			args: [['192.168.0.1', '192.168.0.1/32']] as const,
			expected: true
		},
		{
			method: 'equalsAll',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'equalsAll',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'equalsAll',
			args: [[ips[0]]] as const,
			expected: true
		},
		{
			method: 'intersect',
			args: ['192.168.0.63'] as const,
			expected: '192.168.0.0/26',
			stringify: true
		},
		{
			method: 'intersect',
			args: ['192.168.0.63', { minV4: 27 }] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['192.168.0.63', { maxV4: 25 }] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['::1'] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: [ips[2]] as const,
			expected: '192.168.0.0/24',
			stringify: true
		},
	]],
	[ips[1], [
		{
			method: 'getProperties',
			args: [] as const,
			expected: {
				first: [64786, 13398, 30874, 2, 0, 0, 20719, 4660],
				last: [64786, 13398, 30874, 2, 0, 0, 20719, 4660],
				bitLen: 128,
				isCidr: true
			}
		},
		{
			method: 'getVersion',
			args: [] as const,
			expected: 'IPv6'
		},
		{
			method: 'stringify',
			args: [] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234/128'
		},
		{
			method: 'stringify',
			args: [{ format: 'default' }] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234/128'
		},
		{
			method: 'stringify',
			args: [{ format: 'short' }] as const,
			expected: 'fd12:3456:789a:2::50ef:1234/128'
		},
		{
			method: 'stringify',
			args: [{ format: 'long' }] as const,
			expected: 'fd12:3456:789a:0002:0000:0000:50ef:1234/128'
		},
		{
			method: 'stringify',
			args: [{ mode: 'short' } as any] as const,
			expected: 'fd12:3456:789a:2::50ef:1234/128'
		},
		{
			method: 'stringify',
			args: [{ mode: 'long' } as any] as const,
			expected: 'fd12:3456:789a:0002:0000:0000:50ef:1234/128'
		},
		{
			method: 'abbreviate',
			args: [true] as const,
			expected: 'FD12:3456:789A:2::50EF:1234/128'
		},
		{
			method: 'sanitize',
			args: [true] as const,
			expected: 'FD12:3456:789A:2:0:0:50EF:1234/128'
		},
		{
			method: 'lengthen',
			args: [true] as const,
			expected: 'FD12:3456:789A:0002:0000:0000:50EF:1234/128'
		},
		{
			method: 'isIPv4',
			args: [] as const,
			expected: false
		},
		{
			method: 'isIPv4',
			args: [true] as const,
			expected: false
		},
		{
			method: 'isIPv6',
			args: [] as const,
			expected: false
		},
		{
			method: 'isIPv6',
			args: [true] as const,
			expected: true
		},
		{
			method: 'isCIDR',
			args: [] as const,
			expected: true
		},
		{
			method: 'isIPv4CIDR',
			args: [] as const,
			expected: false
		},
		{
			method: 'isIPv6CIDR',
			args: [] as const,
			expected: true
		},
		{
			method: 'getBitLength',
			args: [] as const,
			expected: 128
		},
		{
			method: 'getRange',
			args: [],
			expected: {
				bitLen: 128,
				cidr: 'fd12:3456:789a:2:0:0:50ef:1234/128',
				first: 'fd12:3456:789a:2:0:0:50ef:1234',
				last: 'fd12:3456:789a:2:0:0:50ef:1234'
			}
		},
		testCase('getRange', [false, { format: 'long' }], {
			bitLen: 128,
			cidr: 'fd12:3456:789a:0002:0000:0000:50ef:1234/128',
			first: 'fd12:3456:789a:0002:0000:0000:50ef:1234',
			last: 'fd12:3456:789a:0002:0000:0000:50ef:1234'
		}),
		{
			method: 'getRange',
			args: [true] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234',
			stringify: 'first'
		},
		{
			method: 'getRange',
			args: [true, { mode: 'long' } as any] as const,
			expected: 'fd12:3456:789a:2:0:0:50ef:1234', // `long` is applied to `cidr`, `last` is an IP instance
			stringify: 'last'
		},
		{
			method: 'isInRange',
			args: ['fd12:3456:789a:2::/64'] as const,
			expected: true
		},
		{
			method: 'isInRange',
			args: ['fd12:3456:789a:2:0:0:50ef:1234', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'isInRange',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'isInRange',
			args: [ips[3]] as const,
			expected: true
		},
		{
			method: 'isInAnyRange',
			args: [['fd12:3456:789a:2::/64']] as const,
			expected: 0
		},
		{
			method: 'isInAnyRange',
			args: [['fd12:3456:789a:2:0:0:50ef:1234'], { excludeEquivalent: true }] as const,
			expected: -1
		},
		{
			method: 'isInAnyRange',
			args: [['invalid_ip']] as const,
			expected: -1
		},
		{
			method: 'isInAnyRange',
			args: [['invalid_ip', ips[3]]] as const,
			expected: 1
		},
		{
			method: 'isInAllRanges',
			args: [['fd12:3456:789a:2::/64']] as const,
			expected: true
		},
		{
			method: 'isInAllRanges',
			args: [['fd12:3456:789a:2:0:0:50ef:1234'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'isInAllRanges',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'isInAllRanges',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'isInAllRanges',
			args: [[ips[3]]] as const,
			expected: true
		},
		{
			method: 'contains',
			args: ['fd12:3456:789a:2:0:0:50ef:1234'] as const,
			expected: true
		},
		{
			method: 'contains',
			args: ['fd12:3456:789a:2:0:0:50ef:1234', { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'contains',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'contains',
			args: [ips[1]] as const,
			expected: true
		},
		{
			method: 'containsAny',
			args: [['fd12:3456:789a:2:0:0:50ef:1234']] as const,
			expected: 0
		},
		{
			method: 'containsAny',
			args: [['fd12:3456:789a:2:0:0:50ef:1234'], { excludeEquivalent: true }] as const,
			expected: -1
		},
		{
			method: 'containsAny',
			args: [['invalid_ip']] as const,
			expected: -1
		},
		{
			method: 'containsAny',
			args: [['invalid_ip', ips[1]]] as const,
			expected: 1
		},
		{
			method: 'containsAll',
			args: [['fd12:3456:789a:2:0:0:50ef:1234']] as const,
			expected: true
		},
		{
			method: 'containsAll',
			args: [['fd12:3456:789a:2:0:0:50ef:1234'], { excludeEquivalent: true }] as const,
			expected: false
		},
		{
			method: 'containsAll',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'containsAll',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'containsAll',
			args: [[ips[1]]] as const,
			expected: true
		},
		{
			method: 'equals',
			args: ['fd12:3456:789a:2:0:0:50ef:1234'] as const,
			expected: true
		},
		{
			method: 'equals',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'equals',
			args: [ips[1]] as const,
			expected: true
		},
		{
			method: 'equalsAny',
			args: [['fd12:3456:789a:2:0:0:50ef:1230', 'fd12:3456:789a:2:0:0:50ef:1234']] as const,
			expected: 1
		},
		{
			method: 'equalsAny',
			args: [['invalid_ip', 'fd12:3456:789a:2:0:0:50ef:1230']] as const,
			expected: -1
		},
		{
			method: 'equalsAny',
			args: [[ips[1], 'invalid_ip']] as const,
			expected: 0
		},
		{
			method: 'equalsAll',
			args: [['fd12:3456:789a:2:0:0:50ef:1230', 'fd12:3456:789a:2:0:0:50ef:1234']] as const,
			expected: false
		},
		{
			method: 'equalsAll',
			args: [['fd12:3456:789a:2:0:0:50ef:1234', 'fd12:3456:789a:2:0:0:50ef:1234/128']] as const,
			expected: true
		},
		{
			method: 'equalsAll',
			args: [[]] as const,
			expected: null
		},
		{
			method: 'equalsAll',
			args: [{}] as const,
			expected: null
		},
		{
			method: 'equalsAll',
			args: [[ips[1]]] as const,
			expected: true
		},
		{
			method: 'intersect',
			args: ['fd12:3456:789a:2:0:1::'] as const,
			expected: 'fd12:3456:789a:2:0:0:0:0/95',
			stringify: true
		},
		{
			method: 'intersect',
			args: ['fd12:3456:789a:2:0:1::', { minV6: 96 }] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['fd12:3456:789a:2:0:1::', { maxV6: 94 }] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['invalid_ip'] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: ['192.168.0.1'] as const,
			expected: null
		},
		{
			method: 'intersect',
			args: [ips[3]] as const,
			expected: 'fd12:3456:789a:2:0:0:0:0/64',
			stringify: true
		},
	]]
]);

describe('IP', () => {
	ipInstanceMap.forEach((arr, instance) => {
		arr.forEach(({ method, args, expected, stringify, error }) => {
			describe(String(method) + joinArgs(...args), () => {
				const inst = stringify ? 'an IP instance representing ' : '';
				const msg = error
					? 'should throw an error'
					: `should return ${inst}${expected}`;
				it(msg, () => {
					if (error) {
						assert.throw(() => callInstanceMethod(instance, method, args));
						return;
					}
					const result = callInstanceMethod(instance, method, args);
					if (stringify) {
						if (typeof stringify === 'string') {
							const value = result?.[stringify as keyof typeof result] as unknown;
							if (typeof value === 'object' && value !== null && 'toString' in value) {
								assert.strictEqual((value as { toString(): string }).toString(), expected);
							} else if (typeof value === 'string') {
								assert.strictEqual(value, expected);
							} else {
								assert.fail(`Cannot stringify property ${stringify} from result of method ${String(method)}`);
							}
						} else if (result instanceof IP) {
							assert.strictEqual(result.toString(), expected);
						} else {
							assert.fail(`Expected an IP instance for method ${String(method)}`);
						}
					} else if (typeof result === 'object' && result !== null) {
						assert.deepEqual(result, expected);
					} else {
						assert.strictEqual(result, expected);
					}
				});
			});
		});
	});
});