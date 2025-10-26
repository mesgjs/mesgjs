// Strict, module-only comment stripper using Acorn (ESM, browser-friendly).
import * as acorn from "https://esm.sh/acorn@8.15.0";

/**
 * Strip comments from a JS *module* string while preserving line counts.
 * - Line comments are removed (their newline is outside the comment range).
 * - Block comments are replaced with the same number of newlines they contained.
 * - No pragmas/banners kept; no shebang; module syntax only.
 */
export function stripJSComments(src) {
	const comments = [];
	try {
		acorn.parse(src, {
			ecmaVersion: "latest",
			sourceType: "module",
			ranges: true,
			locations: false,
			onComment: comments,
			allowHashBang: false,
		});
	} catch (err) {
		// Fail fast with a clear message; better than "soldiering on" in a transpiler.
		// You can rethrow as-is or wrap to match your Mesgjs error format.
		throw new Error(`@js embed parse error (Acorn): ${err.message}`);
	}

	if (comments.length === 0) return src;

	// Rebuild with comments removed / newline-preserved
	let out = [];
	let cursor = 0;
	comments.sort((a, b) => a.start - b.start);

	for (const c of comments) {
		const { start, end, type } = c;
		if (start < cursor) continue; // defensive (shouldn't happen in strict mode)

		out.push(src.slice(cursor, start));

		if (type === "Block") {
			const text = src.slice(start, end);
			const nl = (text.match(/\r\n|\r|\n/g) || []).length;
			if (nl > 0) out.push("\n".repeat(nl));
			// else insert nothing (single-line block comment)
		}
		// Line comments: insert nothing here; the following slice preserves the newline.
		cursor = end;
	}
	out.push(src.slice(cursor));
	return out.join("");
}

// Example:
// const cleaned = stripModuleComments(code);
