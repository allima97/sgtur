export type QuoteStatus = "DRAFT" | "IMPORTED" | "CONFIRMED" | "FAILED";

export type QuoteSegmentDraft = {
  segment_type: string;
  data: Record<string, unknown>;
  order_index: number;
};

export type QuoteItemDraft = {
  temp_id: string;
  item_type: string;
  title: string;
  product_name: string;
  city_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  start_date: string;
  end_date: string;
  currency: string;
  confidence: number;
  raw: Record<string, unknown>;
  segments: QuoteSegmentDraft[];
};

export type QuoteDraft = {
  source: "CVC_PDF";
  status: QuoteStatus;
  currency: string;
  total: number;
  average_confidence: number;
  items: QuoteItemDraft[];
  meta: {
    file_name: string;
    page_count: number;
    extracted_at: string;
  };
  raw_json: Record<string, unknown>;
};

export type ImportLogDraft = {
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  payload?: Record<string, unknown>;
};

export type ImportDebugImage = {
  label: string;
  data_url: string;
  page: number;
  card_index: number;
};

export type ImportResult = {
  draft: QuoteDraft;
  logs: ImportLogDraft[];
  debug_images: ImportDebugImage[];
};
