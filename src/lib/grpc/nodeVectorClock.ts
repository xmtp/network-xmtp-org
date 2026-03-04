import { NodeVectorClock } from '@/types/nodes';

const SYNC_CURSOR_TIMEOUT = 8000;

/**
 * Read a protobuf varint from a byte array starting at offset.
 * Returns [value as BigInt, next position].
 */
function readVarint(bytes: Uint8Array, offset: number): [bigint, number] {
  let result = 0n;
  let shift = 0n;
  let pos = offset;
  while (pos < bytes.length) {
    const byte = bytes[pos++];
    result |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if ((byte & 0x80) === 0) break;
  }
  return [result, pos];
}

/**
 * Skip a field in a protobuf message given its wire type.
 * Returns the new position after skipping.
 */
function skipField(bytes: Uint8Array, pos: number, wireType: number): number {
  if (wireType === 0) {
    const [, newPos] = readVarint(bytes, pos);
    return newPos;
  } else if (wireType === 2) {
    const [len, afterLen] = readVarint(bytes, pos);
    return afterLen + Number(len);
  }
  // Wire types 1 (64-bit) and 5 (32-bit) are not expected here
  return bytes.length; // bail out
}

/**
 * Parse a VectorClock protobuf message.
 * VectorClock { map<uint32, uint64> node_id_to_sequence_id = 1; }
 * Each map entry is encoded as a repeated message with:
 *   field 1 (key):   varint (uint32 nodeId) or length-delimited string
 *   field 2 (value): varint (uint64 sequenceId) or length-delimited string
 */
function parseVectorClockBytes(bytes: Uint8Array): Record<string, string> {
  const result: Record<string, string> = {};
  let pos = 0;

  while (pos < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, pos);
    pos = afterTag;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 7n);

    if (fieldNumber === 1 && wireType === 2) {
      // Map entry message
      const [len, afterLen] = readVarint(bytes, pos);
      pos = afterLen;
      const entryEnd = pos + Number(len);
      const entryBytes = bytes.slice(pos, entryEnd);
      pos = entryEnd;

      let entryPos = 0;
      let key: string | undefined;
      let value: string | undefined;

      while (entryPos < entryBytes.length) {
        const [entryTag, afterEntryTag] = readVarint(entryBytes, entryPos);
        entryPos = afterEntryTag;
        const entryField = Number(entryTag >> 3n);
        const entryWire = Number(entryTag & 7n);

        if (entryField === 1) {
          if (entryWire === 0) {
            // uint32/uint64 varint key
            const [val, afterVal] = readVarint(entryBytes, entryPos);
            entryPos = afterVal;
            key = String(val);
          } else if (entryWire === 2) {
            // string key
            const [slen, afterSlen] = readVarint(entryBytes, entryPos);
            entryPos = afterSlen;
            key = new TextDecoder().decode(entryBytes.slice(entryPos, entryPos + Number(slen)));
            entryPos += Number(slen);
          } else {
            entryPos = skipField(entryBytes, entryPos, entryWire);
          }
        } else if (entryField === 2) {
          if (entryWire === 0) {
            // uint64 varint value
            const [val, afterVal] = readVarint(entryBytes, entryPos);
            entryPos = afterVal;
            value = String(val);
          } else if (entryWire === 2) {
            // string value
            const [slen, afterSlen] = readVarint(entryBytes, entryPos);
            entryPos = afterSlen;
            value = new TextDecoder().decode(entryBytes.slice(entryPos, entryPos + Number(slen)));
            entryPos += Number(slen);
          } else {
            entryPos = skipField(entryBytes, entryPos, entryWire);
          }
        } else {
          entryPos = skipField(entryBytes, entryPos, entryWire);
        }
      }

      if (key !== undefined && value !== undefined) {
        result[key] = value;
      }
    } else {
      pos = skipField(bytes, pos, wireType);
    }
  }

  return result;
}

/**
 * Parse the raw gRPC-Web ArrayBuffer from GetSyncCursor into a NodeVectorClock.
 * Response: gRPC-Web frame header (5 bytes) + GetSyncCursorResponse protobuf
 * GetSyncCursorResponse { VectorClock latest_sync = 1; }
 */
function parseGetSyncCursorResponse(data: ArrayBuffer): NodeVectorClock {
  const bytes = new Uint8Array(data);

  if (bytes.length < 5) {
    throw new Error('Response too short to contain gRPC-Web frame');
  }

  // Skip gRPC-Web frame header (5 bytes: 1 flag + 4 length)
  const messageBytes = bytes.slice(5);
  let pos = 0;

  while (pos < messageBytes.length) {
    const [tag, afterTag] = readVarint(messageBytes, pos);
    pos = afterTag;
    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 7n);

    if (fieldNumber === 1 && wireType === 2) {
      // latestSync field — parse as VectorClock
      const [len, afterLen] = readVarint(messageBytes, pos);
      pos = afterLen;
      const vectorClockBytes = messageBytes.slice(pos, pos + Number(len));
      const nodeIdToSequenceId = parseVectorClockBytes(vectorClockBytes);
      return { nodeIdToSequenceId };
    } else {
      pos = skipField(messageBytes, pos, wireType);
    }
  }

  throw new Error('GetSyncCursorResponse did not contain a latestSync field');
}

/**
 * Fetch the sync cursor (vector clock) for a node via gRPC-Web.
 * Calls xmtp.xmtpv4.metadata_api.MetadataApi/GetSyncCursor with an empty request.
 *
 * @param nodeId - The node ID (for logging)
 * @param httpAddress - The node's HTTP address
 * @param timeout - Request timeout in milliseconds
 * @returns Promise resolving to the NodeVectorClock
 */
export async function getNodeSyncCursor(
  nodeId: number,
  httpAddress: string,
  timeout: number = SYNC_CURSOR_TIMEOUT
): Promise<NodeVectorClock> {
  if (!httpAddress || httpAddress.trim() === '') {
    throw new Error('No HTTP address configured');
  }

  let baseUrl = httpAddress.trim();
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  const url = `${baseUrl}/xmtp.xmtpv4.metadata_api.MetadataApi/GetSyncCursor`;
  console.log(`[VectorClock] Fetching sync cursor for node ${nodeId} at: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/grpc-web',
        Accept: 'application/grpc-web',
      },
      body: new Uint8Array(5), // empty gRPC-Web request
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.arrayBuffer();
    return parseGetSyncCursorResponse(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}
