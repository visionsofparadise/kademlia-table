import { compare } from "uint8array-tools";
import { getBitwiseDistance } from "./getBitwiseDistance";

export namespace KademliaTable {
	export interface Options<Node> {
		bucketSize?: number;
		compare?: (nodeA: Node, nodeB: Node) => number;
		getId: (node: Node) => Uint8Array;
	}
}

export class KademliaTable<Node> {
	readonly bucketSize: number;
	readonly buckets: Array<Array<Node>>;
	compare?: (nodeA: Node, nodeB: Node) => number;
	getId: (node: Node) => Uint8Array;

	constructor(public readonly id: Uint8Array, options: KademliaTable.Options<Node>) {
		this.bucketSize = options.bucketSize || 20;
		this.buckets = new Array(id.length * 8 + 1).fill(undefined).map(() => []);
		this.compare = options.compare || (() => 0);
		this.getId = options.getId;
	}

	get length() {
		return this.buckets.reduce((sum, bucket) => sum + bucket.length, 0);
	}

	*[Symbol.iterator](): IterableIterator<Node> {
		for (const bucket of this.buckets) for (const node of bucket) yield node;
	}

	add(node: Node, d: number = this.getBitwiseDistance(this.getId(node))): boolean {
		if (this.has(this.getId(node), d)) return false;

		if (this.buckets[d].length < this.bucketSize) {
			this.buckets[d].push(node);

			return true;
		}

		const bucket = this.buckets[d].slice(0);

		bucket.push(node);

		const sortedBucket = bucket.sort(this.compare);

		this.buckets[d] = sortedBucket.slice(0, this.bucketSize);

		const removedNode = sortedBucket.at(-1)!;

		if (compare(this.getId(node), this.getId(removedNode)) === 0) return false;

		return true;
	}

	clear() {
		for (let i = 0; i < this.buckets.length; i++) this.buckets[i] = [];
	}

	listClosestToId(id: Uint8Array, limit: number = this.buckets.length * this.bucketSize): Array<Node> {
		const d = this.getBitwiseDistance(id);

		return this.getNodes(d, limit);
	}

	get(d: number): Node | undefined {
		const node = this.buckets[d].shift();

		if (node) this.buckets[d].push(node);

		return node;
	}

	getById(id: Uint8Array, d: number = this.getBitwiseDistance(id)): Node | undefined {
		const index = this.buckets[d].findIndex((node) => compare(this.getId(node), id) === 0);

		if (index === -1) return undefined;

		const node = this.buckets[d][index];

		this.buckets[d] = this.buckets[d].splice(index, 1).concat(node);

		return node;
	}

	getBitwiseDistance(id: Uint8Array): number {
		return getBitwiseDistance(this.id, id);
	}

	protected getNodes(d: number, limit: number, depth: number = 0): Array<Node> {
		const offset = (depth % 2 === 0 ? 1 : -1) * Math.ceil(depth / 2);

		if (Math.abs(offset) > Math.max(d, this.buckets.length - 1 - d)) return [];

		const i = d + offset;

		if (0 > i || i > this.buckets.length - 1) return this.getNodes(d, limit, depth + 1);

		const nodes = this.buckets[i].slice(0, limit);

		if (nodes.length >= limit) {
			this.buckets[i] = this.buckets[i].slice(nodes.length).concat(this.buckets[i].slice(0, nodes.length));

			return nodes;
		}

		return nodes.concat(this.getNodes(d, limit - nodes.length, depth + 1));
	}

	has(id: Uint8Array, d: number = this.getBitwiseDistance(id)): boolean {
		return !!this.buckets[d].find((node) => compare(this.getId(node), id) === 0);
	}

	peek(d: number): Node | undefined {
		return this.buckets[d].at(0);
	}

	peekById(id: Uint8Array, d: number = this.getBitwiseDistance(id)): Node | undefined {
		return this.buckets[d].find((node) => compare(this.getId(node), id) === 0);
	}

	update(node: Node, d: number = this.getBitwiseDistance(this.getId(node))): boolean {
		const index = this.buckets[d].findIndex((n) => compare(this.getId(n), this.getId(node)) === 0);

		if (index === -1) return false;

		this.buckets[d][index] = node;

		return true;
	}

	remove(id: Uint8Array, d: number = this.getBitwiseDistance(id)): boolean {
		const index = this.buckets[d].findIndex((node) => compare(this.getId(node), id) === 0);

		if (index === -1) return false;

		this.buckets[d].splice(index, 1);

		return true;
	}
}
