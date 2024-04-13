import type { Encoding } from "node:crypto";

export interface Node {
	id: string;
}

export interface Configuration {
	k?: number;
	a?: number;
	encoding?: Encoding;
}

export class KademliaTable<N extends Node = Node> {
	protected readonly idBytes: Buffer;

	readonly k: number;
	readonly a: number;
	readonly encoding: Encoding;
	readonly size: number;
	readonly buckets: Array<Array<N>>;

	constructor(readonly id: string, configuration: Configuration = {}) {
		this.k = configuration.k || 20;
		this.a = configuration.a || 3;
		this.encoding = configuration.encoding || "utf8";

		this.idBytes = Buffer.from(id, this.encoding);

		this.size = this.idBytes.length * 8;

		this.buckets = Array.apply(null, Array(this.size)).map(() => []);
	}

	get nodes() {
		return this.buckets.flat();
	}

	add(node: N) {
		const i = this.getI(node.id);

		const bucket = this.buckets[i];

		if (bucket.length >= this.k) return false;

		if (this.has(node.id, i)) return true;

		this.buckets[i] = bucket.concat([node]);

		return true;
	}

	has(id: string, i: number = this.getI(id)) {
		return this.buckets[i].some((node) => node.id === id);
	}

	get(id: string, i: number = this.getI(id)) {
		return this.buckets[i].find((node) => node.id === id);
	}

	getI(id: string) {
		const idBytes = Buffer.from(id.padEnd(this.size, "0"), this.encoding);

		for (let i = 0; i < this.size - 1; i++) {
			const a = this.idBytes[i];
			const b = idBytes[i];

			if (a !== b) return this.size - 1 - (i * 8 + Math.clz32(a ^ b) - 24);
		}

		return 0;
	}

	closest(id: string, a: number = this.a) {
		const i = this.getI(id);

		return this.getNodes(i, a);
	}

	seen(id: string) {
		const i = this.getI(id);

		const node = this.get(id, i);

		if (!node) return false;

		this.buckets[i] = this.buckets[i].filter((node) => node.id !== id).concat([node]);

		return true;
	}

	remove(id: string) {
		const i = this.getI(id);

		this.buckets[i] = this.buckets[i].filter((node) => node.id !== id);

		return true;
	}

	protected getNodes(i0: number, limit: number, depth: number = 0): Array<N> {
		const isOdd = depth % 2 === 1;
		const offset = isOdd ? Math.ceil(depth / 2) : depth / 2;

		const isWithinMin = i0 - offset >= 0;
		const isWithinMax = i0 + offset <= this.size - 1;

		const direction = isOdd && isWithinMin ? "down" : isWithinMax ? "up" : null;

		if (!direction) return [];

		const i = direction === "down" ? i0 - offset : i0 + offset;

		const bucket = this.buckets[i];

		const nodes = bucket.slice(0, limit);

		if (nodes.length >= limit) return nodes;

		return nodes.concat(this.getNodes(i0, limit - nodes.length, depth + 1));
	}
}
