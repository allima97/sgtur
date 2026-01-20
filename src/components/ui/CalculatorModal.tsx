import React, { useEffect, useRef, useState } from "react";

type CalculatorModalProps = {
  open: boolean;
  onClose: () => void;
};

const calculatorKeys = [
  { label: "AC", action: "clear", gridColumn: "1", gridRow: "1", variant: "function" },
  { label: "+/-", action: "toggle_sign", gridColumn: "2", gridRow: "1", variant: "function" },
  { label: "%", action: "append", value: "%", gridColumn: "3", gridRow: "1", variant: "function" },
  { label: "/", action: "append", value: "/", gridColumn: "4", gridRow: "1", variant: "operator" },
  { label: "7", action: "append", value: "7", gridColumn: "1", gridRow: "2", variant: "number" },
  { label: "8", action: "append", value: "8", gridColumn: "2", gridRow: "2", variant: "number" },
  { label: "9", action: "append", value: "9", gridColumn: "3", gridRow: "2", variant: "number" },
  { label: "x", action: "append", value: "x", gridColumn: "4", gridRow: "2", variant: "operator" },
  { label: "4", action: "append", value: "4", gridColumn: "1", gridRow: "3", variant: "number" },
  { label: "5", action: "append", value: "5", gridColumn: "2", gridRow: "3", variant: "number" },
  { label: "6", action: "append", value: "6", gridColumn: "3", gridRow: "3", variant: "number" },
  { label: "-", action: "append", value: "-", gridColumn: "4", gridRow: "3", variant: "operator" },
  { label: "1", action: "append", value: "1", gridColumn: "1", gridRow: "4", variant: "number" },
  { label: "2", action: "append", value: "2", gridColumn: "2", gridRow: "4", variant: "number" },
  { label: "3", action: "append", value: "3", gridColumn: "3", gridRow: "4", variant: "number" },
  { label: "+", action: "append", value: "+", gridColumn: "4", gridRow: "4", variant: "operator" },
  { label: "0", action: "append", value: "0", gridColumn: "1 / span 2", gridRow: "5", variant: "number" },
  { label: ",", action: "append", value: ".", gridColumn: "3", gridRow: "5", variant: "number" },
  { label: "=", action: "evaluate", gridColumn: "4", gridRow: "5", variant: "operator" },
] as const;

const sanitizeCalcInput = (value: string) =>
  value.replace(/,/g, ".").replace(/[^0-9+\-*/().x%\s]/gi, "");

const formatCalcResult = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return rounded.toFixed(2);
};

