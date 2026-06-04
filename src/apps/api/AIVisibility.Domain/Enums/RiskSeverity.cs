namespace AIVisibility.Domain.Enums;

/// <summary>
/// Severity of a <c>MentionRiskFlag</c> (Phase 4 measurement-model expansion,
/// item 11). Three levels: Low for ambiguous concerns ("some users reported
/// issues"), Medium for confirmed but limited issues ("known bug with X"),
/// High for material risk ("class-action lawsuit", "security breach").
/// </summary>
public enum RiskSeverity
{
    Low,
    Medium,
    High,
}
