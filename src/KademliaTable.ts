import { getBitDistance } from "./getBitDistance";

export namespace KademliaTable {
	export interface Configuration<K extends string> {
		idKey: K;
		bucketSize?: number;
	}
}

export class KademliaTable<IdKey extends string, Node extends { [x in IdKey]: Uint8Array }> {
	readonly idKey: IdKey;

	readonly bucketSize: number;
	readonly bucketCount: number;
	readonly buckets: Array<Array<Node>>;

	constructor(readonly id: Uint8Array, configuration: KademliaTable.Configuration<IdKey>) {
		this.idKey = configuration.idKey;

		this.bucketSize = configuration.bucketSize || 20;
		this.bucketCount = id.length * 8 + 1;
		this.buckets = Array.apply(null, Array(this.bucketCount)).map(() => []);
	}

	get nodes(): Array<Node> {
		return this.buckets.flat();
	}

	add(node: Node): boolean {
		const i = this.getBucketIndex(node[this.idKey]);

		if (this.has(node[this.idKey], i)) return false;

		const bucket = this.buckets[i];

		if (bucket.length >= this.bucketSize) return false;

		this.buckets[i] = bucket.concat(node);

		return true;
	}

	has(id: Uint8Array, i: number = this.getBucketIndex(id)): boolean {
		let index = this.buckets[i].length;

		while (index--) {
			if (Buffer.compare(this.buckets[i][index][this.idKey], id) === 0) return true;
		}

		return false;
	}

	get(id: Uint8Array, i: number = this.getBucketIndex(id)): Node | undefined {
		let index = this.buckets[i].length;

		while (index--) {
			const node = this.buckets[i][index];

			if (Buffer.compare(node[this.idKey], id) === 0) return node;
		}

		return undefined;
	}

	getBucketIndex(id: Uint8Array): number {
		return getBitDistance(this.id, id);
	}

	closest(id: Uint8Array, limit: number = this.bucketSize): Array<Node> {
		const i = this.getBucketIndex(id);

		return this.getNodes(i, limit);
	}

	update(id: Uint8Array, body: Partial<Omit<Node, "id">>): Partial<Omit<Node, "id">> | undefined {
		const i = this.getBucketIndex(id);

		const index = this.buckets[i].findIndex((node) => Buffer.compare(node[this.idKey], id) === 0);

		if (index === -1) return undefined;

		for (const key in body) {
			this.buckets[i][index][key as keyof Node] = body[key as keyof typeof body] as Node[keyof Node];
		}

		return body;
	}

	seen(id: Uint8Array): boolean {
		const i = this.getBucketIndex(id);

		const node = this.get(id, i);

		const removeResult = this.remove(id, i);

		if (!node || !removeResult) return false;

		this.add(node);

		return true;
	}

	remove(id: Uint8Array, i: number = this.getBucketIndex(id)): boolean {
		const index = this.buckets[i].findIndex((node) => Buffer.compare(node[this.idKey], id) === 0);

		if (index === -1) return false;

		this.buckets[i].splice(index, 1);

		return true;
	}

	protected getNodes(i0: number, limit: number, depth: number = 0): Array<Node> {
		const offset = (depth % 2 === 0 ? 1 : -1) * Math.ceil(depth / 2);

		if (Math.abs(offset) > Math.max(i0, this.bucketCount - 1 - i0)) return [];

		const i = i0 + offset;

		if (0 > i || i > this.bucketCount - 1) return this.getNodes(i0, limit, depth + 1);

		const nodes = this.buckets[i].slice(0, limit);

		if (nodes.length >= limit) return nodes;

		return nodes.concat(this.getNodes(i0, limit - nodes.length, depth + 1));
	}
}
