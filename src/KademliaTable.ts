import { compare } from "uint8array-tools";
import { getBitwiseDistance } from "./getBitwiseDistance";

export namespace KademliaTable {
	export interface Options<Node> {
		bucketSize?: number;
		errorLimit?: number;
		getId: (node: Node) => Uint8Array;
	}

	export interface Bucket<T> {
		items: Array<Item<T>>;
		replacementItems: Array<Item<T>>;
	}

	export interface Item<T> {
		node: T;
		errorCount: number;
	}
}

export class KademliaTable<T> {
	readonly bucketSize: number;
	readonly buckets: Array<KademliaTable.Bucket<T>>;
	readonly errorLimit: number;
	getId: (node: T) => Uint8Array;

	constructor(public readonly id: Uint8Array, options: KademliaTable.Options<T>) {
		this.bucketSize = options.bucketSize || 20;
		this.buckets = new Array(id.length * 8 + 1).fill(undefined).map(() => ({ items: [], replacementItems: [] }));
		this.errorLimit = options.errorLimit || 5;
		this.getId = options.getId;
	}

	get length() {
		return this.buckets.reduce((sum, bucket) => sum + bucket.items.length, 0);
	}

	*[Symbol.iterator](): IterableIterator<T> {
		for (const bucket of this.buckets) for (const item of bucket.items) yield item.node;
	}

	add(node: T, d: number = this.getDistance(this.getId(node))): boolean {
		const bucket = this.getBucket(d);

		if (
			!bucket ||
			bucket.items.find((item) => compare(this.getId(item.node), this.getId(node)) === 0) ||
			bucket.replacementItems.find((item) => compare(this.getId(item.node), this.getId(node)) === 0)
		)
			return false;

		if (bucket.items.length >= this.bucketSize) {
			if (bucket.replacementItems.length >= this.bucketSize) return false;

			bucket.replacementItems.push({
				node,
				errorCount: 0,
			});

			return false;
		}

		bucket.items.push({
			node,
			errorCount: 0,
		});

		return true;
	}

	clear() {
		for (let i = 0; i < this.buckets.length; i++) this.buckets[i] = { items: [], replacementItems: [] };
	}

	*iterateClosestToId(id: Uint8Array): IterableIterator<T> {
		return this.iterateNodes(id);
	}

	listClosestToId(id: Uint8Array, limit: number = this.buckets.length * this.bucketSize): Array<T> {
		return this.listNodes(id, undefined, limit);
	}

	get(id: Uint8Array, d: number = this.getDistance(id)): T | undefined {
		return this.getBucket(d)?.items.find((item) => compare(this.getId(item.node), id) === 0)?.node;
	}

	getBucket(d: number): KademliaTable.Bucket<T> | undefined {
		return this.buckets.at(d);
	}

	getDistance(id: Uint8Array): number {
		return getBitwiseDistance(this.id, id);
	}

	protected *iterateNodes(id: Uint8Array, d: number = this.getDistance(id)): IterableIterator<T> {
		const bucketLimit = Math.max(d, this.buckets.length - 1 - d);

		let depth = 0;
		let offset = (depth % 2 === 0 ? 1 : -1) * Math.ceil(depth / 2);

		while (Math.abs(offset) <= bucketLimit) {
			const i = d + offset;

			if (0 <= i && i < this.buckets.length) {
				const bucket = this.getBucket(i);

				if (bucket) for (const item of bucket.items) yield item.node;
			}

			depth++;
			offset = (depth % 2 === 0 ? 1 : -1) * Math.ceil(depth / 2);
		}
	}

	protected listNodes(id: Uint8Array, d: number = this.getDistance(id), limit: number = this.buckets.length * this.bucketSize): Array<T> {
		if (!limit) return [];

		const nodes: Array<T> = [];

		for (const node of this.iterateNodes(id, d)) {
			nodes.push(node);

			if (nodes.length >= limit) return nodes;
		}

		return nodes;
	}

	has(id: Uint8Array, d: number = this.getDistance(id)): boolean {
		return !!this.getBucket(d)?.items.find((item) => compare(this.getId(item.node), id) === 0);
	}

	markError(id: Uint8Array, d: number = this.getDistance(id)): boolean {
		const bucket = this.getBucket(d);

		if (!bucket) return false;

		const index = bucket.items.findIndex((item) => compare(this.getId(item.node), id) === 0);

		if (index === -1) return false;

		const items = bucket.items.splice(index, 1);

		bucket.items.push(
			...items.map((item) => ({
				...item,
				errorCount: item.errorCount + 1,
			}))
		);

		for (const item of items) {
			if (item.errorCount + 1 < this.errorLimit) continue;

			this.remove(this.getId(item.node));
		}

		return true;
	}

	markSuccess(id: Uint8Array, d: number = this.getDistance(id)): boolean {
		const bucket = this.getBucket(d);

		if (!bucket) return false;

		const index = bucket.items.findIndex((item) => compare(this.getId(item.node), id) === 0);

		if (index === -1) return false;

		const items = bucket.items.splice(index, 1);

		bucket.items.push(
			...items.map((item) => ({
				...item,
				errorCount: 0,
			}))
		);

		return true;
	}

	update(node: T, d: number = this.getDistance(this.getId(node))): boolean {
		const bucket = this.getBucket(d);

		if (!bucket) return false;

		const index = bucket.items.findIndex((item) => compare(this.getId(item.node), this.getId(node)) === 0);

		if (index === -1) {
			const replacementIndex = bucket.replacementItems.findIndex((item) => compare(this.getId(item.node), this.getId(node)) === 0);

			if (replacementIndex === -1) return false;

			const replacementItem = bucket.replacementItems[index];

			bucket.replacementItems[index] = {
				node,
				errorCount: replacementItem.errorCount,
			};

			return false;
		}

		const item = bucket.items[index];

		bucket.items[index] = {
			node,
			errorCount: item.errorCount,
		};

		return true;
	}

	remove(id: Uint8Array, d: number = this.getDistance(id), force?: boolean): boolean {
		const bucket = this.getBucket(d);

		if (!bucket) return false;

		const index = bucket.items.findIndex((item) => compare(this.getId(item.node), id) === 0);

		if (index === -1) {
			const replacementIndex = bucket.replacementItems.findIndex((item) => compare(this.getId(item.node), id) === 0);

			if (replacementIndex === -1) return false;

			bucket.replacementItems.splice(replacementIndex, 1);

			return false;
		}

		if (bucket.replacementItems.length || force) {
			bucket.items.splice(index, 1);

			const replacementItem = bucket.replacementItems.shift();

			if (replacementItem) bucket.items.unshift(replacementItem);
		}

		return true;
	}
}