const CalculatorModal: React.FC<CalculatorModalProps> = ({ open, onClose }) => {
  const [calcValue, setCalcValue] = useState("0");
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcPosition, setCalcPosition] = useState<{ x: number; y: number } | null>(null);
  const [calcDragging, setCalcDragging] = useState(false);
  const calcPanelRef = useRef<HTMLDivElement | null>(null);
  const calcInputRef = useRef<HTMLInputElement | null>(null);
  const calcDragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const appendCalcValue = (value: string) => {
    setCalcError(null);
    setCalcValue((prev) => {
      if (prev === "0" && /[0-9]/.test(value)) return value;
      if (prev === "0" && value === ".") return "0.";
      return prev + value;
    });
  };

  const backspaceCalc = () => {
    setCalcError(null);
    setCalcValue((prev) => {
      if (prev.length <= 1) return "0";
      const next = prev.slice(0, -1);
      return next === "-" ? "0" : next;
    });
  };

  const clearCalc = () => {
    setCalcError(null);
    setCalcValue("0");
  };

  const toggleSign = () => {
    setCalcError(null);
    setCalcValue((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "0") return "0";
      let end = trimmed.length - 1;
      while (end >= 0 && !/[0-9.]/.test(trimmed[end])) end -= 1;
      if (end < 0) return trimmed;
      let start = end;
      while (start >= 0 && /[0-9.]/.test(trimmed[start])) start -= 1;
      start += 1;
      let signIndex = start - 1;
      while (signIndex >= 0 && trimmed[signIndex] === " ") signIndex -= 1;
      if (signIndex >= 0 && trimmed[signIndex] === "-") {
        let before = signIndex - 1;
        while (before >= 0 && trimmed[before] === " ") before -= 1;
        if (before < 0 || /[+\-*/(]/.test(trimmed[before])) {
          return trimmed.slice(0, signIndex) + trimmed.slice(signIndex + 1);
        }
      }
      return trimmed.slice(0, start) + "-" + trimmed.slice(start);
    });
  };

  type Token =
    | { type: "number"; value: number }
    | { type: "op"; value: "+" | "-" | "*" | "/" }
    | { type: "percent" }
    | { type: "paren"; value: "(" | ")" };

  const tokenizeExpression = (input: string): Token[] => {
    const tokens: Token[] = [];
    let i = 0;
    while (i < input.length) {
      const ch = input[i];
      if (ch === " " || ch === "\t" || ch === "\n") {
        i += 1;
        continue;
      }
      if (ch >= "0" && ch <= "9" || ch === ".") {
        let num = ch;
        i += 1;
        while (i < input.length && ((input[i] >= "0" && input[i] <= "9") || input[i] === ".")) {
          num += input[i];
          i += 1;
        }
        const value = Number(num);
        tokens.push({ type: "number", value: Number.isFinite(value) ? value : 0 });
        continue;
      }
      if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }
      if (ch === "(" || ch === ")") {
        tokens.push({ type: "paren", value: ch });
        i += 1;
        continue;
      }
      if (ch === "%") {
        tokens.push({ type: "percent" });
        i += 1;
        continue;
      }
      i += 1;
    }
    return tokens;
  };

  const parseFactor = (tokens: Token[], indexRef: { index: number }, base: number | null): number => {
    if (indexRef.index >= tokens.length) return 0;
    const token = tokens[indexRef.index];
    if (token.type === "op" && (token.value === "+" || token.value === "-")) {
      indexRef.index += 1;
      const next = parseFactor(tokens, indexRef, base);
      return token.value === "-" ? -next : next;
    }
    let value = 0;
    if (token.type === "number") {
      value = token.value;
      indexRef.index += 1;
    } else if (token.type === "paren" && token.value === "(") {
      indexRef.index += 1;
      value = parseExpression(tokens, indexRef, base);
      if (tokens[indexRef.index]?.type === "paren" && tokens[indexRef.index]?.value === ")") {
        indexRef.index += 1;
      }
    } else {
      indexRef.index += 1;
    }
    if (tokens[indexRef.index]?.type === "percent") {
      indexRef.index += 1;
      value = base !== null ? (base * value) / 100 : value / 100;
    }
    return value;
  };

  const parseTerm = (tokens: Token[], indexRef: { index: number }, base: number | null): number => {
    let value = parseFactor(tokens, indexRef, base);
    while (indexRef.index < tokens.length) {
      const token = tokens[indexRef.index];
      if (token.type === "op" && (token.value === "*" || token.value === "/")) {
        indexRef.index += 1;
        const right = parseFactor(tokens, indexRef, null);
        value = token.value === "*" ? value * right : value / right;
        continue;
      }
      break;
    }
    return value;
  };

  const parseExpression = (tokens: Token[], indexRef: { index: number }, base: number | null): number => {
    let value = parseTerm(tokens, indexRef, base);
    while (indexRef.index < tokens.length) {
      const token = tokens[indexRef.index];
      if (token.type === "op" && (token.value === "+" || token.value === "-")) {
        indexRef.index += 1;
        const right = parseTerm(tokens, indexRef, value);
        value = token.value === "+" ? value + right : value - right;
        continue;
      }
      break;
    }
    return value;
  };

  const evaluateExpression = (input: string): number | null => {
    const tokens = tokenizeExpression(input);
    if (!tokens.length) return 0;
    const indexRef = { index: 0 };
    const result = parseExpression(tokens, indexRef, null);
    return Number.isFinite(result) ? result : null;
  };

  const evaluateCalc = () => {
    const expr = sanitizeCalcInput(calcValue).trim().replace(/x/gi, "*");
    if (!expr) {
      setCalcError(null);
      setCalcValue("0");
      return;
    }
    try {
      const result = evaluateExpression(expr);
      if (result === null || Number.isNaN(result) || !Number.isFinite(result)) {
        setCalcError("Expressao invalida.");
        return;
      }
      setCalcError(null);
      setCalcValue(formatCalcResult(result));
    } catch (err) {
      setCalcError("Expressao invalida.");
    }
  };

  const clampCalcPosition = (x: number, y: number) => {
    const padding = 12;
    const panel = calcPanelRef.current;
    const width = panel?.offsetWidth || 360;
    const height = panel?.offsetHeight || 420;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);
    return {
      x: Math.min(Math.max(x, padding), maxX),
      y: Math.min(Math.max(y, padding), maxY),
    };
  };

  const startCalcDrag = (clientX: number, clientY: number) => {
    const panel = calcPanelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    calcDragOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setCalcDragging(true);
  };

  const handleCalcMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.tagName === "INPUT") return;
    event.preventDefault();
    startCalcDrag(event.clientX, event.clientY);
  };

  const handleCalcTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.tagName === "INPUT") return;
    const touch = event.touches[0];
    if (!touch) return;
    startCalcDrag(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    if (!open) return;
    if (calcPosition) return;
    const id = window.requestAnimationFrame(() => {
      const panel = calcPanelRef.current;
      if (!panel) return;
      const width = panel.offsetWidth || 360;
      const height = panel.offsetHeight || 420;
      const initial = clampCalcPosition(
        (window.innerWidth - width) / 2,
        (window.innerHeight - height) / 2
      );
      setCalcPosition(initial);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, calcPosition]);

  useEffect(() => {
    if (!calcDragging) return;
    const handleMove = (clientX: number, clientY: number) => {
      setCalcPosition((prev) => {
        const offset = calcDragOffsetRef.current;
        const nextX = clientX - offset.x;
        const nextY = clientY - offset.y;
        return clampCalcPosition(nextX, nextY);
      });
    };
    const onMouseMove = (event: MouseEvent) => handleMove(event.clientX, event.clientY);
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      handleMove(touch.clientX, touch.clientY);
    };
    const stopDrag = () => setCalcDragging(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("touchcancel", stopDrag);
    };
  }, [calcDragging]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      calcInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName || "";
      const isEditable =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        Boolean(target?.isContentEditable);

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (isEditable && target !== calcInputRef.current) return;

      if (event.key === "Enter") {
        event.preventDefault();
        evaluateCalc();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        backspaceCalc();
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        clearCalc();
        return;
      }

      if (event.key.toLowerCase() === "c" && !isEditable) {
        event.preventDefault();
        clearCalc();
        return;
      }

      if (/[0-9]/.test(event.key)) {
        event.preventDefault();
        appendCalcValue(event.key);
        return;
      }

      if (event.key === "." || event.key === ",") {
        event.preventDefault();
        appendCalcValue(".");
        return;
      }

      if (["+", "-", "*", "/", "x", "X"].includes(event.key)) {
        event.preventDefault();
        appendCalcValue(event.key === "*" ? "x" : event.key.toLowerCase());
        return;
      }

      if (event.key === "%") {
        event.preventDefault();
        appendCalcValue("%");
        return;
      }

      if (event.key === "F9") {
        event.preventDefault();
        toggleSign();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, appendCalcValue, backspaceCalc, clearCalc, evaluateCalc, toggleSign]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-panel"
        style={{
          maxWidth: 360,
          width: "92vw",
          padding: 0,
          overflow: "hidden",
          position: "fixed",
          left: calcPosition ? calcPosition.x : "50%",
          top: calcPosition ? calcPosition.y : "50%",
          transform: calcPosition ? "none" : "translate(-50%, -50%)",
          background: "#3f3f3f",
          border: "1px solid #2f2f2f",
        }}
        ref={calcPanelRef}
      >
        <div style={{ background: "#4b4b4b" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #3f3f3f, #2f2f2f)",
              padding: "clamp(12px, 4vw, 16px) clamp(12px, 3vw, 14px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              position: "relative",
              cursor: calcDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleCalcMouseDown}
            onTouchStart={handleCalcTouchStart}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar calculadora"
              style={{
                position: "absolute",
                left: 10,
                top: 10,
                border: "none",
                background: "transparent",
                color: "#f8fafc",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onTouchStart={(event) => event.stopPropagation()}
            >
              X
            </button>
            <input
              type="text"
              value={calcValue}
              onChange={(e) => {
                setCalcError(null);
                setCalcValue(sanitizeCalcInput(e.target.value));
              }}
              ref={calcInputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  evaluateCalc();
                }
                if (e.key === "Escape") {
                  onClose();
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#f8fafc",
                fontSize: "clamp(1.5rem, 7vw, 2rem)",
                textAlign: "right",
                width: "100%",
                outline: "none",
                fontWeight: 500,
              }}
              aria-label="Calculadora"
            />
          </div>
          {calcError && (
            <div
              style={{
                background: "#2f2f2f",
                color: "#fca5a5",
                fontSize: "clamp(0.75rem, 2.5vw, 0.8rem)",
                padding: "6px 12px",
              }}
            >
              {calcError}
            </div>
          )}
          <div style={{ background: "#cbd5e1", padding: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gridTemplateRows: "repeat(5, clamp(44px, 10vw, 54px))",
                gap: 1,
                background: "#4b4b4b",
              }}
            >
              {calculatorKeys.map((key) => {
                const isOperator = key.variant === "operator";
                const isFunction = key.variant === "function";
                const background = isOperator
                  ? "linear-gradient(180deg, #f59e0b, #f97316)"
                  : isFunction
                  ? "linear-gradient(180deg, #5f5f5f, #505050)"
                  : "linear-gradient(180deg, #6b6b6b, #5c5c5c)";
                const color = isOperator ? "#ffffff" : "#f8fafc";
                return (
                  <button
                    key={key.label}
                    type="button"
                    onClick={() => {
                      if (key.action === "clear") return clearCalc();
                      if (key.action === "toggle_sign") return toggleSign();
                      if (key.action === "evaluate") return evaluateCalc();
                      if (key.action === "append" && key.value) return appendCalcValue(key.value);
                      return undefined;
                    }}
                    style={{
                      gridColumn: key.gridColumn,
                      gridRow: key.gridRow,
                      border: "none",
                      background,
                      color,
                      fontWeight: 600,
                      fontSize:
                        key.label.length > 2
                          ? "clamp(0.8rem, 2.6vw, 0.9rem)"
                          : "clamp(1rem, 3.2vw, 1.1rem)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {key.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorModal;
