-- Collaborative RAG edits: invalidate changed vectors and mark the refresh queue dirty.
CREATE TABLE IF NOT EXISTS rag_refresh_state (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    dirty BOOLEAN NOT NULL DEFAULT TRUE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    refreshed_at TIMESTAMPTZ
);

INSERT INTO rag_refresh_state (singleton, dirty)
VALUES (TRUE, TRUE)
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION mark_rag_row_dirty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.embedding := NULL;
    INSERT INTO rag_refresh_state (singleton, dirty, changed_at)
    VALUES (TRUE, TRUE, now())
    ON CONFLICT (singleton) DO UPDATE
      SET dirty = TRUE, changed_at = EXCLUDED.changed_at;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION mark_rag_delete_dirty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO rag_refresh_state (singleton, dirty, changed_at)
    VALUES (TRUE, TRUE, now())
    ON CONFLICT (singleton) DO UPDATE
      SET dirty = TRUE, changed_at = EXCLUDED.changed_at;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS knowledge_chunks_rag_dirty ON knowledge_chunks;
CREATE TRIGGER knowledge_chunks_rag_dirty
BEFORE INSERT OR UPDATE OF title, content ON knowledge_chunks
FOR EACH ROW EXECUTE FUNCTION mark_rag_row_dirty();

DROP TRIGGER IF EXISTS knowledge_chunks_rag_delete ON knowledge_chunks;
CREATE TRIGGER knowledge_chunks_rag_delete
AFTER DELETE ON knowledge_chunks
FOR EACH ROW EXECUTE FUNCTION mark_rag_delete_dirty();

DROP TRIGGER IF EXISTS glossary_rag_dirty ON glossary;
CREATE TRIGGER glossary_rag_dirty
BEFORE INSERT OR UPDATE OF term, definition ON glossary
FOR EACH ROW EXECUTE FUNCTION mark_rag_row_dirty();

DROP TRIGGER IF EXISTS glossary_rag_delete ON glossary;
CREATE TRIGGER glossary_rag_delete
AFTER DELETE ON glossary
FOR EACH ROW EXECUTE FUNCTION mark_rag_delete_dirty();

DROP TRIGGER IF EXISTS rules_rag_dirty ON rules;
CREATE TRIGGER rules_rag_dirty
BEFORE INSERT OR UPDATE OF topic, content ON rules
FOR EACH ROW EXECUTE FUNCTION mark_rag_row_dirty();

DROP TRIGGER IF EXISTS rules_rag_delete ON rules;
CREATE TRIGGER rules_rag_delete
AFTER DELETE ON rules
FOR EACH ROW EXECUTE FUNCTION mark_rag_delete_dirty();
