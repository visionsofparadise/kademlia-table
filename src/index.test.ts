import { randomBytes } from "node:crypto";
import { KademliaTable } from ".";

const table = new KademliaTable(randomBytes(8).toString("hex"), { encoding: "hex" });

it("returns true when node added", () => {
	const node = { id: randomBytes(8).toString("hex") };

	const result = table.add(node);

	expect(result).toBe(true);
	expect(table.nodes.length).toBe(1);
});

it("returns false when node added but bucket full", () => {
	const customTable = new KademliaTable("00000000", { encoding: "hex", k: 10 });

	const node = { id: `ffffffff` };

	for (let i = 0; i < 20; i++) {
		customTable.add({ id: `fffffff${i.toString(10)}` });
	}

	const result = customTable.add(node);

	expect(result).toBe(false);
	expect(customTable.nodes.length).toBe(10);
});

it("returns true when table has node", () => {
	const node = { id: randomBytes(8).toString("hex") };

	table.add(node);

	const result = table.has(node.id);

	expect(result).toBe(true);
});

it("returns false when table does not have node", () => {
	const node = { id: randomBytes(8).toString("hex") };

	const result = table.has(node.id);

	expect(result).toBe(false);
});

it("gets a node", () => {
	const node = { id: randomBytes(8).toString("hex") };

	table.add(node);

	const resultNode = table.get(node.id);

	expect(resultNode).toStrictEqual(node);
});

it("gets correct i for id", () => {
	const customTable = new KademliaTable("0000", { encoding: "hex" });

	const node = { id: "00ff" };

	customTable.add(node);

	const i = customTable.getI(node.id);

	expect(i).toBe(7);
});

it("gets 20 closest nodes out of 40", () => {
	const customTable = new KademliaTable(randomBytes(8).toString("hex"), { encoding: "hex" });

	const node = { id: randomBytes(8).toString("hex") };

	customTable.add(node);

	for (let i = 0; i < 1000; i++) {
		customTable.add({ id: randomBytes(8).toString("hex") });
	}

	const closestNodeIds = customTable.closest(node.id);

	expect(closestNodeIds[0]).toStrictEqual(node);
	expect(closestNodeIds.length).toBe(3);
});

it("sends node to tail of bucket on seen", () => {
	const customTable = new KademliaTable(randomBytes(8).toString("hex"), { encoding: "hex" });

	const node = { id: randomBytes(8).toString("hex") };

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		customTable.add({ id: randomBytes(8).toString("hex") });
	}

	const result = customTable.seen(node.id);

	expect(result).toBe(true);
	expect(customTable.nodes[10]).toStrictEqual(node);
});
