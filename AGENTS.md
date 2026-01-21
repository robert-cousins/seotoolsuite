# Agent Instructions

## Commands

- **Build**: `npm run build`
- **Dev**: `npm run dev` (note: may have Turbopack issues, use `npm run build && npm run start` as fallback)
- **Start**: `npm run start`
- **Lint**: `npm run lint`

## Project Structure

- `/src/app` - Next.js App Router pages
- `/src/tools` - Tool components (KeywordResearch, DomainAnalysis, etc.)
- `/src/services/DataForSEO` - DataForSEO API service
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions

## External APIs

### DataForSEO

- **Documentation**: https://docs.dataforseo.com/v3/
- **TypeScript Client (for type definitions)**: https://github.com/dataforseo/TypeScriptClient
  - Use the Librarian to query this repo for response structures and type definitions
  - Key models are in `/src/models/` directory
- **Related Plugin**: `~/.claude/plugins/seo-research/` contains additional reference docs

### API Patterns

When implementing DataForSEO features:

1. Check the TypeScript client repo for exact response structures
2. Note: Different API families have different response formats:
   - `/keywords_data/google_ads/*` - Results are flat array in `tasks[0].result[]`
   - `/dataforseo_labs/google/*` - Results may have nested structure like `tasks[0].result[0].items[]`
3. Always add timeout (60s recommended for slow endpoints)
4. Normalize domain inputs to full URLs with `https://` prefix
