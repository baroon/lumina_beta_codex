namespace AIVisibility.Domain.Enums;

/// <summary>
/// Discriminator on <see cref="Entities.TrendPoint.EntityType"/> identifying
/// which side of the analysis the trend point measures (Phase 4 v2, D1).
/// The companion <c>EntityId</c> column references different tables
/// depending on this value:
/// <list type="bullet">
///   <item><see cref="Brand"/> → <c>brands.id</c></item>
///   <item><see cref="Competitor"/> → <c>competitors.id</c></item>
/// </list>
/// No DB-level FK because the target table varies; aggregator + read
/// handlers validate the (type, id) pair on write/read.
/// </summary>
public enum TrendEntityType
{
    Brand,
    Competitor,
}
