# Process for Generating Condensed Training Data

This document outlines the process for generating a condensed, LLM-optimized version of training data from more-general documentation.

## 1. Objective

The goal is to create and maintain a partial mirror of the `docs` directory in a directory named `docs-ai-training/`. This directory will contain a compact, fact-based version of (some) source `docs/` content, structured for an AI development partner. It should retain all essential technical information relevant to architectural planning, coding, and debugging. These condensed documents are concatenated to become "chapters" in `docs-ai-training/0-Mesgjs-Training-Data.md` for use in this and other projects.

## 2. Methodology: Mirrored Subtree Condensation

To ensure maintainability and efficiency, a parallel, condensed version of the `docs` directory structure is created. Each included source file will have a corresponding condensed file ("chapter") in the `docs-ai-training` subtree. This approach keeps the condensed files organized and makes it trivial to locate the condensed version of any given source document.

When a source document is updated, only its mirrored chapter file in `docs-ai-training` needs to be regenerated.

## 3. Source and Target Structure

The process operates on the source documents within the `docs/` directory tree and produces a mirrored chapter output in `docs-ai-training/`.

- **Source:** `docs/`
- **Target:** `docs-ai-training/`

### Example Mapping:
- `docs/Mesgjs-Language-Overview.md` -> `docs-ai-training/Mesgjs-Language-Overview.md`
- `docs/interfaces/core.md` -> `docs-ai-training/interfaces/core.md`
- `docs/command-line/msjscat.md` -> `docs-ai-training/command-line/msjscat.md`

## 4. Condensation Guidelines for AI

The following rules should be applied when transforming a source document into its chapter counterpart in the `docs-ai-training` directory:

- **Prioritize Facts Over Prose:** Retain technical specifications, API signatures, syntax rules, and configuration details. Remove lengthy introductions, narrative-style explanations, and redundant examples.
- **Use Structure:** Employ markdown headings, lists, and tables.
- **Extract Key Information:** For each function or interface, distill its purpose, full signature, and any critical side effects or usage notes. If a detail is required for coding or architecture, it's essential.
- **Preserve Essential Metadata:** Do not omit critical metadata, even if it seems verbose. For example, the `(RIC: ...)` annotations for message parameters are architecturally significant and must be preserved.
- **Be Concise:** Use clear, unambiguous language. Compactness is a priority, but not at the expense of technical accuracy.
  - Example: Use `- ` for lists and indent with two spaces.
  - Information density should be a consideration when choosing an appropriate structure (e.g. sometimes a table can convey the same details more compactly than a list)
- **Preserve Code Examples:** Retain essential code snippets that demonstrate core functionality.
- **Context Block:** Each chapter must include a standard context header:
```
# <the original document title>
Source: <the original doc/ path (plain, not a link)>
Condensed: <YYYY-MM-DD condensed-chapter latest-generation-date>
```
- **"Clean" Endings:** Ensure every chapter file is self-contained and does not leave any unterminated state (like code fences).
- **Informed Updates:** Unless otherwise instructed, examine any existing version of a chapter for context before updating/replacing it.

## 5. Task Execution Details

In the absence of directions regarding specific files to be added or updated, check `docs-ai-training/0-sources.md` for files that are expected to be included in the collection. The `0-` prefix is used to identify "meta files" (instructions, sources, scripts, concatenated output, etc). These files will be excluded from the compilation.

Executing `./0-check.sh` from within the `docs-ai-training` directory will report any stale *existing* chapters.
