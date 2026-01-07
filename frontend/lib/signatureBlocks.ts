/**
 * Signature Blocks utility functions and types
 * Handles signature block data structures and serialization
 */

export interface SignatureBlock {
  id: string;
  x: number;        // absolute position X in pixels
  y: number;        // absolute position Y in pixels
  width: number;
  height: number;
  label: string;    // Hebrew label
}

export const DEFAULT_SIGNATURE_BLOCK_WIDTH = 200;
export const DEFAULT_SIGNATURE_BLOCK_HEIGHT = 80;
export const DEFAULT_SIGNATURE_LABEL = 'חתימת לקוח';

/**
 * Create a new signature block
 */
export function createSignatureBlock(
  x: number,
  y: number,
  width: number = DEFAULT_SIGNATURE_BLOCK_WIDTH,
  height: number = DEFAULT_SIGNATURE_BLOCK_HEIGHT
): SignatureBlock {
  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    x,
    y,
    width,
    height,
    label: DEFAULT_SIGNATURE_LABEL,
  };
}

/**
 * Serialize signature blocks array to JSON string
 * Includes 'type' field for backend compatibility
 */
export function serializeSignatureBlocks(blocks: SignatureBlock[]): string {
  // Add 'type' field for backend validation compatibility
  const serialized = blocks.map(block => ({
    ...block,
    type: 'client' as const, // All blocks are client type
  }));
  return JSON.stringify(serialized);
}

/**
 * Deserialize JSON string to signature blocks array
 */
export function deserializeSignatureBlocks(json: string | null): SignatureBlock[] {
  if (!json || json.trim() === '') {
    return [];
  }
  
  try {
    const parsed = JSON.parse(json);
    // Validate it's an array
    if (Array.isArray(parsed)) {
      // Validate each block has required fields and migrate old format if needed
      return parsed
        .filter((block: any) => 
          block &&
          typeof block.id === 'string' &&
          typeof block.x === 'number' &&
          typeof block.y === 'number' &&
          typeof block.width === 'number' &&
          typeof block.height === 'number'
        )
        .map((block: any) => {
          // Migrate old format (with type) to new format (without type)
          if (block.type) {
            const { type, ...rest } = block;
            return {
              ...rest,
              label: block.label || DEFAULT_SIGNATURE_LABEL,
            };
          }
          return {
            ...block,
            label: block.label || DEFAULT_SIGNATURE_LABEL,
          };
        }) as SignatureBlock[];
    }
    return [];
  } catch (error) {
    console.error('Error parsing signature blocks JSON:', error);
    return [];
  }
}

/**
 * Validate signature block structure
 */
export function validateSignatureBlock(block: any): block is SignatureBlock {
  return (
    block &&
    typeof block.id === 'string' &&
    typeof block.x === 'number' &&
    typeof block.y === 'number' &&
    typeof block.width === 'number' &&
    typeof block.height === 'number' &&
    typeof block.label === 'string' &&
    block.width > 0 &&
    block.height > 0
  );
}

