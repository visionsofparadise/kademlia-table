import type { Encoding } from "node:crypto";

export namespace KademliaTable {
	export interface Node {
		id: string;
	}

	export interface Configuration {
		bucketSize?: number;
		encoding?: Encoding;
	}
}

export class KademliaTable<N extends KademliaTable.Node = KademliaTable.Node> {
	static getDistance(a: string, b: string, encoding?: Encoding) {
		const maxLength = Math.max(a.length, b.length);

		const aBytes = Buffer.from(a.padEnd(maxLength, "0"), encoding);
		const bBytes = Buffer.from(b.padEnd(maxLength, "0"), encoding);

		for (let i = 0; i < aBytes.length; i++) {
			const a = aBytes[i];
			const b = bBytes[i];

			if (a !== b) return 8 * aBytes.length - (i * 8 + Math.clz32(a ^ b) - 24);
		}

		return 0;
	}

	static createCompare(id: string, encoding: Encoding) {
		return (a: string, b: string) => {
			const ad = KademliaTable.getDistance(id, a, encoding);
			const bd = KademliaTable.getDistance(id, b, encoding);

			return ad > bd ? 1 : ad < bd ? -1 : 0;
		};
	}

	readonly bucketSize: number;
	readonly bucketCount: number;
	readonly buckets: Array<Array<N>>;

	readonly encoding: Encoding;

	constructor(readonly id: string, configuration: KademliaTable.Configuration = {}) {
		this.encoding = configuration.encoding || "utf8";

		this.bucketSize = configuration.bucketSize || 20;
		this.bucketCount = Buffer.from(id, this.encoding).length * 8 + 1;
		this.buckets = Array.apply(null, Array(this.bucketCount)).map(() => []);
	}

	get nodes() {
		return this.buckets.flat();
	}

	add(node: N) {
		const i = this.getBucketIndex(node.id);

		const bucket = this.buckets[i];

		if (bucket.length >= this.bucketSize) return false;

		if (this.has(node.id, i)) return true;

		this.buckets[i] = bucket.concat(node);

		return true;
	}

	has(id: string, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].some((node) => node.id === id);
	}

	get(id: string, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].find((node) => node.id === id);
	}

	getBucketIndex(id: string) {
		return KademliaTable.getDistance(this.id, id, this.encoding);
	}

	closest(id: string, limit: number = 3) {
		const i = this.getBucketIndex(id);

		return this.getNodes(i, limit);
	}

	update(id: string, body: Partial<Omit<N, "id">>) {
		const i = this.getBucketIndex(id);

		if (!this.has(id, i)) return false;

		const index = this.buckets[i].findIndex((node) => node.id === id);

		const updatedNode = {
			...this.buckets[i][index],
			...body,
		};

		this.buckets[i][index] = updatedNode;

		return updatedNode;
	}

	seen(id: string) {
		const i = this.getBucketIndex(id);

		const node = this.get(id, i);

		if (!node) return false;

		this.buckets[i] = this.buckets[i].filter((node) => node.id !== id).concat([node]);

		return true;
	}

	remove(id: string, i: number = this.getBucketIndex(id)) {
		this.buckets[i] = this.buckets[i].filter((node) => node.id !== id);

		return true;
	}

	protected getNodes(i0: number, limit: number, depth: number = 0): Array<N> {
		const offset = (depth % 2 === 0 ? 1 : -1) * Math.ceil(depth / 2);

		if (Math.abs(offset) > Math.max(i0, this.bucketCount - 1 - i0)) return [];

		const i = i0 + offset;

		if (0 > i || i > this.bucketCount - 1) return this.getNodes(i0, limit, depth + 1);

		const nodes = this.buckets[i].slice(0, limit);

		if (nodes.length >= limit) return nodes;

		return nodes.concat(this.getNodes(i0, limit - nodes.length, depth + 1));
	}
}
