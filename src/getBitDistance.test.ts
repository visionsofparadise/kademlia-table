import { getBitDistance } from "./getBitDistance";

it("returns the correct distance between buffers", () => {
	const bufferA = Buffer.from("0000", "hex");
	const bufferB = Buffer.from("0001", "hex");

	const result = getBitDistance(bufferA, bufferB);

	expect(result).toBe(1);
});
