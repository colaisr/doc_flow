"use client";

import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { RotateCcw, Check } from "lucide-react";

interface SignatureCanvasProps {
  onSignatureChange?: (signatureData: string | null) => void;
  width?: number;
  height?: number;
  backgroundColor?: string;
  penColor?: string;
  clearButtonText?: string;
  saveButtonText?: string;
  placeholder?: string;
  className?: string;
}

export interface SignatureCanvasRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignatureData: () => string | null;
  getSignatureDataURL: (type?: string, encoderOptions?: number) => string;
}

/**
 * SignatureCanvas - A component for capturing handwritten signatures
 * Supports both mouse and touch input
 * Returns signature as Base64 PNG image
 */
const SignatureCanvasComponent = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  (
    {
      onSignatureChange,
      width = 600,
      height = 200,
      backgroundColor = "#ffffff",
      penColor = "#000000",
      clearButtonText = "נקה",
      saveButtonText = "שמור חתימה",
      placeholder = "חתום כאן...",
      className = "",
    },
    ref
  ) => {
    const sigCanvasRef = useRef<ReactSignatureCanvas | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);
    const [hasSignature, setHasSignature] = useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (sigCanvasRef.current) {
          sigCanvasRef.current.clear();
          setIsEmpty(true);
          setHasSignature(false);
          onSignatureChange?.(null);
        }
      },
      isEmpty: () => {
        return sigCanvasRef.current?.isEmpty() ?? true;
      },
      getSignatureData: () => {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
          return null;
        }
        // Return Base64 PNG data URL
        return sigCanvasRef.current.toDataURL("image/png");
      },
      getSignatureDataURL: (type = "image/png", encoderOptions?: number) => {
        if (!sigCanvasRef.current) {
          return "";
        }
        return sigCanvasRef.current.toDataURL(type, encoderOptions);
      },
    }));

    // Check if canvas is empty on draw end
    const handleEnd = () => {
      if (sigCanvasRef.current) {
        const empty = sigCanvasRef.current.isEmpty();
        setIsEmpty(empty);
        setHasSignature(!empty);
        
        if (!empty) {
          // Get signature as Base64
          const signatureData = sigCanvasRef.current.toDataURL("image/png");
          onSignatureChange?.(signatureData);
        } else {
          onSignatureChange?.(null);
        }
      }
    };

    const handleClear = () => {
      if (sigCanvasRef.current) {
        sigCanvasRef.current.clear();
        setIsEmpty(true);
        setHasSignature(false);
        onSignatureChange?.(null);
      }
    };

    return (
      <div className={`signature-canvas-wrapper ${className}`} dir="rtl">
        <div
          className="border-2 border-gray-300 rounded-lg bg-white relative"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: backgroundColor,
          }}
        >
          {/* Placeholder text when empty */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-gray-400 text-sm">{placeholder}</span>
            </div>
          )}

          {/* Signature Canvas */}
          <ReactSignatureCanvas
            ref={sigCanvasRef}
            canvasProps={{
              width: width,
              height: height,
              className: "signature-canvas w-full h-full cursor-crosshair",
            }}
            backgroundColor={backgroundColor}
            penColor={penColor}
            onEnd={handleEnd}
            throttle={16} // Smooth drawing
          />

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isEmpty}
            className="absolute top-2 right-2 p-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            title={clearButtonText}
            aria-label={clearButtonText}
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Status indicator */}
        {hasSignature && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            <span>חתימה נשמרה</span>
          </div>
        )}
      </div>
    );
  }
);

SignatureCanvasComponent.displayName = "SignatureCanvas";

export default SignatureCanvasComponent;
