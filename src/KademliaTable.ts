import { getBitDistance } from "./getBitDistance";

export namespace KademliaTable {
	export interface Configuration<K extends string> {
		idKey: K;
		bucketSize?: number;
	}
}

export class KademliaTable<K extends string, N extends { [x in K]: Uint8Array }> {
	readonly idKey: K;

	readonly bucketSize: number;
	readonly bucketCount: number;
	readonly buckets: Array<Array<N>>;

	constructor(readonly id: Uint8Array, configuration: KademliaTable.Configuration<K>) {
		this.idKey = configuration.idKey;

		this.bucketSize = configuration.bucketSize || 20;
		this.bucketCount = id.length * 8 + 1;
		this.buckets = Array.apply(null, Array(this.bucketCount)).map(() => []);
	}

	get nodes() {
		return this.buckets.flat();
	}

	add(node: N) {
		const i = this.getBucketIndex(node[this.idKey]);

		if (this.has(node[this.idKey], i)) return true;

		const bucket = this.buckets[i];

		if (bucket.length >= this.bucketSize) return false;

		this.buckets[i] = bucket.concat(node);

		return true;
	}

	has(id: Uint8Array, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].some((node) => node[this.idKey] === id);
	}

	get(id: Uint8Array, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].find((node) => node[this.idKey] === id);
	}

	getBucketIndex(id: Uint8Array) {
		return getBitDistance(this.id, id);
	}

	closest(id: Uint8Array, limit: number = this.bucketSize) {
		const i = this.getBucketIndex(id);

		return this.getNodes(i, limit);
	}

	update(id: Uint8Array, body: Partial<Omit<N, "id">>) {
		const i = this.getBucketIndex(id);

		if (!this.has(id, i)) return false;

		const index = this.buckets[i].findIndex((node) => node[this.idKey] === id);

		const updatedNode = {
			...this.buckets[i][index],
			...body,
		};

		this.buckets[i][index] = updatedNode;

		return updatedNode;
	}

	seen(id: Uint8Array) {
		const i = this.getBucketIndex(id);

		const node = this.get(id, i);

		if (!node) return false;

		this.buckets[i] = this.buckets[i].filter((node) => node[this.idKey] !== id).concat([node]);

		return true;
	}

	remove(id: Uint8Array, i: number = this.getBucketIndex(id)) {
		this.buckets[i] = this.buckets[i].filter((node) => node[this.idKey] !== id);

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
