import { getBitwiseDistance } from "./getBitwiseDistance";

export const createCompareBitwiseDistance = (id: Uint8Array) => {
	return (a: Uint8Array, b: Uint8Array) => {
		const ad = getBitwiseDistance(id, a);
		const bd = getBitwiseDistance(id, b);

		return ad > bd ? 1 : ad < bd ? -1 : 0;
	};
};
