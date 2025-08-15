# Process for Generating Condensed Training Data

This document outlines the process for generating a condensed, LLM-optimized version of training data from more-general documentation.

## 1. Objective

The goal is to create and maintain a partial mirror of the `docs` directory in a directory named `docs-ai-training/`. This directory will contain a compact, fact-based version of (some) source `docs/` content, structured for an AI development partner. It should retain all essential technical information relevant to architectural planning, coding, and debugging. These condensed documents are concatenated to become "chapters" in `docs-ai-training/0-Mesgjs-Training-Data.md` for use in this and other projects.

## 2. Methodology: Mirrored Subtree Condensation

To ensure maintainability and efficiency, the process relies on creating a parallel, condensed version of the `docs` directory structure. Each included source file will have a corresponding condensed file ("chapter") in the `docs-ai-training` subtree. This approach keeps the condensed files organized and makes it trivial to locate the condensed version of any given source document.

When a source document is updated, only its mirrored chapter file in `docs-ai-training` needs to be regenerated.

## 3. Source and Target Structure

The process operates on the source documents within the `docs/` directory tree and produces a mirrored chapter output in `docs-ai-training/`.

-   **Source:** `docs/`
-   **Target:** `docs-ai-training/`

### Example Mapping:
-   `docs/Mesgjs-Language-Overview.md` -> `docs-ai-training/Mesgjs-Language-Overview.md`
-   `docs/interfaces/core.md` -> `docs-ai-training/interfaces/core.md`
-   `docs/command-line/msjscat.md` -> `docs-ai-training/command-line/msjscat.md`

## 4. Condensation Guidelines for AI

The following rules should be applied when transforming a source document into its chapter counterpart in the `docs-ai-training` directory:

-   **Prioritize Facts Over Prose:** For example, retain technical specifications, API signatures, syntax rules, and configuration details, but remove lengthy introductions, narrative-style explanations, and redundant examples.
-   **Use Structure:** Employ markdown headings, lists, and tables to structure information for easy parsing.
-   **Extract Key Information:** For each function or interface, distill its purpose, full signature (parameters, return value, async, generator), and any critical side effects or usage notes. (If you can't properly code or architect without a detail from the source document, it's an essential detail.)
-   **Be Concise:** Use clear, unambiguous language. Avoid jargon where simpler terms suffice. Don't add or include content that doesn't add value or isn't strictly required (examples: code samples and explanatory comments are perfectly reasonable, but don't use unnecessary white space if less still gets the job done). Compact efficiency takes priority over "prettiness" or "human readability" (as long as content accuracy can reasonably be verified visually) in this context.
-   **Preserve Code Examples:** Retain essential code snippets that demonstrate core functionality. Remove examples that are purely illustrative or repetitive.
-   **Context Block:** In order to determine the original source of chapters and their "freshness" in the assembed `0-Mesgjs-Training-Data.md` file, each chapter should include a standard context header block:
```
# <the original document title>
Source: <the original doc/ path (plain, not a link)>\
Condensed: <YYYY-MM-DD condensed-chapter latest-generation-date>
```
-   **"Clean" Endings:** Every chapter file should be written on the assumption that it will be followed by another, in no particular order, within `0-Mesgjs-Training-Data.md`. Don't leave any unterminated state (including, but not limited to, code fences) that could carry over into the next chapter.

## 5. Task Execution Details

In the absence of directions regarding specific files to be added or updated, check `docs-ai-training/0-sources.md` for files that are expected to be included in the collection. The `0-` prefix is used to identify "meta files" (instructions, sources, scripts, concatenated output, etc). These files will be excluded from the compilation.

Executing `./0-check.sh` from within the `docs-ai-training` directory will report any stale *existing* chapters.
