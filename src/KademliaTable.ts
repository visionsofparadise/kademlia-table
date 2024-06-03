export namespace KademliaTable {
	export interface Configuration<K extends string> {
		idKey: K;
		bucketSize?: number;
	}
}

export class KademliaTable<K extends string, N extends { [x in K]: Buffer }> {
	static getDistance(a: Buffer, b: Buffer) {
		const length = Math.min(a.length, b.length);

		for (let i = 0; i < length; i++) {
			const ai = a[i];
			const bi = b[i];

			if (ai !== bi) return 8 * length - (i * 8 + Math.clz32(ai ^ bi) - 24);
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

	readonly idKey: K;

	readonly bucketSize: number;
	readonly bucketCount: number;
	readonly buckets: Array<Array<N>>;

	constructor(readonly id: Buffer, configuration: KademliaTable.Configuration<K>) {
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

		const bucket = this.buckets[i];

		if (bucket.length >= this.bucketSize) return false;

		if (this.has(node[this.idKey], i)) return true;

		this.buckets[i] = bucket.concat(node);

		return true;
	}

	has(id: Buffer, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].some((node) => node[this.idKey] === id);
	}

	get(id: Buffer, i: number = this.getBucketIndex(id)) {
		return this.buckets[i].find((node) => node[this.idKey] === id);
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

		const index = this.buckets[i].findIndex((node) => node[this.idKey] === id);

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

		this.buckets[i] = this.buckets[i].filter((node) => node[this.idKey] !== id).concat([node]);

		return true;
	}

	remove(id: Buffer, i: number = this.getBucketIndex(id)) {
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
