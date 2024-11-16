import { randomBytes } from "node:crypto";
import { KademliaTable } from ".";

const randomId = () => randomBytes(8);

const TEST_TABLE_CONFIGURATION: KademliaTable.Options<Buffer> = { getId: (node) => node };

it("returns true when node added", () => {
	const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = randomId();

	const result = table.add(node);

	expect(result).toBe(true);
	expect(table.length).toBe(1);
});

it("returns false when node added but bucket full", () => {
	const customTable = new KademliaTable(Buffer.from("00000000", "hex"), { ...TEST_TABLE_CONFIGURATION, bucketSize: 10 });

	const node = Buffer.from(`ffffffff`, "hex");

	for (let i = 0; i < 20; i++) {
		customTable.add(Buffer.from(`fffffff${i.toString(10)}`, "hex"));
	}

	const result = customTable.add(node);

	expect(result).toBe(false);
	expect(customTable.length).toBe(10);
});

it("returns true when table has node", () => {
	const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = randomId();

	table.add(node);

	const result = table.has(node);

	expect(result).toBe(true);
});

it("returns false when table does not have node", () => {
	const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const result = table.has(randomId());

	expect(result).toBe(false);
});

it("gets a node", () => {
	const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = randomId();

	table.add(node);

	const resultNode = table.getById(node);

	expect(resultNode).toStrictEqual(node);
});

it("gets correct d for id", () => {
	const customTable = new KademliaTable(Buffer.from("0000", "hex"), TEST_TABLE_CONFIGURATION);

	const node = Buffer.from("00ff", "hex");

	customTable.add(node);

	const d = customTable.getBitwiseDistance(node);

	expect(d).toBe(8);
});

it("gets 20 closest nodes out of 1000", () => {
	const customTable = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = randomId();

	customTable.add(node);

	for (let i = 0; i < 1000; i++) {
		customTable.add(randomId());
	}

	const closestNodes = customTable.listClosestToId(node, 20);

	expect(closestNodes[0]).toStrictEqual(node);
	expect(closestNodes.length).toBe(20);
});

it("sends node to tail of bucket on get", () => {
	const customTable = new KademliaTable(Buffer.from("00000000", "hex"), TEST_TABLE_CONFIGURATION);

	const node = Buffer.from(`ffffffff`, "hex");

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		customTable.add(Buffer.from(`fffffff${i.toString(10)}`, "hex"));
	}

	const result = customTable.getById(node);

	expect(result).toStrictEqual(node);
	expect(customTable.buckets[customTable.getBitwiseDistance(node)].at(-1)).toStrictEqual(node);
});

it("does not send node to tail of bucket on peek", () => {
	const customTable = new KademliaTable(Buffer.from("00000000", "hex"), TEST_TABLE_CONFIGURATION);

	const node = Buffer.from(`ffffffff`, "hex");

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		customTable.add(Buffer.from(`fffffff${i.toString(10)}`, "hex"));
	}

	const result = customTable.peekById(node);

	expect(result).toStrictEqual(node);
	expect(customTable.buckets[customTable.getBitwiseDistance(node)].at(0)).toStrictEqual(node);
});
