# KV/DAG

## Editors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Authors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

This specification describes a method of key/value storage implemented as an IPLD DAG. It details the format, encoding and mechanisms to mutate the storage.

This method of key/value storage is designed to allow fast _ordered_ value lookups by key _prefix_.

## Data Format

IPLD Schema

```ipldsch
# A shard is just a list of entries
type Shard [ShardEntry]

# Single key/value entry within a shard
type ShardEntry struct {
  key String
  value ShardValue
} representation tuple

# User data (any CID to any data) or shard link
type ShardValue union {
  | &UserData link
  | ShardLinkValue list
} representation kinded

# A link to another shard, and optional user data
type ShardLinkValue struct {
  link &Shard
  data optional &UserData
} representation tuple

# User data - any CID to any data
type UserData = Any
```

Typsecript

```ts
import { Link } from 'multiformats/link'

/** A shard is just a list of entries */
type Shard = ShardEntry[]

/** Single key/value entry within a shard */
type ShardEntry = [
  key: string,
  value: ShardValue
]

type ShardValue = UserData | [ShardLink, UserData?]

/** A link to another shard */
type ShardLink = Link<Shard>

/** User data - any CID to any data */
type UserData = Link<any>
```

### Shard

The storage is made up of shards. They are blocks of IPLD data. Shards must be [dag-cbor](https://ipld.io/specs/codecs/dag-cbor/spec/) encoded and must not exceed `512KiB` in size (post encode).

A shard is an ordered list of [shard entries](#Shard-Entry). Shard entries must always be ordered lexicographically by key within a shard.

### Shard Entry

A key/value pair whose value corresponds to [user data](#User-Data) or a [shard link](#Shard-Link).

### Key

A UTF-8 encoded string.

The key length must not exceed 64 characters. Putting a key whose length is greater than 64 characters must create a new shard(s) to accomodate the additional length. See [Long Keys](#Long-Keys).

### Value

#### User Data

An IPLD [CID](https://github.com/multiformats/cid) to any data that has explicitly been put to the storage by a user.

For example (dag-json encoded):

```javascript
{ '/': 'bafkreiem4twkqzsq2aj4shbycd4yvoj2cx72vezicletlhi7dijjciqpui' }
```

#### Shard Link

An IPLD [CID](https://github.com/multiformats/cid) link to another shard in the storage.

Shard link values must be encoded as an array (tuple) in order to differentiate them from [user data](#User-Data).

If the value is a shard link value, the first item in the array must be an IPLD [CID](https://github.com/multiformats/cid) link to another shard in the storage. If the array contains a second item, the item is [user data](#User-Data).

Shard link values must contain one or two elements. The first element (the shard link) is required (not nullable).

For example, a shard link _without_ user data (dag-json encoded):

```javascript
[{ '/': 'bafyreibq6w6xgqluv7ubskavehlfsnvodmh2gbc2q4c3d4ijlf7gva2day' }]
```

For example, a shard link _with_ user data (dag-json encoded):

```javascript
[
  { '/': 'bafyreibq6w6xgqluv7ubskavehlfsnvodmh2gbc2q4c3d4ijlf7gva2day' },
  { '/': 'bafkreiem4twkqzsq2aj4shbycd4yvoj2cx72vezicletlhi7dijjciqpui' }
]
```

## Operations

### Put

The "put" operation adds a new value or updates an existing value for a given key in the storage.

The storage must first be [traversed](#Shard-Traversal) to identify the target shard where the value should be placed, as well as the key within the shard that should be used.

Any changes made must be [propagated to the root shard](#Propagating-Changes).

#### New Value

If no value exists in the shard for the shard key then a new user data entry should be added to the shard at the correct lexicographical index.

For example, putting a key `b` and value `bafyvalueb` to a shard with existing keys `a` and `c` (dag-json encoded):

Before:
```javascript
[
  ['a', { '/': 'bafyvaluea' }],
  ['c', { '/': 'bafyvaluec' }]
]
```

After:
```javascript
[
  ['a', { '/': 'bafyvaluea' }],
  ['b', { '/': 'bafyvalueb' }], // <- new entry
  ['c', { '/': 'bafyvaluec' }]
]
```

#### Existing User Data Value

If a value exists in the shard for the shard key and the value is user data, then the entry must be updated.

For example, putting a key `a` and value `bafyvalueaaa` to a shard with existing key `a` and value `bafyvaluea` (dag-json encoded):

Before:
```javascript
[['a', { '/': 'bafyvaluea' }]]
```

After:
```javascript
[['a', { '/': 'bafyvalueaaa' }]]
```

#### Existing Shard Link Value

If a value exists in the shard for the shard key and the value is a shard link, then the value must be placed at index 1 of the shard link array.

For example, putting a key `a` and value `bafyvaluea` to a shard with existing key `a` with a shard link value `bafyshard` (dag-json encoded):

Before:
```javascript
[['a', [{ '/': 'bafyshard' }]]]
```

After:
```javascript
[['a', [{ '/': 'bafyshard' }, { '/': 'bafyvaluea' }]]]
```

For example, putting a key `a` and value `bafyvalueaaa` to a shard with existing key `a` with a shard link value `bafyshard`, with user data `bafyvaluea` (dag-json encoded):

Before:
```javascript
[['a', [{ '/': 'bafyshard' }, { '/': 'bafyvaluea' }]]]
```

After:
```javascript
[['a', [{ '/': 'bafyshard' }, { '/': 'bafyvalueaaa' }]]]
```

#### Long Keys

If the shard key is longer than 64 characters a new shard(s) must be created to acommodate the new length. The first 64 characters must be added as a new entry in the shard, along with a value that is a link to a new shard with the next 64 characters of the key. This is repeated until the key has less than 64 characters. The value for the entry for the key with less than 64 characters must be set as the value for the put operation.

For example, putting a key `ax64...bx64...cx10...` and value `bafyvalue` in an empty shard (dag-json encoded):

```javascript
[['ax64...', [{ '/': 'bafyshard1' }]]]
```
```javascript
// bafyshard1
[['bx64...', [{ '/': 'bafyshard0' }]]]
```
```javascript
// bafyshard0
[['cx10...', { '/': 'bafyvalue' }]]
```

#### Sharding

After putting a value to the shard, it must be encoded and it's size measured. If the byte size of the encoded shard exceeds `512KiB`, it must be sharded.

Sharding involves taking two or more keys from the shard and moving them into a new shard. To select keys for sharding, the longest common prefix (LCP) must be found, using the newly inserted shard key as the base. Work backwards through the string until one or more other keys within the shard share the same prefix. Move to the next key in the shard as the base if no other keys in the shard match any substring of the inserted shard key.

The following is pseudocode of the algorithm for creating a new shard when a shard exceeds the size limit:

1. Find longest common prefix using insert key as base
2. IF common prefix for > 1 entries exists
    1. Create new shard with suffixes for entries that match common prefix
    1. Remove entries with common prefix from shard
    1. Add entry for common prefix, linking new shard
    1. FINISH
3. ELSE
    1. Find longest common prefix using adjacent key as base
    1. GOTO 2

For example:

```
abel
foobarbaz
foobarwooz
food
somethingelse
```

Put "foobarboz" and exceed shard size limit:
```
abel
foobarbaz
<- foobarboz
foobarwooz
food
somethingelse
```

Find "foobarb" as longest common prefix, create shard:
```
abel
foobarb -> az
           oz
foobarwooz
food
somethingelse
```

Put "foopey", exceeding shard size:
```
abel
foobarb -> az
           oz
foobarwooz
food
<- foopey
somethingelse
```

Find "foo" as longest common prefix, create shard:
```
abel
foo -> barb -> az
               oz
       barwooz
       d
       pey
somethingelse
```

### Delete

The "delete" operation removes a value for a given key in the storage.

The storage must first be [traversed](#Shard-Traversal) to identify the target shard where the value should be removed from, as well as the key within the shard that should be used.

Any changes made must be [propagated to the root shard](#Propagating-Changes).

Deleting the last remaining key in a non-root shard must remove the shard entirely and it's entry in it's parent shard. That is unless the entry in the parent shard contains user data. In this case the value in the parent shard is updated from a shard link (with user data) to user data.

For example, deleting a key `a` from a root shard (dag-json encoded):

Before:
```javascript
[['a', { '/': 'bafyvaluea' }]]
```

After:
```javascript
[]
```

For example, deleting a key `abba` from a non-root shard (dag-json encoded):

Before:
```javascript
[['abb', [{ '/': 'bafyshard' }]]]
```
```javascript
// bafyshard
[['a', { '/': 'bafyvalue' }]]
```

After:
```javascript
[]
```

For example, deleting a key `abba` from a non-root shard with user data in key `abb` (dag-json encoded):

Before:
```javascript
[['abb', [{ '/': 'bafyshard' }, { '/': 'bafyvalueabb' }]]]
```
```javascript
// bafyshard
[['a', { '/': 'bafyvalue' }]]
```

After:
```javascript
[['abb', { '/': 'bafyvalueabb' }]]
```

## Propagating Changes

Any changes made to a shard will result in it's CID changing. If the shard is not the root shard, the change must be propagated to the root.

## Shard Traversal

Given a key `k` it is often necessary to locate the shard the value is stored in or should be stored in for the purpose of adding, updating or removing the value from the storage.

The root shard must first be loaded. Then `k` must be matched exactly with an existing key or prefixed by an existing key whose value is a link to another shard. In the former case the shard has been identified. In the latter case, the linked shard must be loaded and `k` shortened, removing the prefix. The process is then repeated in the linked shard. If no match is found for `k` then traversal has finished.

The following is pseudocode of an algorithm for traversing the storage to identify the shard a key should be placed/found in:

1. Let `link` be the CID of the root shard
2. Retrieve and decode the shard for `link`
3. LOOP over all entries in the shard
    1. IF key of `entry` _equals_ `k` BREAK
    2. IF key of `entry` _starts with_ `k` AND value of `entry` is a shard link
        1. Set `link` to be `entry` shard link
        2. Set `k` to the substring of `k` starting _after_ the key of `entry`
        3. GOTO 2

Traversal should return enough information for a caller to easily identify the key _within_ a shard that should be used to place their value.
