# CARv2 MultiIndex

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Authors

* [Alan Shaw](https://github.com/alanshaw), [DAG House](https://dag.house/)

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Abstract

A multi-index is a CARv2 index format that allows multiple CARv2 indexes to be grouped together in a single index.

Typically an index with this format is _not_ stored _in_ a CAR file but as a side index.

## Format `0x0402`: MultiIndex

An unsigned varint of `0x0402` at the "Index offset" byte position or more typically for this type of index, at the start of the file, indicates the following bytes should be interpreted as the "MultiIndex" format.

The format allows multiple CARv2 indexes to be grouped together in a single index, and takes the following form:

```sh
| 0x0402 | count (varint) | car-multihash | carv2-index | car-multihash | carv2-index | ... |
```

Immediately following the codec:

1. `count` - a varint that specifies the number of CAR indexes contained in this multi index.
2. `car-multihash`- the [multihash](https://github.com/multiformats/multihash) of the CAR file that contains the following blocks.
3. `carv2-index` - a CARv2 index ([IndexSorted](https://ipld.io/specs/transport/car/carv2/#format-0x0400-indexsorted), [MultihashIndexSorted](https://ipld.io/specs/transport/car/carv2/#format-0x0401-multihashindexsorted) or other CARv2 index, including identifying codec i.e. `0x0400`, `0x0401` etc.).
4. Repeat from 2, for as many times as the `count` specifies.

Indexes added to the multi-index MUST be sorted by CAR multihash digest.
