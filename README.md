# kademlia-table

XOR distance based routing table used for P2P networks, based on the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

```
npm install kademlia-table
```

An extendable implementation of Kademlia and K-Buckets closely following details set out in the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf).

- Nodes are indexed into buckets base on XOR bitwise distance from the table id.
- LRU order and removal are handled internally and managed externally through the use of 'markSuccess' and 'markError' on UDP successes and errors.
- This implementation does not implement the binary tree structure set out in the additions to the paper, instead opting for a flat bucket structure.

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
// If the bucket is full, node is added to a replacement cache. 
// When nodes are removed they are replaced by nodes in the replacement cache
table.add({ id: id() });

// Get the 20 nodes "closest" to a passed in id.
const closest = table.listClosestToId(id(), 20);

// Gets the node by id.
const node1 = table.get(id())

// Resets a nodes error counter and places the node at the end of the LRU list.
table.markSuccess(id())

// Increments a nodes error counter
// If a nodes error counter exceeds the tables errorLimit, it is removed and replaced by a replacement cache node.
// If the replacement cache is empty then the node is not removed. This prevents buckets emptying when there is local network disruption.
table.markError(id())

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
	errorLimit?: number;
	getId: (node: Node) => Uint8Array; // Gets id from node
}
```

#### `bool = table.add(node)`

Insert a new node. When inserting a node the XOR distance between the node and 
the table id is calculated and used to figure out which bucket this node should be 
inserted into.

If the bucket is full, the node is added to a replacement cache. If the replacement
cache is full the node is not added.

Returns `true` if the node is added to the bucket.

#### `table.buckets`

A fixed size array of all buckets in the table.

#### `true = table.clear()`

Removes all nodes from the table.

#### `node = table.get(id)`

Returns a node with the given id.

#### `i = table.getDistance(id)`

Returns an id's XOR distance, used for indexing nodes in buckets.

#### `bool = table.has(id)`

Returns `true` if a node exists for the passed in `id` and `false` otherwise.

#### `nodes = table.listClosestToId(id, [maxNodes])`

Returns an array of the closest (in XOR distance) nodes to the passed in id.

This method is normally used in a routing context, i.e. figuring out which nodes
in a DHT should store a value based on its id.

#### `bool = table.markError(id)`

Increments a nodes error counter.

If a nodes error counter exceeds the tables errorLimit, 
it is removed and replaced by a replacement cache node.

If the replacement cache is empty then the node is not removed. 
This prevents buckets emptying when there is local network disruption.

#### `bool = table.markSuccess(id)`

Resets a nodes error counter and places the node at the end of the LRU list.

#### `true = table.remove(id, d, force?)`

Remove a node using its id. If there are no replacements in the replacement cache then the node is not removed.

Returns `true` if the node is removed.

#### `true = table.update(node)`

Updates the given node in the table.



## License

MIT
