#!/usr/bin/env bash
set -euo pipefail

# Check TestFlight build status via App Store Connect API
# Usage: ./scripts/check-testflight.sh [build_number]
#
# Prerequisites:
#   Set these env vars (or add to ~/.idle/asc-credentials.env):
#     ASC_KEY_ID       - App Store Connect API Key ID
#     ASC_ISSUER_ID    - App Store Connect Issuer ID
#     ASC_KEY_FILE     - Path to .p8 private key file
#
# The ASC App ID is hardcoded below (from eas.json).

ASC_APP_ID="6760240746"
BUNDLE_ID="com.northglass.idle"

# Load credentials from file if env vars not set
CREDS_FILE="${HOME}/.idle/asc-credentials.env"
if [[ -f "$CREDS_FILE" ]]; then
    source "$CREDS_FILE"
fi

# Validate required vars
if [[ -z "${ASC_KEY_ID:-}" || -z "${ASC_ISSUER_ID:-}" || -z "${ASC_KEY_FILE:-}" ]]; then
    echo "Error: Missing ASC API credentials."
    echo ""
    echo "Set these env vars or create ${CREDS_FILE}:"
    echo "  ASC_KEY_ID=<your-key-id>"
    echo "  ASC_ISSUER_ID=<your-issuer-id>"
    echo "  ASC_KEY_FILE=<path-to-.p8-file>"
    echo ""
    echo "Create an API key at:"
    echo "  https://appstoreconnect.apple.com/access/integrations/api"
    exit 1
fi

if [[ ! -f "$ASC_KEY_FILE" ]]; then
    echo "Error: Key file not found: $ASC_KEY_FILE"
    exit 1
fi

export ASC_KEY_ID ASC_ISSUER_ID ASC_KEY_FILE

# Generate JWT using Python (handles ES256 DER→raw R||S conversion correctly)
generate_jwt() {
    python3 << 'PYEOF'
import json, time, base64, struct
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
import os

key_id = os.environ["ASC_KEY_ID"]
issuer_id = os.environ["ASC_ISSUER_ID"]
key_file = os.environ["ASC_KEY_FILE"]

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

now = int(time.time())

header = b64url(json.dumps({"alg": "ES256", "kid": key_id, "typ": "JWT"}))
payload = b64url(json.dumps({"iss": issuer_id, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}))

with open(key_file, "rb") as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

signing_input = f"{header}.{payload}".encode()
der_sig = private_key.sign(signing_input, ec.ECDSA(hashes.SHA256()))

# Convert DER signature to raw R||S (32 bytes each) for JWT
r, s = decode_dss_signature(der_sig)
raw_sig = r.to_bytes(32, "big") + s.to_bytes(32, "big")
signature = b64url(raw_sig)

print(f"{header}.{payload}.{signature}")
PYEOF
}

echo "Generating JWT..."
JWT=$(generate_jwt)

# Query builds
BUILD_NUMBER="${1:-}"
LIMIT="5"
VERSION_FILTER=""

if [[ -n "$BUILD_NUMBER" ]]; then
    echo "Checking build $BUILD_NUMBER..."
    LIMIT="1"
    VERSION_FILTER="$BUILD_NUMBER"
else
    echo "Checking latest builds..."
fi

RESPONSE=$(curl -s -G \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    --data-urlencode "filter[app]=${ASC_APP_ID}" \
    --data-urlencode "fields[builds]=version,uploadedDate,processingState,buildAudienceType,minOsVersion" \
    --data-urlencode "sort=-uploadedDate" \
    --data-urlencode "limit=${LIMIT}" \
    ${VERSION_FILTER:+--data-urlencode "filter[version]=${VERSION_FILTER}"} \
    "https://api.appstoreconnect.apple.com/v1/builds")

# Parse and display
python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'errors' in data:
    for e in data['errors']:
        print(f'  Error: {e.get(\"detail\", e.get(\"title\", \"Unknown\"))}')
    sys.exit(1)
builds = data.get('data', [])
if not builds:
    print('  No builds found.')
    sys.exit(0)
for b in builds:
    attrs = b['attributes']
    print(f'  Build {attrs[\"version\"]}')
    print(f'    Processing: {attrs.get(\"processingState\", \"unknown\")}')
    print(f'    Uploaded:   {attrs.get(\"uploadedDate\", \"unknown\")}')
    print(f'    Min OS:     {attrs.get(\"minOsVersion\", \"unknown\")}')
    print()
" <<< "$RESPONSE"
