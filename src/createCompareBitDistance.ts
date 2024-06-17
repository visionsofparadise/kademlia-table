import { getBitDistance } from "./getBitDistance";

export const createCompareBitDistance = (id: Uint8Array) => {
	return (a: Uint8Array, b: Uint8Array) => {
		const ad = getBitDistance(id, a);
		const bd = getBitDistance(id, b);

		return ad > bd ? 1 : ad < bd ? -1 : 0;
	};
};
