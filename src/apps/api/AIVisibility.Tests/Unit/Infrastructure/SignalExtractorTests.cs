using AIVisibility.Application.Interfaces;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Analysis;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace AIVisibility.Tests.Unit.Infrastructure;

/// <summary>
/// SignalExtractor unit tests. IOpenAiService is the test seam (D8) — these
/// tests mock it to return canned JSON envelopes and verify the parser,
/// entity-resolution rules (D12 / D18 / D19), v1 URL-domain citation
/// classification (D14, Phase 4 Slice 0), and the post-processed source
/// counts on AnswerSignal (D11).
///
/// Phase 4 Slice 0 change: extractor produces <see cref="DraftCitation"/>
/// records, not <see cref="Citation"/> entities. The v1 classifier returns
/// Owned / Competitor / Unknown only — "URL present but no match" is now
/// Unknown (honest) instead of a fake ThirdParty label. The downstream job
/// promotes drafts into Source / SourceUrl / BrandSourceClassification rows.
/// </summary>
public class SignalExtractorTests
{
    private static (SignalExtractor Extractor, Mock<IOpenAiService> OpenAi) Build(string llmResponse)
    {
        var openAi = new Mock<IOpenAiService>();
        openAi
            .Setup(s => s.ChatCompletionAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<double>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(llmResponse);
        return (new SignalExtractor(openAi.Object, new Mock<ILogger<SignalExtractor>>().Object), openAi);
    }

    private static SignalExtractionContext Context(
        string brandName = "Lumina",
        string brandUrl = "https://lumina.io",
        params (string Name, string? Domain)[] competitors)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = brandName,
            WebsiteUrl = brandUrl,
        };
        var comps = competitors.Select(c => new Competitor
        {
            Id = Guid.NewGuid(),
            BrandId = brand.Id,
            Name = c.Name,
            Domain = c.Domain,
        }).ToList();
        return new SignalExtractionContext(brand, comps, Array.Empty<Product>());
    }

    private static AIAnswer Answer(string text = "Answer body") => new()
    {
        Id = Guid.NewGuid(),
        PromptRunId = Guid.NewGuid(),
        AnswerText = text,
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task Returns_Null_WhenOpenAiResponseIsEmpty()
    {
        // IOpenAiService returns empty string on failure / missing API key — the
        // extractor must treat that as a per-answer failure so the calling job
        // can catch-and-continue (D3).
        var (sut, _) = Build(string.Empty);
        var result = await sut.ExtractAsync(Answer(), Context(), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Returns_Null_OnInvalidJson()
    {
        var (sut, _) = Build("not json at all");
        var result = await sut.ExtractAsync(Answer(), Context(), CancellationToken.None);
        result.Should().BeNull();
    }

    [Fact]
    public async Task Parses_FullEnvelope_AndPopulatesAllRows()
    {
        var context = Context(
            brandName: "Lumina",
            brandUrl: "https://lumina.io",
            competitors: new[] { ("Acme", (string?)"acme.com"), ("Beta", (string?)"beta.com") });

        const string json = """
            {
              "answer_signal": {
                "brand_mentioned": true,
                "brand_recommended": true,
                "brand_rank": 1,
                "brand_sentiment": "Positive",
                "brand_recommendation_strength": "Strong",
                "top_recommended_entity": "Lumina",
                "answer_has_ranking": true,
                "answer_has_comparison": true,
                "answer_has_citations": true,
                "confidence_score": 0.9
              },
              "mentions": [
                {
                  "entity_type": "Brand",
                  "name": "Lumina",
                  "is_recommended": true,
                  "recommendation_strength": "Strong",
                  "sentiment": "Positive",
                  "evidence_snippet": "Lumina is top.",
                  "confidence_score": 0.95
                },
                {
                  "entity_type": "Competitor",
                  "name": "Acme",
                  "is_recommended": false,
                  "recommendation_strength": "Moderate",
                  "sentiment": "Neutral",
                  "evidence_snippet": "Acme also rated.",
                  "confidence_score": 0.8
                }
              ],
              "citations": [
                { "source_name": "Lumina blog", "url": "https://blog.lumina.io/post", "confidence_score": 0.9 },
                { "source_name": "Acme page",   "url": "https://acme.com/x",          "confidence_score": 0.8 },
                { "source_name": "Wikipedia",   "url": "https://en.wikipedia.org/w",  "confidence_score": 0.7 },
                { "source_name": "Trustpilot",  "url": null,                          "confidence_score": 0.6 }
              ]
            }
            """;
        var (sut, _) = Build(json);

        var result = await sut.ExtractAsync(Answer(), context, CancellationToken.None);

        result.Should().NotBeNull();
        result!.Signal.BrandMentioned.Should().BeTrue();
        result.Signal.BrandRank.Should().Be(1);
        result.Signal.BrandSentiment.Should().Be(Sentiment.Positive);
        result.Signal.BrandRecommendationStrength.Should().Be(RecommendationStrength.Strong);

        result.Mentions.Should().HaveCount(2);
        result.Mentions.Should().ContainSingle(m => m.EntityType == MentionEntityType.Brand && m.EntityId == context.Brand.Id);
        result.Mentions.Should().ContainSingle(m =>
            m.EntityType == MentionEntityType.Competitor &&
            m.EntityId == context.TrackedCompetitors.First(c => c.Name == "Acme").Id);
        result.Candidates.Should().BeEmpty();

        result.Citations.Should().HaveCount(4);

        // Source counts come from classified draft citations (D11). Phase 4
        // Slice 0: the v1 URL-domain classifier returns Owned/Competitor/Unknown
        // only — Wikipedia + Trustpilot both fall to Unknown (URL not in
        // tracked-brand or tracked-competitor lists), so ThirdPartySourceCount
        // is always 0 in v1. The aggregator's bucket-back-to-ThirdParty kicks
        // in once LLM/KnownDomainList classification produces specific values
        // (Editorial, UGC, etc.).
        result.Signal.OwnedSourceCount.Should().Be(1);        // blog.lumina.io
        result.Signal.CompetitorSourceCount.Should().Be(1);   // acme.com
        result.Signal.ThirdPartySourceCount.Should().Be(0);   // always 0 in v1
    }

    [Fact]
    public async Task ClassifiesCitations_ByDomainMatch()
    {
        // Verifies the exact-or-subdomain rule of ClassifyCitation:
        //   blog.lumina.io ⊆ lumina.io        -> Owned
        //   acme.com == acme.com              -> Competitor
        //   fake-acme.com != acme.com         -> Unknown (Phase 4 Slice 0:
        //                                       "URL present but no match" is
        //                                       Unknown, not fake-ThirdParty)
        //   en.wikipedia.org                  -> Unknown
        var context = Context(
            brandName: "Lumina",
            brandUrl: "https://lumina.io",
            competitors: new[] { ("Acme", (string?)"acme.com") });

        const string json = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "top_recommended_entity": null,
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": true, "confidence_score": 0.5
              },
              "mentions": [],
              "citations": [
                { "source_name": "Lumina blog",  "url": "https://blog.lumina.io/a", "confidence_score": 0.9 },
                { "source_name": "Acme",         "url": "https://acme.com/b",       "confidence_score": 0.9 },
                { "source_name": "Faux Acme",    "url": "https://fake-acme.com/c",  "confidence_score": 0.5 },
                { "source_name": "Wikipedia",    "url": "https://en.wikipedia.org/", "confidence_score": 0.7 }
              ]
            }
            """;
        var (sut, _) = Build(json);

        var result = await sut.ExtractAsync(Answer(), context, CancellationToken.None);

        // NormalizedDomain stores the full host (only "www." is stripped); the
        // subdomain match happens during classification, not during normalization.
        result!.Citations.Single(c => c.NormalizedDomain == "blog.lumina.io")
            .ClassifiedAs.Should().Be(SourceType.Owned);
        result.Citations.Single(c => c.NormalizedDomain == "acme.com")
            .ClassifiedAs.Should().Be(SourceType.Competitor);
        result.Citations.Single(c => c.NormalizedDomain == "fake-acme.com")
            .ClassifiedAs.Should().Be(SourceType.Unknown);
        result.Citations.Single(c => c.NormalizedDomain == "en.wikipedia.org")
            .ClassifiedAs.Should().Be(SourceType.Unknown);
    }

    [Fact]
    public async Task UntrackedCompetitor_BecomesMentionCandidate_NotMention()
    {
        // D19: LLM names "Gamma" but it's not in the tracker's tracked competitors.
        // It must land in mention_candidates, not mentions (D18 — universe is
        // tracked-only).
        var context = Context(
            competitors: new[] { ("Acme", (string?)"acme.com") });

        const string json = """
            {
              "answer_signal": {
                "brand_mentioned": false, "brand_recommended": false,
                "brand_rank": null, "brand_sentiment": "Unknown",
                "brand_recommendation_strength": "Unknown",
                "top_recommended_entity": null,
                "answer_has_ranking": false, "answer_has_comparison": false,
                "answer_has_citations": false, "confidence_score": 0.5
              },
              "mentions": [
                {
                  "entity_type": "Competitor",
                  "name": "Gamma",
                  "is_recommended": false,
                  "recommendation_strength": "Weak",
                  "sentiment": "Neutral",
                  "evidence_snippet": "Gamma is also an option.",
                  "confidence_score": 0.4
                }
              ],
              "citations": []
            }
            """;
        var (sut, _) = Build(json);

        var result = await sut.ExtractAsync(Answer(), context, CancellationToken.None);

        result!.Mentions.Should().BeEmpty();
        result.Candidates.Should().ContainSingle();
        result.Candidates[0].ClaimedEntityType.Should().Be(MentionEntityType.Competitor);
        result.Candidates[0].ClaimedName.Should().Be("Gamma");
        result.Candidates[0].NormalizedName.Should().Be("gamma");
    }

    [Fact]
    public async Task BrandNotMentioned_CoercesStrengthAndSentiment_ToUnknown_RegardlessOfLlmEmittedValue()
    {
        // D13 invariant ("absence is not negative"): when brand_mentioned=false,
        // BrandSentiment + BrandRecommendationStrength must be Unknown, BrandRank
        // null, BrandRecommended false — regardless of what the LLM emits in the
        // envelope. This is defense-in-depth against prompt non-compliance: real
        // gpt-4o-mini output observed in verify-e2e (2026-05-27) emitted
        // recommendation_strength=NotRecommended on 49% of unmentioned-brand
        // answers, which would poison aggregation downstream as false-negative
        // recommendation signal.
        const string json = """
            {
              "answer_signal": {
                "brand_mentioned": false,
                "brand_recommended": true,
                "brand_rank": 3,
                "brand_sentiment": "Negative",
                "brand_recommendation_strength": "NotRecommended",
                "top_recommended_entity": "Other Brand",
                "answer_has_ranking": true,
                "answer_has_comparison": false,
                "answer_has_citations": false,
                "confidence_score": 0.7
              },
              "mentions": [],
              "citations": []
            }
            """;
        var (sut, _) = Build(json);

        var result = await sut.ExtractAsync(Answer(), Context(), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Signal.BrandMentioned.Should().BeFalse();
        result.Signal.BrandSentiment.Should().Be(Sentiment.Unknown);
        result.Signal.BrandRecommendationStrength.Should().Be(RecommendationStrength.Unknown);
        result.Signal.BrandRank.Should().BeNull();
        result.Signal.BrandRecommended.Should().BeFalse();
    }

    [Fact]
    public async Task ToleratesMarkdownFencedJson()
    {
        // LLMs sometimes wrap JSON in ```json ... ```. ParseEnvelope must trim to
        // the outer object regardless.
        var fenced = "```json\n" + """
            { "answer_signal": { "brand_mentioned": false, "brand_recommended": false,
              "brand_rank": null, "brand_sentiment": "Unknown",
              "brand_recommendation_strength": "Unknown", "top_recommended_entity": null,
              "answer_has_ranking": false, "answer_has_comparison": false,
              "answer_has_citations": false, "confidence_score": 0.5 },
              "mentions": [], "citations": [] }
            """ + "\n```";
        var (sut, _) = Build(fenced);

        var result = await sut.ExtractAsync(Answer(), Context(), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Signal.BrandMentioned.Should().BeFalse();
    }
}
