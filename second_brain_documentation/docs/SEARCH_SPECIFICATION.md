# Search Specification

## MVP
PostgreSQL full-text search over page titles and text extracted from supported block types. Use indexed `tsvector` columns or a maintained search document table/view, selected based on measured query needs. Keep the index update path transactional or reliably maintained.

## Behavior
- Search titles and block content.
- Return page title, safe snippet, matching block ID where possible, and updated timestamp.
- Rank title matches above weaker body matches unless testing supports another policy.
- Paginate results and bound query length/result count.
- Filter by tags if requested.
- Define whether archived/deleted pages are excluded by default; default to excluding deleted pages and making archive visibility explicit.
- Apply authorization before returning result details.
- Empty query should not accidentally return the entire workspace.

## Future semantic search
Embeddings/vector search are optional. They must not be required for core search and must preserve ownership filtering. Document privacy, cost, indexing, and deletion behavior before adding a vector store.
