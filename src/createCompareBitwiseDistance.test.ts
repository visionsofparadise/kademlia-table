import { createCompareBitwiseDistance } from "./createCompareBitwiseDistance";

it("creates a compare function that correctly sorts ids by distance", () => {
	const ids = [Buffer.from("4545", "hex"), Buffer.from("a5a5", "hex"), Buffer.from("1111", "hex")];

	const compare = createCompareBitwiseDistance(Buffer.from("0000", "hex"));

	const result = [...ids].sort(compare);

	expect(result).toStrictEqual([ids[2], ids[0], ids[1]]);
});
