# kademlia-table

XOR distance based routing table used for P2P networks such as a Kademlia DHT.

```
npm install kademlia-table
```

An extendable implementation of Kademlia and K-Buckets closely following details set out in the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

## Usage

```js
import { KademliaTable } from "kademlia-table";

interface Node {
	id: Buffer;
	// ...properties of Node
}

// Create a new table that stores nodes "close" to the passed in id.
// The id should be uniformily distributed, ie a hash, random bytes etc.
const table = new KademliaTable<'id', Node>(id(), { idKey: 'id' });

// Add a node to the routing table
table.add({ id: id() });

// Get the 20 nodes "closest" to a passed in id
const closest = table.closest(id(), 20);
```

## Extending The Table

The base class is extendable to add custom logic to operations. For example you may want to act on a bucket if it is full when attempting to add a node, such as comparing response times of nodes.

```js
import { KademliaTable } from "kademlia-table";

interface Node {
	id: Buffer;
	// ...properties of Node
}

class CustomTable extends KademliaTable<'id', Node> {
	add(node: Node): boolean {
		const result = super.add(node);

		if (!result) {
			// Do something if bucket is full and retry
			return this.add(node);
		}

		return true;
	}
}
```

## API

#### `table = new KademliaTable(id, [configuration])`

Create a new routing table.

`id` should be a Buffer that is uniformily distributed. `configuration` includes:

```js
{
  idKey: 'id' // Key used as id
  bucketSize?: 20 // Max number of nodes in a bucket
}
```

#### `bool = table.add(node)`

Insert a new node. `node[idKey]` must be a buffer of same or shorter length as `table[idKey]`.
When inserting a node the XOR distance between the node and the table[idKey] is
calculated and used to figure which bucket this node should be inserted into.

Returns `true` if the node is newly added.
Returns `false` if the bucket is full or already exists.

#### `bool = table.has(id)`

Returns `true` if a node exists for the passed in `id` and `false` otherwise.

#### `node = table.get(id)`

Returns a node or `undefined` if not found.

#### `i = table.getBucketIndex(id)`

Returns a node's corresponding bucket index.

#### `nodes = table.closest(id, [maxNodes])`

Returns an array of the closest (in XOR distance) nodes to the passed in id.

This method is normally used in a routing context, i.e. figuring out which nodes
in a DHT should store a value based on its id.

#### `true = table.remove(id)`

Remove a node using its id.

Returns `true` if the node is removed.
Returns `false` if the node does not exist.

#### `table.nodes`

Returns all nodes from table as an array. Ordered from closest to furthest buckets.

#### `table.buckets`

A fixed size array of all buckets in the table.

#### `number = getBitDistance(idA, idB)`

Gets the XOR distance between two id buffers.

#### `1 | -1 | 0 = compareBitDistance(idA, idB) = createCompareBitDistance(id)`

Creates a function for sorting ids based on distance from a target id going from closest to furthest

## License

MIT
