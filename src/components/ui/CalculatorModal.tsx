import React, { useEffect, useRef, useState } from "react";

type CalculatorModalProps = {
  open: boolean;
  onClose: () => void;
};

const calculatorKeys = [
  { label: "MC", action: "memory_clear", gridColumn: "1", gridRow: "1", variant: "memory" },
  { label: "M+", action: "memory_add", gridColumn: "2", gridRow: "1", variant: "memory" },
  { label: "M-", action: "memory_sub", gridColumn: "3", gridRow: "1", variant: "memory" },
  { label: "MR", action: "memory_recall", gridColumn: "4", gridRow: "1", variant: "memory" },
  { label: "GT", action: "grand_total", gridColumn: "1", gridRow: "2", variant: "function" },
  { label: "RATE", action: "set_rate", gridColumn: "2", gridRow: "2", variant: "function" },
  { label: "TAX-", action: "tax_sub", gridColumn: "3", gridRow: "2", variant: "function" },
  { label: "TAX+", action: "tax_add", gridColumn: "4", gridRow: "2", variant: "function" },
  { label: "AC", action: "clear", gridColumn: "1", gridRow: "3", variant: "danger" },
  { label: "%", action: "append", value: "%", gridColumn: "2", gridRow: "3", variant: "function" },
  { label: "+/-", action: "toggle_sign", gridColumn: "3", gridRow: "3", variant: "function" },
  { label: "/", action: "append", value: "/", gridColumn: "4", gridRow: "3", variant: "operator" },
  { label: "7", action: "append", value: "7", gridColumn: "1", gridRow: "4", variant: "number" },
  { label: "8", action: "append", value: "8", gridColumn: "2", gridRow: "4", variant: "number" },
  { label: "9", action: "append", value: "9", gridColumn: "3", gridRow: "4", variant: "number" },
  { label: "x", action: "append", value: "x", gridColumn: "4", gridRow: "4", variant: "operator" },
  { label: "4", action: "append", value: "4", gridColumn: "1", gridRow: "5", variant: "number" },
  { label: "5", action: "append", value: "5", gridColumn: "2", gridRow: "5", variant: "number" },
  { label: "6", action: "append", value: "6", gridColumn: "3", gridRow: "5", variant: "number" },
  { label: "-", action: "append", value: "-", gridColumn: "4", gridRow: "5", variant: "operator" },
  { label: "1", action: "append", value: "1", gridColumn: "1", gridRow: "6", variant: "number" },
  { label: "2", action: "append", value: "2", gridColumn: "2", gridRow: "6", variant: "number" },
  { label: "3", action: "append", value: "3", gridColumn: "3", gridRow: "6", variant: "number" },
  { label: "+", action: "append", value: "+", gridColumn: "4", gridRow: "6", variant: "operator" },
  { label: "0", action: "append", value: "0", gridColumn: "1", gridRow: "7", variant: "number" },
  { label: ",", action: "append", value: ".", gridColumn: "2", gridRow: "7", variant: "number" },
  { label: "DEL", action: "backspace", gridColumn: "3", gridRow: "7", variant: "function" },
  { label: "=", action: "evaluate", gridColumn: "4", gridRow: "7", variant: "operator" },
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
  const [memoryValue, setMemoryValue] = useState<number | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
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

  const getCurrentValue = () => {
    const expr = sanitizeCalcInput(calcValue).trim().replace(/x/gi, "*");
    if (!expr) return 0;
    const result = evaluateExpression(expr);
    return result ?? 0;
  };

  const handleMemoryAdd = () => {
    const value = getCurrentValue();
    setMemoryValue((prev) => (prev ?? 0) + value);
  };

  const handleMemorySub = () => {
    const value = getCurrentValue();
    setMemoryValue((prev) => (prev ?? 0) - value);
  };

  const handleMemoryRecall = () => {
    setCalcError(null);
    setCalcValue(formatCalcResult(memoryValue ?? 0));
  };

  const handleTaxRateSet = () => {
    const value = getCurrentValue();
    setTaxRate(value);
  };

  const handleTaxAdjust = (direction: "add" | "sub") => {
    const base = getCurrentValue();
    const delta = (base * taxRate) / 100;
    const next = direction === "add" ? base + delta : base - delta;
    setCalcError(null);
    setCalcValue(formatCalcResult(next));
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
      setGrandTotal((prev) => prev + result);
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
          background: "#d0d0d0",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.35) 2px, rgba(0,0,0,0.06) 4px)",
          border: "1px solid #8b8b8b",
          borderRadius: 10,
          boxShadow: "0 14px 26px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
        ref={calcPanelRef}
      >
        <div style={{ background: "transparent", padding: "10px 10px 12px" }}>
          <div
            style={{
              background: "linear-gradient(180deg, #86c2d1, #7bb7c6)",
              padding: "clamp(12px, 4vw, 18px) clamp(12px, 3vw, 16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              position: "relative",
              cursor: calcDragging ? "grabbing" : "grab",
              border: "1px solid #5f7f86",
              borderRadius: 6,
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.25)",
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
                color: "#2f2f2f",
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
                color: "#1f2937",
                fontSize: "clamp(1.6rem, 7vw, 2.1rem)",
                textAlign: "right",
                width: "100%",
                outline: "none",
                fontWeight: 600,
              }}
              aria-label="Calculadora"
            />
          </div>
          {calcError && (
            <div
              style={{
                background: "#b94f45",
                color: "#fca5a5",
                fontSize: "clamp(0.75rem, 2.5vw, 0.8rem)",
                padding: "6px 12px",
                borderRadius: 6,
                marginTop: 8,
              }}
            >
              {calcError}
            </div>
          )}
          <div style={{ background: "#8e8e8e", padding: 6, borderRadius: 8, marginTop: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gridTemplateRows: "repeat(7, clamp(40px, 10vw, 52px))",
                gap: 6,
                background: "transparent",
              }}
            >
              {calculatorKeys.map((key) => {
                const isOperator = key.variant === "operator";
                const isFunction = key.variant === "function" || key.variant === "memory";
                const isDanger = key.variant === "danger";
                const background = isOperator
                  ? "linear-gradient(180deg, #f4b564, #f08a2f)"
                  : isDanger
                  ? "linear-gradient(180deg, #e58376, #cc5a4f)"
                  : isFunction
                  ? "linear-gradient(180deg, #cfd3da, #aeb4bf)"
                  : "linear-gradient(180deg, #d7d5cc, #bdbbb2)";
                const color = isOperator ? "#1f1f1f" : "#1f2937";
                return (
                  <button
                    key={key.label}
                    type="button"
                    onClick={() => {
                      if (key.action === "clear") return clearCalc();
                      if (key.action === "backspace") return backspaceCalc();
                      if (key.action === "toggle_sign") return toggleSign();
                      if (key.action === "memory_clear") return setMemoryValue(null);
                      if (key.action === "memory_add") return handleMemoryAdd();
                      if (key.action === "memory_sub") return handleMemorySub();
                      if (key.action === "memory_recall") return handleMemoryRecall();
                      if (key.action === "grand_total") return setCalcValue(formatCalcResult(grandTotal));
                      if (key.action === "set_rate") return handleTaxRateSet();
                      if (key.action === "tax_add") return handleTaxAdjust("add");
                      if (key.action === "tax_sub") return handleTaxAdjust("sub");
                      if (key.action === "evaluate") return evaluateCalc();
                      if (key.action === "append" && key.value) return appendCalcValue(key.value);
                      return undefined;
                    }}
                    style={{
                      gridColumn: key.gridColumn,
                      gridRow: key.gridRow,
                      border: "1px solid rgba(0,0,0,0.35)",
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
                      borderRadius: 6,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.2)",
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
