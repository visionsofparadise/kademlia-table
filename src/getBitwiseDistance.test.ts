import { getBitwiseDistance } from "./getBitwiseDistance";

it("returns the correct distance between buffers", () => {
	const bufferA = Uint8Array.from([0, 0, 0, 0]);
	const bufferB = Uint8Array.from([0, 0, 0, 1]);

	const result = getBitwiseDistance(bufferA, bufferB);

	expect(result).toBe(1);
});