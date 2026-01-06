declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";

  type Margin = { top?: number; right?: number; bottom?: number; left?: number };

  interface AutoTableStyles {
    fontSize?: number;
    cellPadding?: number;
    valign?: "top" | "middle" | "bottom";
    fontStyle?: string;
    [key: string]: any;
  }

  interface AutoTableColumnStyles {
    [column: string]: AutoTableStyles;
  }

  interface AutoTableOptions {
    startY?: number;
    margin?: Margin;
    theme?: "striped" | "grid" | "plain";
    styles?: AutoTableStyles;
    headStyles?: AutoTableStyles;
    bodyStyles?: AutoTableStyles;
    columnStyles?: AutoTableColumnStyles;
    showHead?: "firstPage" | "everyPage" | "never";
    head?: (string | number)[][];
    body?: (string | number)[][];
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
