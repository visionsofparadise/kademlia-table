import { compare } from "uint8array-tools";
import { KademliaTable } from ".";

const crypto = require("crypto").webcrypto;
global.crypto = crypto;

const randomId = () => crypto.getRandomValues(new Uint8Array(8));

const TEST_TABLE_CONFIGURATION: KademliaTable.Options<Uint8Array> = { getId: (node) => node };

it("returns true when node added", () => {
	const table = new KademliaTable(randomId(), TEST_TABLE_CONFIGURATION);

	const node = randomId();

	const result = table.add(node);

	expect(result).toBe(true);
	expect(table.length).toBe(1);
});

it("returns false when node added but bucket full", () => {
	const customTable = new KademliaTable(new Uint8Array(8).fill(0x00), { ...TEST_TABLE_CONFIGURATION, bucketSize: 10 });

	const node = new Uint8Array(8).fill(0xff);

	for (let i = 0; i < 20; i++) {
		const nodeI = new Uint8Array(8).fill(0xff);

		nodeI.set([i], 7);

		customTable.add(nodeI);
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

	const resultNode = table.get(node);

	expect(compare(node, resultNode!)).toBe(0);
});

it("gets correct d for id", () => {
	const customTable = new KademliaTable(new Uint8Array(8).fill(0x00), TEST_TABLE_CONFIGURATION);

	const node = new Uint8Array(8).fill(0x00);

	node.set([0xff], 7);

	customTable.add(node);

	const d = customTable.getDistance(node);

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

it("sends node to tail of bucket on markSuccess", () => {
	const customTable = new KademliaTable(new Uint8Array(8).fill(0x00), TEST_TABLE_CONFIGURATION);

	const node = new Uint8Array(8).fill(0xff);

	customTable.add(node);

	for (let i = 0; i < 10; i++) {
		const nodeI = new Uint8Array(8).fill(0xff);

		node.set([i], 7);

		customTable.add(nodeI);
	}

	customTable.markSuccess(node);

	const getNode = customTable.buckets[customTable.getDistance(node)]?.items.at(-1)?.node;

	expect(compare(getNode!, node)).toBe(0);
});
