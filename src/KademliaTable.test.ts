import { randomBytes } from "node:crypto";
import { KademliaTable } from ".";

const randomId = () => randomBytes(8);

const TEST_TABLE_CONFIGURATION = { idKey: "id" } as const;

const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

it("returns the correct distance between ids", () => {
	const result = KademliaTable.getDistance(Buffer.from("0000", "hex"), Buffer.from("0001", "hex"));

	expect(result).toBe(1);
});

it("creates a compare function that correctly sorts ids by distance", () => {
	const ids = [Buffer.from("4545", "hex"), Buffer.from("a5a5", "hex"), Buffer.from("1111", "hex")];

	const compare = KademliaTable.createCompare(Buffer.from("0000", "hex"));

	const result = [...ids].sort(compare);

	expect(result).toStrictEqual([ids[2], ids[0], ids[1]]);
});

it("returns true when node added", () => {
	const node = { id: randomId() };

	const result = table.add(node);

	expect(result).toBe(true);
	expect(table.nodes.length).toBe(1);
});

it("returns false when node added but bucket full", () => {
	const customTable = new KademliaTable(Buffer.from("00000000", "hex"), { ...TEST_TABLE_CONFIGURATION, bucketSize: 10 });

	const node = { id: Buffer.from(`ffffffff`, "hex") };

	for (let i = 0; i < 20; i++) {
		customTable.add({ id: Buffer.from(`fffffff${i.toString(10)}`, "hex") });
	}

	const result = customTable.add(node);

	expect(result).toBe(false);
	expect(customTable.nodes.length).toBe(10);
});

it("returns true when table has node", () => {
	const node = { id: randomId() };

	table.add(node);

	const result = table.has(node.id);

	expect(result).toBe(true);
});

it("returns false when table does not have node", () => {
	const result = table.has(randomId());

	expect(result).toBe(false);
});

it("gets a node", () => {
	const node = { id: randomId() };

	table.add(node);

	const resultNode = table.get(node.id);

	expect(resultNode).toStrictEqual(node);
});

it("gets correct i for id", () => {
	const customTable = new KademliaTable(Buffer.from("0000", "hex"), TEST_TABLE_CONFIGURATION);

	const node = { id: Buffer.from("00ff", "hex") };

	customTable.add(node);

	const i = customTable.getBucketIndex(node.id);

	expect(i).toBe(8);
});

it("gets 20 closest nodes out of 1000", () => {
	const customTable = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = { id: randomId() };

	customTable.add(node);

	for (let i = 0; i < 1000; i++) {
		customTable.add({ id: randomId() });
	}

	const closestNodeIds = customTable.closest(node.id, 20);

	expect(closestNodeIds[0]).toStrictEqual(node);
	expect(closestNodeIds.length).toBe(20);
});

it("sends node to tail of bucket on seen", () => {
	const customTable = new KademliaTable(Buffer.from("00000000", "hex"), TEST_TABLE_CONFIGURATION);

	const node = { id: Buffer.from(`ffffffff`, "hex") };

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		customTable.add({ id: Buffer.from(`fffffff${i.toString(10)}`, "hex") });
	}

	const result = customTable.seen(node.id);

	expect(result).toBe(true);
	expect(customTable.nodes[10]).toStrictEqual(node);
});
