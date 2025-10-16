/**
 * Calculates the XOR distance between two node IDs as a bucket index.
 *
 * Returns the number of leading bits that match between the two IDs.
 * Used to determine which bucket a node belongs in.
 *
 * @param a - First node ID
 * @param b - Second node ID
 * @param byteLength - Number of bytes to compare (default: minimum of both lengths)
 *                     If IDs have different lengths, shorter ID is implicitly zero-padded.
 *                     This allows comparing IDs of different lengths, though same-length
 *                     IDs are recommended for consistent routing.
 * @returns Bucket index (0 = identical IDs, max = differ in first bit)
 *
 * @example
 * ```typescript
 * const id1 = new Uint8Array([0x00, 0x00]);
 * const id2 = new Uint8Array([0x00, 0xFF]);
 * getBitwiseDistance(id1, id2); // Returns 8 (differ in 9th bit)
 * ```
 */
export const getBitwiseDistance = (a: Uint8Array, b: Uint8Array, byteLength: number = Math.min(a.byteLength, b.byteLength)) => {
	for (let i = 0; i < byteLength; i++) {
		const ai = a[i];
		const bi = b[i];

		// Math.clz32 counts leading zeros in 32-bit integers
		// Subtract 24 to adjust from 32-bit to 8-bit byte position
		if (ai !== bi) return 8 * byteLength - (i * 8 + Math.clz32(ai ^ bi) - 24);
	}

	// All bytes match - distance 0
	return 0;
};
