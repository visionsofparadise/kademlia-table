import { getBitDistance } from "./getBitDistance";

export const createCompareBitDistance = (id: Buffer) => {
	return (a: Buffer, b: Buffer) => {
		const ad = getBitDistance(id, a);
		const bd = getBitDistance(id, b);

		return ad > bd ? 1 : ad < bd ? -1 : 0;
	};
};
