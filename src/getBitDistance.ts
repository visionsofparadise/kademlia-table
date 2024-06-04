export const getBitDistance = (a: Buffer, b: Buffer) => {
	const length = Math.min(a.length, b.length);

	for (let i = 0; i < length; i++) {
		const ai = a[i];
		const bi = b[i];

		if (ai !== bi) return 8 * length - (i * 8 + Math.clz32(ai ^ bi) - 24);
	}

	return 0;
};
