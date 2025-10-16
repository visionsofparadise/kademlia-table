# kademlia-table

A high-performance Kademlia DHT routing table implementation for P2P networks.

[![npm version](https://img.shields.io/npm/v/kademlia-table.svg)](https://www.npmjs.com/package/kademlia-table)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

```bash
npm install kademlia-table
```

## Overview

`kademlia-table` is a TypeScript implementation of the routing table structure described in the [Kademlia DHT paper](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf). It organizes nodes by XOR distance and maintains LRU ordering for efficient peer discovery in distributed hash tables.

### Key Features

- **XOR Distance Indexing** - Nodes organized by bitwise XOR distance for O(log n) lookups
- **External Liveness Management** - Delegates network I/O to consumer, tracks results via `markSuccess`/`markError`
- **Replacement Cache** - Maintains backup nodes to prevent bucket collapse during network disruption
- **LRU Ordering** - Preferentially keeps long-lived nodes with proven reliability
- **Generic Node Support** - Works with any node type via configurable `getId` accessor

## Installation

```bash
npm install kademlia-table
```

## Quick Start

```typescript
import { KademliaTable } from 'kademlia-table';

// Define your node type
interface PeerNode {
  id: Uint8Array;
  address: string;
  port: number;
}

// Create routing table
const localId = crypto.getRandomValues(new Uint8Array(20));

const table = new KademliaTable<PeerNode>(localId, {
  getId: (node) => node.id,
  bucketSize: 20,      // Default: 20
  errorLimit: 3        // Default: 3
});

// Add nodes
table.add({
  id: peerIdBytes,
  address: '192.168.1.1',
  port: 8000
});

// Find closest nodes for DHT lookup
const target = crypto.getRandomValues(new Uint8Array(20));

const closest = table.listClosestToId(target, 20);

// Track node liveness
table.markSuccess(nodeId);  // On successful RPC
table.markError(nodeId);    // On RPC timeout/failure
```

## API Reference

### Constructor

#### `new KademliaTable<T>(id, options)`

Creates a new routing table.

**Parameters:**
- `id: Uint8Array` - The local node's ID (uniformly distributed, typically 160-bit)
- `options: KademliaTable.Options<T>` - Configuration object

**Options:**
```typescript
interface Options<Node> {
  getId: (node: Node) => Uint8Array;  // Required: Extract ID from node
  bucketSize?: number;                 // Default: 20
  errorLimit?: number;                 // Default: 3
}
```

**Example:**
```typescript
const table = new KademliaTable<Node>(localId, {
  getId: (node) => node.id,
  bucketSize: 20,
  errorLimit: 3
});
```

---

### Core Methods

#### `add(node: T): boolean`

Adds a node to the routing table.

**Returns:** `true` if node was added, `false` if rejected.

**Behavior:**
- If bucket has space → node added to main bucket
- If bucket full → node added to replacement cache
- If both full → node rejected
- Duplicate nodes are rejected

**Example:**
```typescript
const added = table.add(newNode);
if (added) {
  console.log('Node added to routing table');
} else {
  console.log('Node cached or rejected');
}
```

---

#### `listClosestToId(id: Uint8Array, limit?: number): T[]`

Returns the closest nodes to a target ID, ordered by approximate XOR distance.

**Parameters:**
- `id: Uint8Array` - Target ID to find closest nodes to
- `limit?: number` - Maximum nodes to return (default: all nodes)

**Returns:** Array of nodes in approximately distance-sorted order, with LRU ordering preserved within buckets.

**Example:**
```typescript
// Find 20 closest nodes for DHT FIND_NODE operation
const peers = table.listClosestToId(targetKey, 20);

// Contact each peer to continue lookup
for (const peer of peers) {
  // Send RPC to peer...
}
```

---

#### `markSuccess(id: Uint8Array): boolean`

Marks a node as responsive, resetting its error counter and moving it to the end of the LRU list.

**When to call:** After successful RPC response from this node.

**Returns:** `true` if node found and updated, `false` otherwise.

**Example:**
```typescript
// After successful RPC
const response = await sendRPC(peer);
table.markSuccess(peer.id);
```

---

#### `markError(id: Uint8Array): boolean`

Increments a node's error counter. If counter exceeds `errorLimit`, the node is evicted and replaced from the replacement cache.

**When to call:** After RPC timeout or failure.

**Returns:** `true` if node found and updated, `false` otherwise.

**Example:**
```typescript
try {
  await sendRPC(peer);
  table.markSuccess(peer.id);
} catch (error) {
  table.markError(peer.id);  // May evict after 3 failures
}
```

---

#### `get(id: Uint8Array): T | undefined`

Retrieves a node by its ID.

**Returns:** The node if found, `undefined` otherwise.

**Example:**
```typescript
const node = table.get(peerId);
if (node) {
  console.log('Found:', node.address);
}
```

---

#### `has(id: Uint8Array): boolean`

Checks if a node exists in the routing table.

**Returns:** `true` if node exists, `false` otherwise.

**Example:**
```typescript
if (!table.has(peerId)) {
  table.add(newPeer);
}
```

---

#### `update(node: T): boolean`

Updates an existing node's data while preserving its error count and position.

**Returns:** `true` if node found and updated, `false` otherwise.

**Example:**
```typescript
// Update node metadata without affecting liveness tracking
table.update({
  id: existingId,
  address: newAddress,
  port: newPort
});
```

---

#### `remove(id: Uint8Array, d?: number, force?: boolean): boolean`

Removes a node from the routing table.

**Parameters:**
- `id: Uint8Array` - Node ID to remove
- `d?: number` - Pre-calculated distance (optimization)
- `force?: boolean` - Remove even if no replacement available

**Returns:** `true` if node was removed, `false` if not found or couldn't be safely removed.

**Behavior:**
- If replacement cache has nodes → node removed, replacement promoted
- If replacement cache empty and `force=false` → node kept (safety mechanism)
- If replacement cache empty and `force=true` → node removed anyway

**Example:**
```typescript
// Safe removal (keeps node if no replacement)
table.remove(badNodeId);

// Force removal
table.remove(badNodeId, undefined, true);
```

---

#### `clear(): void`

Removes all nodes from the routing table.

**Example:**
```typescript
table.clear();
console.log(table.length); // 0
```

---

### Utility Methods

#### `getDistance(id: Uint8Array): number`

Calculates the XOR distance bucket index for a given ID.

**Returns:** Bucket index (0 to id.length * 8)

**Example:**
```typescript
const distance = table.getDistance(nodeId);
console.log(`Node is in bucket ${distance}`);
```

---

#### `getBucket(d: number): Bucket<T> | undefined`

Retrieves the bucket at distance index `d`.

**Returns:** Bucket object containing `items` and `replacementItems` arrays.

**Example:**
```typescript
const bucket = table.getBucket(50);
console.log(`Bucket 50 has ${bucket.items.length} nodes`);
```

---

### Properties

#### `length: number`

Total number of nodes in the routing table (excludes replacement cache).

**Example:**
```typescript
console.log(`Routing table contains ${table.length} nodes`);
```

---

#### `buckets: Array<Bucket<T>>`

Direct access to the bucket array. Each bucket contains:
- `items: Array<Item<T>>` - Active nodes in LRU order
- `replacementItems: Array<Item<T>>` - Cached replacement nodes

**Warning:** Modifying buckets directly bypasses internal logic. Use with caution.

**Example:**
```typescript
// Inspect bucket contents
for (let i = 0; i < table.buckets.length; i++) {
  const bucket = table.buckets[i];
  if (bucket.items.length > 0) {
    console.log(`Bucket ${i}: ${bucket.items.length} nodes`);
  }
}
```

---

#### `bucketSize: number`

Maximum nodes per bucket (configured in constructor).

---

#### `errorLimit: number`

Maximum errors before node eviction (configured in constructor).

---

### Iteration

The table supports iteration over all nodes:

```typescript
// Iterate all nodes
for (const node of table) {
  console.log(node.address);
}

// Use with spread operator
const allNodes = [...table];

// Generator-based iteration
const iterator = table.iterateClosestToId(targetId);

for (const node of iterator) {
  if (someCondition) break;  // Early termination
}
```

## Performance Characteristics

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| `add()` | O(k) | Linear search within bucket (k ≤ 20) |
| `get()` | O(k) | Distance calculation + bucket search |
| `listClosestToId()` | O(k × log n) | Spiral search with early termination |
| `markSuccess()` | O(k) | Find + move to LRU tail |
| `markError()` | O(k) | Find + increment + possible eviction |
| `getDistance()` | O(id bytes) | XOR distance calculation |

**Memory Usage:**
- Empty table: ~16KB (161 buckets × 100 bytes)
- Full table: ~100KB (161 × 20 nodes × ~30 bytes + replacement cache)

## Design Decisions

### Why Flat Buckets?

**Alternative:** Dynamic binary tree (as described in Kademlia paper)

**Trade-offs:**

| Aspect | Flat Array (this impl) | Binary Tree |
|--------|----------------------|-------------|
| Bucket access | O(1) | O(log n) |
| Memory | O(id_bits) fixed | O(log network_size) |
| Complexity | Simple | Complex splitting logic |
| Cache locality | Excellent | Poor |

**Verdict:** For typical DHT routing tables (200-500 nodes), flat arrays are faster and simpler. Industry standard (BitTorrent, Ethereum, IPFS) uses flat or similar approaches.

### Why External Liveness?

**Alternative:** Embed ping/pong logic inside table

**Benefits of external:**
- Protocol agnostic (UDP, TCP, QUIC, etc.)
- Testability (mock network behavior)
- Separation of concerns (routing vs networking)
- Flexibility (custom liveness checks)

### Why Preserve LRU Order in Results?

**Alternative:** Sort by exact XOR distance

**Trade-off:**

| Approach | Pros | Cons |
|----------|------|------|
| LRU-preserving (this impl) | Returns responsive nodes, fast | Approximate distance |
| Distance-sorted | Exact k-closest | May include stale nodes |

**Verdict:** For peer discovery, "close enough + responsive" beats "exact + possibly dead". Matches BitTorrent/Ethereum behavior.

## Comparison to Other Implementations

| Library | Structure | Language | Use Case |
|---------|-----------|----------|----------|
| kademlia-table | Flat buckets | TypeScript | General purpose P2P |
| go-libp2p-kbucket | Dynamic array | Go | IPFS/libp2p |
| ethereum/go-ethereum | Fixed 17 buckets | Go | Ethereum discovery |
| libtorrent | Binary tree | C++ | BitTorrent DHT |

**When to use kademlia-table:**
- Building P2P applications in Node.js/TypeScript
- Need simple, well-tested routing table
- Want flexible node types
- Prefer external network management

## Common Patterns

### Basic DHT Lookup

```typescript
async function findNode(targetId: Uint8Array): Promise<Node | null> {
  const queried = new Set<string>();
  let closest = table.listClosestToId(targetId, 20);

  while (closest.length > 0) {
    const candidates = closest.filter(n =>
      !queried.has(n.id.toString())
    ).slice(0, 3); // Alpha = 3

    if (candidates.length === 0) break;

    // Query candidates in parallel
    const results = await Promise.all(
      candidates.map(node => queryNode(node, targetId))
    );

    // Mark liveness
    for (const [node, result] of zip(candidates, results)) {
      queried.add(node.id.toString());
      if (result.success) {
        table.markSuccess(node.id);
        // Add newly discovered nodes
        for (const peer of result.peers) {
          table.add(peer);
        }
      } else {
        table.markError(node.id);
      }
    }

    // Get updated closest list
    closest = table.listClosestToId(targetId, 20);
  }

  return table.get(targetId);
}
```

### Periodic Bucket Refresh

```typescript
// Refresh stale buckets every hour
setInterval(() => {
  for (let i = 0; i < table.buckets.length; i++) {
    const bucket = table.buckets[i];

    if (bucket.items.length === 0) {
      // Generate random ID in this bucket's range
      const randomId = generateRandomIdAtDistance(table.id, i);
      // Perform lookup to populate bucket
      findNode(randomId);
    }
  }
}, 60 * 60 * 1000);
```

### Sibling List (S/Kademlia)

```typescript
// Get your s closest neighbors
function getSiblings(s: number = 20): Node[] {
  return table.listClosestToId(table.id, s);
}

// For data replication in S/Kademlia
function replicateData(key: Uint8Array, value: any) {
  const siblings = getSiblings(16);
  for (const node of siblings) {
    sendStore(node, key, value);
  }
}
```

## TypeScript Types

```typescript
namespace KademliaTable {
  interface Options<Node> {
    getId: (node: Node) => Uint8Array;
    bucketSize?: number;
    errorLimit?: number;
  }

  interface Bucket<T> {
    items: Array<Item<T>>;
    replacementItems: Array<Item<T>>;
  }

  interface Item<T> {
    node: T;
    errorCount: number;
  }
}
```

## Testing

```bash
npm test
```

Tests cover:
- Node addition and eviction
- Distance calculations
- Closest node queries
- LRU ordering
- Replacement cache behavior
- Error counting and limits

## Contributing

Issues and pull requests welcome at [github.com/visionsofparadise/kademlia-table](https://github.com/visionsofparadise/kademlia-table).

## License

MIT

## References

- [Kademlia: A Peer-to-peer Information System Based on the XOR Metric (2002)](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf)
- [S/Kademlia: A Practicable Approach Towards Secure Key-Based Routing (2007)](https://telematics.tm.kit.edu/publications/Files/267/SKademlia_2007.pdf)
- [BitTorrent DHT Protocol (BEP 5)](https://www.bittorrent.org/beps/bep_0005.html)
- [Ethereum Node Discovery Protocol v4](https://github.com/ethereum/devp2p/blob/master/discv4.md)
