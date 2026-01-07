"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { SignatureBlock } from "@/lib/signatureBlocks";
import { X, Move } from "lucide-react";

interface DocumentOverlayProps {
  signatureBlocks: SignatureBlock[];
  onSignatureBlocksUpdate: (blocks: SignatureBlock[]) => void;
}

/**
 * DocumentOverlay - A transparent overlay that covers the entire document
 * Handles signature blocks (and future elements) with simple mouse-based dragging
 * Similar to Adobe PDF Editor / DocuSign / SignNow
 */
export default function DocumentOverlay({
  signatureBlocks,
  onSignatureBlocksUpdate,
}: DocumentOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    blockId: string | null;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
  }>({
    isDragging: false,
    blockId: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0,
  });
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    blockId: string | null;
    startX: number;
    startY: number;
    originalWidth: number;
    originalHeight: number;
  }>({
    isResizing: false,
    blockId: null,
    startX: 0,
    startY: 0,
    originalWidth: 0,
    originalHeight: 0,
  });

  // Handle block deletion
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("האם אתה בטוח שברצונך למחוק את בלוק החתימה הזה?")) {
      const updated = signatureBlocks.filter((b) => b.id !== id);
      onSignatureBlocksUpdate(updated);
      if (selectedId === id) setSelectedId(null);
    }
  };

  // Start dragging
  const handleDragStart = (block: SignatureBlock, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(block.id);
    setDragState({
      isDragging: true,
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      originalX: block.x,
      originalY: block.y,
    });
  };

  // Start resizing
  const handleResizeStart = (block: SignatureBlock, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(block.id);
    setResizeState({
      isResizing: true,
      blockId: block.id,
      startX: e.clientX,
      startY: e.clientY,
      originalWidth: block.width,
      originalHeight: block.height,
    });
  };

  // Handle mouse move (drag or resize)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const overlayRect = overlay.getBoundingClientRect();

      if (dragState.isDragging && dragState.blockId) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;

        const block = signatureBlocks.find((b) => b.id === dragState.blockId);
        if (!block) return;

        // Calculate new position
        let newX = dragState.originalX + deltaX;
        let newY = dragState.originalY + deltaY;

        // Clamp to overlay bounds
        const maxX = overlayRect.width - block.width;
        const maxY = overlayRect.height - block.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Update block position
        const updated = signatureBlocks.map((b) =>
          b.id === dragState.blockId ? { ...b, x: newX, y: newY } : b
        );
        onSignatureBlocksUpdate(updated);
      }

      if (resizeState.isResizing && resizeState.blockId) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;

        const newWidth = Math.max(100, resizeState.originalWidth + deltaX);
        const newHeight = Math.max(50, resizeState.originalHeight + deltaY);

        const updated = signatureBlocks.map((b) =>
          b.id === resizeState.blockId
            ? { ...b, width: newWidth, height: newHeight }
            : b
        );
        onSignatureBlocksUpdate(updated);
      }
    },
    [dragState, resizeState, signatureBlocks, onSignatureBlocksUpdate]
  );

  // Handle mouse up (end drag or resize)
  const handleMouseUp = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false, blockId: null }));
    setResizeState((prev) => ({ ...prev, isResizing: false, blockId: null }));
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.isDragging, resizeState.isResizing, handleMouseMove, handleMouseUp]);

  // Click on overlay background deselects
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0"
      onClick={handleOverlayClick}
      style={{
        zIndex: 20,
        // Overlay itself should be transparent to clicks - only blocks will catch events
        pointerEvents: "none",
      }}
    >
      {signatureBlocks.map((block) => {
        const isSelected = selectedId === block.id;
        const isDragging = dragState.isDragging && dragState.blockId === block.id;
        const isResizing = resizeState.isResizing && resizeState.blockId === block.id;

        return (
          <div
            key={block.id}
            className={`absolute select-none ${
              isSelected ? "ring-2 ring-blue-500" : ""
            } ${isDragging || isResizing ? "opacity-80" : ""}`}
            style={{
              left: `${block.x}px`,
              top: `${block.y}px`,
              width: `${block.width}px`,
              height: `${block.height}px`,
              cursor: isDragging ? "grabbing" : "default",
              // Only signature blocks themselves catch pointer events
              pointerEvents: "auto",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(block.id);
            }}
          >
            {/* Signature block visual */}
            <div
              className="w-full h-full bg-blue-50 border-2 border-blue-300 rounded-lg flex flex-col"
              dir="rtl"
            >
              {/* Header - drag handle */}
              <div
                className="flex items-center justify-between px-2 py-1 bg-blue-100 rounded-t-md cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleDragStart(block, e)}
              >
                <div className="flex items-center gap-1">
                  <Move className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    {block.label}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDelete(block.id, e)}
                  className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-100"
                  title="מחק"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Signature area */}
              <div className="flex-1 flex items-center justify-center border-t border-blue-200">
                <span className="text-gray-400 text-xs">{block.label}</span>
              </div>
            </div>

            {/* Resize handle (bottom-left for RTL) */}
            <div
              className="absolute bottom-0 left-0 w-4 h-4 bg-blue-400 rounded-tr-md cursor-nwse-resize hover:bg-blue-500"
              onMouseDown={(e) => handleResizeStart(block, e)}
              title="שנה גודל"
            />
          </div>
        );
      })}
    </div>
  );
}

