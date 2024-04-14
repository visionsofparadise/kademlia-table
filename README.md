# kademlia-table

XOR distance based routing table used for P2P networks such as a Kademlia DHT.

```
npm install kademlia-table
```

An extendable implementation of Kademlia and K-Buckets closely following details set out in the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

## Usage

```js
import { KademliaTable } from "kademlia-table";
import { randomBytes } from "node:crypto";

interface Node {
	id: string;
	// ...properties of Node
}

// Create a new table that stores nodes "close" to the passed in id.
// The id should be uniformily distributed, ie a hash, random bytes etc.
const table = new KademliaTable<Node>(id());

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
	id: string;
	// ...properties of Node
}

class CustomTable extends KademliaTable<Node> {
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

`id` should be a string that is uniformily distributed. `configuration` includes:

```js
{
  k?: 20 // Max number of nodes in a bucket
  a?: 3 // Default number of closest nodes returned, represents concurrency
  encoding?: "utf8" // Encoding of id strings
}
```

#### `bool = table.add(node)`

Insert a new node. `node.id` must be a string of same or shorter length as `table.id`.
When inserting a node the XOR distance between the node and the table.id is
calculated and used to figure which bucket this node should be inserted into.

Returns `true` if the node could be added or already exists.
Returns `false` if the bucket is full.

#### `bool = table.has(id)`

Returns `true` if a node exists for the passed in `id` and `false` otherwise.

#### `node = table.get(id)`

Returns a node or `undefined` if not found.

#### `i = table.getI(id)`

Returns a node's `i` value which represents distance from the tables `id` and index for it's corresponding bucket.

#### `nodes = table.closest(id, [maxNodes])`

Returns an array of the closest (in XOR distance) nodes to the passed in id.

This method is normally used in a routing context, i.e. figuring out which nodes
in a DHT should store a value based on its id.

#### `true = table.remove(id)`

Remove a node using its id.

#### `table.nodes`

Returns all nodes from table as an array. Ordered from closest to furthest buckets.

#### `table.buckets`

A fixed size array of all buckets in the table.

## License

MIT
