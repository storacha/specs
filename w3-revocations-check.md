# W3 Revocations Check Protocol

## Authors

- [Felipe Forbeck](https://github.com/fforbeck)

## Editors

- [Alan Shaw](https://github.com/alanshaw)

## Abstract

The W3 Revocations Check protocol provides a public API endpoint for checking if specific delegation CIDs have been revoked and retrieving cryptographic proof data for trustless verification. This protocol enables clients to verify the validity of UCAN delegations by checking their revocation status.

## Language

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119).

# Introduction

The revocations check protocol allows clients to verify whether UCAN delegations have been explicitly revoked. The protocol provides a simple HTTP GET endpoint that returns either cryptographic proof of revocation or indicates that no revocation exists for the queried delegation CID.

# Capabilities

## Revocation Check

### Endpoint Details

- **Method:** `GET`
- **Path:** `/{cid}` (can be hosted at any path, the CID parameter is the key component)
- **Authentication:** None required (public endpoint)
- **CDN Cacheable:** Yes (simple GET requests with 200/404 responses)

### Request Format

#### URL Parameters

**`cid`** (required): Delegation CID to check for revocations. Must be a valid IPFS CID string.

#### Constraints

- **CID Format:** Valid IPFS CID string (e.g., `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)
- **Encoding:** the CID SHOULD be encoded using multibase base32 (e.g., `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)

### Response Format

#### Success Response (200): Delegation Revoked

**Content-Type:** `application/vnd.ipld.car`

Returns a CAR (Content Addressable aRchive) file containing:

- Revocation metadata in `revocations@0.0.1` schema
- Embedded UCAN proof blocks for trustless verification
- ETag header for caching optimization

##### CAR File Structure

The CAR file contains a root block with the following structure (shown in DAG-JSON for readability, but it is RECOMMENDED that the root block be encoded as [DAG-CBOR](https://ipld.io/docs/codecs/known/dag-cbor/) for efficiency):

```json
{
  "revocations@0.0.1": {
    "revocations": [
      {
        "delegation": { "/": "[delegationCID]" },
        "scope": "[scopeDID]", 
        "cause": { "/": "[causeCID]" }
      }
    ]
  }
}
```

**Field Descriptions:**

- **`delegation`**: CID of the delegation that has been revoked
- **`scope`**: DID of the authority that issued the revocation (either the issuer or audience of the delegation under inspection, or one of its proofs). *Note: This field is derivable from the cause invocation but included for convenience*
- **`cause`**: CID referencing a `ucan/revoke` invocation that caused this revocation. This must be a valid UCAN with `can: "ucan/revoke"` capability, containing:
  - `with`: DID of the principal that issued the UCAN being revoked (or some UCAN in its proof chain)
  - `nb.ucan`: Link to the UCAN being revoked
  - `nb.proof`: Recommended list of UCAN links showing the path from revoked UCAN to the authority
  
  See the [W3 UCAN Revocation specification](https://github.com/storacha/specs/blob/main/w3-ucan.md#revocation) for complete details.

##### Embedded Proof Blocks

The CAR file includes the complete UCAN revocation proof referenced by `causeCID`, enabling clients to:

- Cryptographically verify the revocation signature
- Validate the revocation authority chain
- Perform trustless verification without server dependency

#### Not Found Response (404): No Revocation Record Found

**Content-Type:** `text/plain`

```text
No revocation record found
```

This indicates that this service does not know of a revocation for the provided delegation CID. Clients should check the delegation's proof chain to determine if it's invalid due to revoked dependencies by sending subsequent requests.

### Error Responses

#### 400 Bad Request

**Content-Type:** `application/json`

##### Invalid CID Parameter

```json
{
  "error": "Bad request",
  "message": "Invalid CID parameter"
}
```

##### Missing CID Parameter

```json
{
  "error": "Bad request", 
  "message": "CID parameter is required"
}
```

#### 500 Internal Server Error

**Content-Type:** `application/json`

##### Query Failure

```json
{
  "error": "Internal server error",
  "message": "Failed to query revocations"
}
```

##### General Error

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

### CORS Headers

The endpoint includes CORS headers for cross-origin requests:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET`
- `Access-Control-Allow-Headers: Accept`

# Usage Examples

## cURL Example

```bash
# Check if a delegation is revoked
curl -X GET https://revocations.storacha.network/{cid}

# Save CAR file for offline verification (when response is 200)
curl -X GET https://revocations.storacha.network/{cid} \
  -H "Accept: application/vnd.ipld.car" \
  -o revocation-proof.car
```
