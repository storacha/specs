# Storage protocol

![status:wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

## Editors

- [Yusef Napora](https://github.com/yusefnapora), [DAG House](https://dag.house)

## Authors

- [Yusef Napora](https://github.com/yusefnapora), [DAG House](https://dag.house)

# Abstract

This spec describes the data storage protocol used by web3.storage's "w3up" platform.

The protocol is modeled as a set of capabilities which can be fulfilled by a [provider](./w3-provider.md) via UCAN invocations. In the web3.storage implementation, the providers are implemented using [ucanto](https://github.com/web3-storage/ucanto), a type-safe UCAN RPC framework. 

## Background

The w3up protocol accepts data in [CAR](https://ipld.io/specs/transport/car/) format, and clients are expected to encode data into CARs before invoking storage capabilities. 

The current w3up clients encode files and directories using [UnixFS](https://docs.ipfs.tech/concepts/file-systems/#unix-file-system-unixfs) and the [DAG-PB codec](https://ipld.io/specs/codecs/dag-pb/spec/), however, the storage protocol makes no assumptions about the format of the DAG (or DAGs) contained within a CAR, and any valid IPLD codec may be used.

Large DAGs may be "sharded" across multiple CAR files to fit within storage and transport size limits. In this case, the [`store/add`](#store-add) invocation for each of the shards (apart from the first) will include a CID link to a previous shard, so that the shards can be grouped into a single logical unit.

Because a given CAR can contain many DAGs, and each DAG may itself contain sub-DAGs that can be viewed as standalone entities (e.g. files in a nested directory), the protocol provides separate capabilities for CAR storage and identifying the root of "interesting" DAGs within the CAR. The [`store/` namespace](#store-namespace) defines the capabilities related to CAR storage, while the [`upload/` namespace](#upload-namespace) defines the capabilities for linking the root CID of a DAG to the CAR (or CARs) that contain it.

### Spaces

The `store` and `upload` capabilities operate on "spaces," which are unique namespaces identified by `did:key` URIs. The `with` resource field of all the capabilities described in this spec MUST be a valid `did:key` URI that identifies a space.

The private key for a space is generated locally by each space's owner and is never shared with the service provider. 

The private key for a space is able to issue invocations for the `store` and `upload` capabilities, however we do not recommend issuing invocations directly using the space private key. Instead, the space key should be used to issue a long-lived delegation to an "agent," allowing the agent to invoke capabilities related to the space. If desired, the private key for the space can be saved in "cold storage" and used to issue further delegations.

# Storage protocol

## `store/` namespace

The `store/` namespace contains capabilities relating to storage of CAR files.

### `store/*`

> Delegate all capabilities in the `store/` namespace

The `store/*` capability is the "top" capability of the `store/*` namespace. `store/*` can be delegated to a user agent, but cannot be invoked directly. Instead, it allows the agent to derive any capability in the `store/` namespace, provided the resource URI matches the one in the `store/*` capability delegation. 

In other words, if an agent has a delegation for `store/*` for a given space URI, they can invoke any capability in the `store/` namespace using that space as the resource.

### `store/add`

> Request storage of a CAR file

The `store/add` capability allows an agent to store a CAR file into the space identified by the `did:key` URI in the `with` field. The agent must encode the CAR locally and provide the CAR's CID and size using the `nb.link` and `nb.size` fields, allowing a service to provision a write location for the agent to submit the CAR.


#### Derivations

`store/add` can be derived from a `store/*` or `*` capability with a matching `with` field.

#### Caveats

When invoking a `store/add` capability, the `link` caveat MUST be set to the CID of the CAR being stored.

Each `store/add` invocation applies to a single CAR. When storing large DAGs that are "sharded" across multiple CARs, the `origin` caveat is used to link the shards together in a sequence, similar to a linked list. The first shard to be uploaded will have no `origin` field defined, while each subsequent shard will include an `origin` that links to the previous one.

When preparing sharded CARs, note that each shard must be a valid CAR file with a CAR header; simply chunking a large CAR file into pieces is not sufficient. Instead, split your DAG along block boundaries and create new CAR shards when adding additional blocks would put the total size of the current CAR over the size limit (see below).

The `size` caveat sets a limit on the size (in bytes) of the stored CAR. Agents should check their delegation's `nb.size` field and ensure that they only send CARs with a size below the limit. Larger DAGs may be sharded across multiple CARs as described above. 

Regardless of whether `nb.size` is set in the delegation, the agent must include an `nb.size` field in their invocation, with a value that is equal to the size in bytes of the CAR to be stored. If a limit has been set in the delegation, the size must be less than or equal to the limit.

#### Invocation

To invoke `store/add`, an agent constructs a UCAN with the shape described below. 

The agent MUST include proof that they have been delegated the `store/add` capability for the space identified in the `with` URI. In the special case where the private key corresponding to the space itself is the issuer of the invocation (as opposed to being issued by an agent), the proof may be omitted, as the space key is considered the "owner" of the space. In all other cases, the invocation UCAN must include a delegation that includes the `store/add` ability for the space.

Example:

```js
{
  can: "store/add",
  with: "did:key:abc...",
  nb: {
    link: "bag...",
    size: 1234
  }
}
```

Fields marked as "required" below must be present in the invocation, but may be absent in capability delegations. 

| field       | value                             | required? | context                                                             |
| ----------- | --------------------------------- | --------- | ------------------------------------------------------------------- |
| `can`       | `store/add`                       | ✅         | The ability to add CAR data to a memory space.                      |
| `with`      | URI string, e.g. `did:key:123...` | ✅         | The `did:key` URI for the CAR's destination memory space            |
| `nb.link`   | CAR CID string, e.g. `bag123...`  | ✅         | CID of CAR that the user wants to store                             |
| `nb.origin` | CAR CID string, e.g. `bagabc...`  |            | Optional link to related CARs. See below for more details.          |
| `nb.size`   | size in bytes                     | ✅         | If the `size` caveat is present, the uploaded CAR must be `<= size` |

The `nb.origin` field may be set to provide a link to a related CAR file. This is useful when storing large DAGs that are sharded across multiple CAR files. In this case, the agent can link each uploaded shard with a previous one. Providing the `origin` field informs the service that the CAR being stored is a shard of the larger DAG, as opposed to an intentionally partial DAG. 

Note that the `nb.link` and `nb.origin` caveats contain the CID of the CAR itself, not the CID of any content contained within the CAR. It should have the [multicodec code value `0x0202`](https://github.com/multiformats/multicodec/blob/master/table.csv#L135), which is reserved for data in CAR format. When encoded to a CID string using the default encoding, this results in a CID with a prefix of `bagb`.



#### Responses

*Note*: This section is non-normative and subject to change, pending the [formalization of receipts and invocations](https://github.com/web3-storage/specs/pull/34).

Executing a `store/add` invocation with a service provider should return a result object.

If the invocation fails, the result will include an `error` field with a value of `true`, and a `message` field containing additional details.

On success, the response will include a `status` field, which may have one of the following values:

- `done`: indicates that this CAR has already been stored, and no further action is needed
- `upload`: indicates that the client must upload the CAR to the provided URL.

If `status == 'upload'`, the response will include additional fields containing information about the request, including the URL and headers needed to upload:

| field | type | description |
|-|-|-|
| `url` | string | A URL that will accept a `PUT` request containing the CAR data |
| `headers` | `Record<string, string>` | HTTP headers that must be attached to the `PUT` request |
| `with` | string | The space resource URI used in the invocation |
| `link` | string | The CAR CID specified in the invocation's `link` field |

The client should then make a `PUT` request to the `url` specified in the response, attaching all the included `headers`. The body of the request MUST be CAR data, whose size exactly equals the size specified in the `store/add` invocation's `size` caveat. Additionally, the CID of the uploaded CAR must match the invocation's `link` caveat. In other words, attempting to upload any data other than that authorized by the `store/add` invocation will fail.

### `store/remove`

### `store/list`

## `upload/` namespace

### `upload/*`

### `upload/add`

### `upload/remove`

### `upload/list`
