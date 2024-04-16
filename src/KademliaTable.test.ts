import { randomBytes } from "node:crypto";
import { KademliaTable } from ".";

const table = new KademliaTable(randomBytes(8).toString("hex"), { encoding: "hex" });

const randomId = () => randomBytes(8).toString("hex");

it("returns the correct distance between ids", () => {
	const idA = "0000";
	const idB = "0001";

	const result = KademliaTable.getDistance(idA, idB, "hex");

	expect(result).toBe(1);
});

it("creates a compare function that correctly sorts ids by distance", () => {
	const targetId = "0000";

	const ids = ["4545", "a5a5", "1111"];

	const compare = KademliaTable.createCompare(targetId, "hex");

	const result = ids.sort(compare);

	expect(result).toStrictEqual(["1111", "4545", "a5a5"]);
});

it("returns true when node added", () => {
	const node = { id: randomId() };

	const result = table.add(node);

	expect(result).toBe(true);
	expect(table.nodes.length).toBe(1);
});

it("returns false when node added but bucket full", () => {
	const customTable = new KademliaTable("00000000", { encoding: "hex", bucketSize: 10 });

	const node = { id: `ffffffff` };

	for (let i = 0; i < 20; i++) {
		customTable.add({ id: `fffffff${i.toString(10)}` });
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
	const customTable = new KademliaTable("0000", { encoding: "hex" });

	const node = { id: "00ff" };

	customTable.add(node);

	const i = customTable.getBucketIndex(node.id);

	expect(i).toBe(8);
});

it("gets 20 closest nodes out of 1000", () => {
	const customTable = new KademliaTable(randomId(), { encoding: "hex" });

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
	const customTable = new KademliaTable("00000000", { encoding: "hex" });

	const node = { id: `ffffffff` };

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		customTable.add({ id: `fffffff${i.toString(10)}` });
	}

	const result = customTable.seen(node.id);

	expect(result).toBe(true);
	expect(customTable.nodes[10]).toStrictEqual(node);
});
