/** Extraction texte depuis un PDF stocké (base64). */
export async function extractTextFromPdfBase64(base64: string): Promise<{
  text: string;
  pageCount: number | null;
  method: "unpdf" | "empty";
}> {
  const cleaned = base64.replace(/^data:application\/pdf;base64,/i, "").trim();
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(Buffer.from(cleaned, "base64"));
  } catch {
    return { text: "", pageCount: null, method: "empty" };
  }

  if (bytes.length < 8) {
    return { text: "", pageCount: null, method: "empty" };
  }

  try {
    const { extractText } = await import("unpdf");
    const timeoutMs = Number(process.env.PDF_EXTRACT_TIMEOUT_MS ?? 20000);
    const result = await Promise.race([
      extractText(bytes, { mergePages: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`PDF extract timeout ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
    const text = (typeof result.text === "string" ? result.text : String(result.text ?? ""))
      // eslint-disable-next-line no-control-regex -- strip NUL bytes some PDF extractors leave behind
      .replace(/\u0000/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      text,
      pageCount: typeof result.totalPages === "number" ? result.totalPages : null,
      method: text ? "unpdf" : "empty",
    };
  } catch (err) {
    console.error("PDF text extraction failed:", err);
    return { text: "", pageCount: null, method: "empty" };
  }
}
