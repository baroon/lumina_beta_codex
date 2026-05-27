namespace AIVisibility.Domain.Enums;

/// <summary>
/// What kind of tracked entity a <see cref="Entities.Mention"/> refers to
/// (Phase 3 plan D12 + D18). The universe is tracked-only — no `Other` type.
/// Untracked LLM-named entities go to <see cref="Entities.MentionCandidate"/>
/// instead (per D19's forward-only promotion model).
///
/// EntityId on a Mention row always points at the matching entity row of the
/// corresponding type (enforced by the DB CHECK constraint that
/// entity_id IS NOT NULL).
/// </summary>
public enum MentionEntityType
{
    Brand,
    Competitor,
    Product,
}
