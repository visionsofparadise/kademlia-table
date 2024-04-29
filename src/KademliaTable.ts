export namespace KademliaTable {
	export interface Node {
		id: Buffer;
	}

	export interface Configuration {
		bucketSize?: number;
	}
}

export class KademliaTable<N extends KademliaTable.Node = KademliaTable.Node> {
	static getDistance(a: Buffer, b: Buffer) {
		for (let i = 0; i < a.length; i++) {
			const ai = a[i];
			const bi = b[i];

			if (ai !== bi) return 8 * a.length - (i * 8 + Math.clz32(ai ^ bi) - 24);
		}

		return 0;
	}

	static createCompare(id: Buffer) {
		return (a: Buffer, b: Buffer) => {
			const ad = KademliaTable.getDistance(id, a);
			const bd = KademliaTable.getDistance(id, b);

			return ad > bd ? 1 : ad < bd ? -1 : 0;
		};
	}

	readonly bucketSize: number;
	readonly bucketCount: number;
	readonly buckets: Array<Array<N>>;

	constructor(readonly id: Buffer, configuration: KademliaTable.Configuration = {}) {
		this.bucketSize = configuration.bucketSize || 20;
		this.bucketCount = id.length * 8 + 1;
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

	has(id: Buffer, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].some((node) => node.id === id);
	}

	get(id: Buffer, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].find((node) => node.id === id);
	}

	getBucketIndex(id: Buffer) {
		return KademliaTable.getDistance(this.id, id);
	}

	closest(id: Buffer, limit: number = this.bucketSize) {
		const i = this.getBucketIndex(id);

		return this.getNodes(i, limit);
	}

	update(id: Buffer, body: Partial<Omit<N, "id">>) {
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

	seen(id: Buffer) {
		const i = this.getBucketIndex(id);

		const node = this.get(id, i);

		if (!node) return false;

		this.buckets[i] = this.buckets[i].filter((node) => node.id !== id).concat([node]);

		return true;
	}

	remove(id: Buffer, i: number = this.getBucketIndex(id)) {
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
