# kademlia-table

XOR distance based routing table used for P2P networks such as a Kademlia DHT.

```
npm install kademlia-table
```

An extendable implementation of Kademlia and K-Buckets closely following details set out in the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

- Nodes are indexed into buckets base on XOR bitwise distance from the table id.
- Retrieved nodes are marked as seen and moved to the tail of the bucket.
- A compare function decides which nodes to keep when adding to full buckets.

## Usage

```js
import { KademliaTable } from "kademlia-table";

interface Node {
	id: Uint8Array;
	// ...properties of Node
}

// Create a new table that stores nodes indexed by bitwise distance to the passed in id.
const table = new KademliaTable<Node>(id(), { getNode: (node) => node.id });

// Add a node to the routing table
table.add({ id: id() });

// Get the 20 nodes "closest" to a passed in id and marks them as seen.
const closest = table.listClosestToId(id(), 20);

// Gets the node by id and marks it as seen.
const node1 = table.getById(id())

// Gets the node without marking as seen.
const node2 = table.peekById(id())

for (const node of table) {
	// nodes can be iterated, sorted closest to furthest.
}
```

## API

#### `table = new KademliaTable(id, [options])`

Create a new routing table.

`id` should be a Uint8Array that is uniformily distributed. `options` includes:

```js
{
	bucketSize?: number;
	compare?: (nodeA: Node, nodeB: Node) => number; // Compare for nodes being added to full buckets
	getId: (node: Node) => Uint8Array; // Gets id from node
}
```

#### `bool = table.add(node)`

Insert a new node. When inserting a node the XOR distance between the node and 
the table id is calculated and used to figure which bucket this node should be 
inserted into.

If the bucket is full, the compare function is used to determine whether to add
and select which node to remove.

Returns `true` if the node is newly added.
Returns `false` if the bucket is full or already exists.

#### `bool = table.has(id)`

Returns `true` if a node exists for the passed in `id` and `false` otherwise.

#### `node = table.get(d)`

Returns a node from the d distance bucket and marks it as seen.

#### `node = table.getById(id)`

Returns a node with the given id and marks it as seen.

#### `node = table.peek(d)`

Returns a node from the d distance bucket.

#### `node = table.peekById(id)`

Returns a node with the given id.

#### `i = table.getBucketIndex(id)`

Returns an id's corresponding bucket index.

#### `nodes = table.listClosestToId(id, [maxNodes])`

Returns an array of the closest (in XOR distance) nodes to the passed in id,
and marks them as seen.

This method is normally used in a routing context, i.e. figuring out which nodes
in a DHT should store a value based on its id.

#### `true = table.update(node)`

Updates the given node in the table.

#### `true = table.remove(id)`

Remove a node using its id.

Returns `true` if the node is removed.
Returns `false` if the node does not exist.

#### `true = table.clear()`

Removes all nodes from the table.

#### `table.buckets`

A fixed size array of all buckets in the table.

#### `number = getBitDistance(idA, idB)`

Gets the XOR distance between two id buffers.

#### `1 | -1 | 0 = compareBitDistance(idA, idB) = createCompareBitDistance(id)`

Creates a function for sorting ids based on distance from a target id going from closest to furthest

## License

MIT
