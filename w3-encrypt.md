# W3 Encrypt

![wip](https://img.shields.io/badge/status-wip-orange.svg?style=flat-square)

# Introduction

## Abstract

W3 Encrypt protocol defines a format to encrypt content and how to allow authorized agents to decrypt it. This is done through an encryption service that manages keys in a decentralized context, enabling encryption and providing a way to validate invocations for content decryption.

## Concepts

### Space

A namespace, often referred as a "space", is an owned resource that can be shared. It corresponds to a unique asymmetric cryptographic keypair and is identified by a [`did:key`] URI.

### Content

A file of any type that can be encrypted and stored.

### Encryption Service

The encryption service performs the role of managing keys in a decentralized context. It enables encryption and provides a way to validate invocations to decrypt content. The service should implemented a secure encryption system (e.g., Lit Protocol) that supports:

1. Multi-party threshold secret sharing (TSS) to enable decentralized public key cryptography
2. Equipped with a Trusted Execution Environment (TEE)
3. Identity-based encryption with access control conditions
4. Secure key management
5. UCAN validation

# Capabilities

## Space Content Decrypt

Authorized agent MAY invoke `space/content/decrypt` capability on the [space] subject to decrypt a specified content.

### Space Content Decrypt Example

Invocation example illustrates Bob requesting to decrypt a content under "bafy..." in the space "did:key:zAliceSpace".

```js
{
  "cmd": "/space/content/decrypt",
  "sub": "did:key:zAliceSpace",
  "iss": "did:key:zBob",
  "aud": "did:web:storacha.netowrk",
  "args": {
    "resource": { "/": "bafy..." }
  },
  "prf": [],
  "sig": "..."
}
```

### Space Content Decrypt Capability

#### Space Content Decrypt Capability Schema

```ts
type SpaceContentDecrypt = {
  cmd: "/space/content/decrypt"
  sub: SpaceDID
  args: {
    // Link is the Content Archive (CAR) containing the Encrypted Metadata
    resource: Link<ContentArchive<EncryptedMetadata>>
  }
}

// Type describes a CAR format
type ContentArchive<T> = ByteView<{
  roots: [Block<T>]
  blocks: Block[]
}>

```

### Encrypted Metadata

#### Encrypted Metadata Schema

Encrypted Metadata schema is variant type keyed by the format descriptor label designed to allow format evolution through versioning and additional schema variants.

```ts
type Index = Variant<{
  "encrypted/metadata@0.1": EncryptedMetadata
}>

type EncryptedMetadata = {
    encryptedDataCID: Link<any> 
    identityBoundCiphertext: Uint8Array,
    plaintextKeyHash: Uint8Array 
    accessControlConditions: [Record<string, any>]
}
```

The **Encrypted Metadata** **MUST** summarize all the necessary information required for someone with a delegation to request decryption from the encryption service for the content stored under `encryptedDataCID`.  

The **Encrypted Metadata** should be generated **after** the encryption process is complete, at which point its properties can be defined as follows:

| Name        | Description                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| accessControlConditions (ACC) | Pre-determined identity parameter. |
| plaintextKeyHash       | hash of the original data.|
| identityBoundCiphertext    | The result of encrypting the original data and the identity parameter, which is the hash of the original data and the hash of the ACC|
| encryptedDataCID | Represents the actual data CID of actual encrypted data.|

Example:

```js
{
  "encrypted/metadata@0.1": {
    cypherText: new Uint8Array([109, 70, ... 61]),
    encryptedDataCID:  { "/": "bafy..dag" },
    dataToEncryptHash: new Uint8Array([49, 53, ... 54]),
    accessControlConditions: [
      {
        chain: "ethereum",
        method: "",
        parameters: [
          ":currentActionIpfsId",
          "did:key:z6MktfnQz8Kcz5nsC65oyXWFXhbbAZQavjg6LYuHgv4YbxzN",
        ],
        contractAddress: "",
        returnValueTest: {
          value: "QmPFrQGo5RAtdSTZ4bkaeDHVGrmy2TeEUwTu4LuVAPHiMd",
          comparator: "=",
        },
        standardContractType: "",
      },
    ],
  },
}

```

# Implementation Requirements

## Encryption Service

The encryption service MUST:

1. Support identity-based encryption with access control conditions
2. Provide secure decentralized key management
3. Validate UCAN invocations for decryption

## Client Implementation

### Encryption
Clients implementing this specification **MUST** use the encryption service to encrypt the key used to encrypt the content. This **double encryption strategy** is designed to better handle large files.

Once the encryption key encrypted, the client **MUST** store the encrypted metadata in IPFS, encoded as **DAG-CBOR**.  

### Delegation
The client **MUST** allow users to create a delegation for decrypting the content. The delegated resource **SHOULD** be the **encrypted metadata CID**.  

### Decryption
1. The client **MUST** fetch the **encrypted metadata CAR** from IPFS to retrieve all necessary properties, including the **encryptedData** under **encryptedDataCID**.
2. The client **MUST** authorize a session with the **Encryption Service** to call the **UCAN validation** and decryption function.
3. **Before passing the delegation to the UCAN validation and decryption function,** the client **MUST** create an **invocation**, wrap it in a delegation, and submit it. This ensures that the function validates only the **delegation chain** and does not execute the invocation directly.
4. The **UCAN validation and decryption function** code is stored in **IPFS** to guarantee **immutability**. This function validates the delegation chain and calls the **Encryption Service** to decrypt the key.
5. Once the encryption key is retrieved, the client **MUST** use it to decrypt the actual content and **discard the key immediately** for security reasons.
