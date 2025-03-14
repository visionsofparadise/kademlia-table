export const getBitwiseDistance = (a: Uint8Array, b: Uint8Array, byteLength: number = Math.min(a.byteLength, b.byteLength)) => {
	for (let i = 0; i < byteLength; i++) {
		const ai = a[i];
		const bi = b[i];

		if (ai !== bi) return 8 * byteLength - (i * 8 + Math.clz32(ai ^ bi) - 24);
	}

	return 0;
};
