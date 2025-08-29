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
- **Path:** `/revocations/{cid}`
- **Authentication:** None required (public endpoint)
- **CDN Cacheable:** Yes (simple GET requests with 200/404 responses)

### Request Format

#### URL Parameters

**`cid`** (required): Delegation CID to check for revocations. Must be a valid IPFS CID string.

#### Constraints

- **CID Format:** Valid IPFS CID string (e.g., `bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi`)
- **Encoding:** CID will be normalized to string format internally

### Response Format

#### Success Response (200): Delegation Revoked

**Content-Type:** `application/vnd.ipld.car`

Returns a CAR (Content Addressable aRchive) file containing:

- Revocation metadata in `revocations@0.0.1` schema
- Embedded UCAN proof blocks for trustless verification
- ETag header for caching optimization

##### CAR File Structure

The CAR file contains a root block with the following structure:

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

##### Embedded Proof Blocks

The CAR file includes the complete UCAN revocation proof referenced by `causeCID`, enabling clients to:

- Cryptographically verify the revocation signature
- Validate the revocation authority chain
- Perform trustless verification without server dependency

#### Not Found Response (404): Delegation Not Revoked

**Content-Type:** `text/plain`

```text
Delegation not revoked
```

This indicates the delegation CID has not been explicitly revoked. Clients should check the delegation's proof chain to determine if it's invalid due to revoked dependencies.

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
curl -X GET https://up.storacha.network/revocations/{cid}

# Save CAR file for offline verification (when response is 200)
curl -X GET https://up.storacha.network/revocations/{cid} \
  -H "Accept: application/vnd.ipld.car" \
  -o revocation-proof.car
```

## Client-Side Proof Chain Verification

```javascript
/**
 * Recursively verify the delegation proof chain for revocations
 */
async function verifyProofChain(delegation) {
  // Check if delegation is explicitly revoked
  const response = await fetch(`https://up.storacha.network/revocations/${delegation.cid}`);
  
  if (response.status === 200) {
    return { isValid: false, reason: 'Delegation explicitly revoked' };
  }
  
  // Check proof chain recursively
  for (const proof of delegation.proofs) {
    const proofResult = await verifyProofChain(proof);
    if (!proofResult.isValid) {
      return { isValid: false, reason: `Proof chain broken: ${proofResult.reason}` };
    }
  }
  
  return { isValid: true };
}
```
