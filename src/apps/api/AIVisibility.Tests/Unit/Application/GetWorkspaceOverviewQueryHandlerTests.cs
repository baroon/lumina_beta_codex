using AIVisibility.Application;
using AIVisibility.Application.Interfaces;
using AIVisibility.Application.Queries.Overview;
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;
using AIVisibility.Infrastructure.Data;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// GetWorkspaceOverviewQueryHandler tests (Phase 4 v3 Slice A). Verifies
/// cross-brand / cross-tracker aggregation, hero counts, trend series
/// collapse across trackers, Top Entities ordering, and competitor
/// de-duplication when the same Competitor.Id appears under multiple
/// brands.
/// </summary>
public class GetWorkspaceOverviewQueryHandlerTests
{
    private sealed class StubWorkspaceContext : IWorkspaceContext
    {
        public Guid WorkspaceId { get; init; } = Guid.Empty;
    }

    private static AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options);

    private static GetWorkspaceOverviewQueryHandler NewHandler(AppDbContext ctx) =>
        new(ctx, new StubWorkspaceContext());

    private sealed record Seed(
        Guid AcmeId, Guid AcmeTrackerId,
        Guid BetaId, Guid BetaTrackerId,
        Guid SharedCompetitorId, Guid AcmeOnlyCompetitorId);

    /// <summary>
    /// Fixture: two tracked brands (Acme, Beta) — multi-brand workspace —
    /// each with one tracker. Both trackers track a shared competitor
    /// (Indeed) — Competitor rows are per-brand so we seed two Competitor
    /// rows with the SAME Id to simulate the shared-competitor case.
    /// Acme also tracks an Acme-only competitor (Glassdoor).
    /// Trend points seeded for two scans per tracker.
    /// </summary>
    private static Seed Build(AppDbContext ctx)
    {
        var acme = new Brand { Id = Guid.NewGuid(), Name = "Acme" };
        var beta = new Brand { Id = Guid.NewGuid(), Name = "Beta" };
        var acmeTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = acme.Id, Brand = acme,
            Name = "Acme Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };
        var betaTracker = new TrackerConfiguration
        {
            Id = Guid.NewGuid(), BrandId = beta.Id, Brand = beta,
            Name = "Beta Tracker", Status = TrackerStatus.Active, CreatedAt = DateTime.UtcNow,
        };

        // Shared competitor (Indeed) appears under both brands but with the
        // same Competitor.Id — matches the "same logical competitor across
        // brands" case the handler must de-duplicate.
        var sharedId = Guid.NewGuid();
        var indeedForAcme = new Competitor { Id = sharedId, BrandId = acme.Id, Name = "Indeed", Domain = "indeed.com" };
        // Acme-only competitor.
        var glassdoor = new Competitor { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Glassdoor", Domain = "glassdoor.com" };

        ctx.Brands.Add(acme);
        ctx.Brands.Add(beta);
        ctx.TrackerConfigurations.Add(acmeTracker);
        ctx.TrackerConfigurations.Add(betaTracker);
        ctx.Competitors.Add(indeedForAcme);
        ctx.Competitors.Add(glassdoor);
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { TrackerConfigurationId = acmeTracker.Id, CompetitorId = sharedId });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { TrackerConfigurationId = acmeTracker.Id, CompetitorId = glassdoor.Id });
        ctx.TrackerCompetitors.Add(new TrackerCompetitor { TrackerConfigurationId = betaTracker.Id, CompetitorId = sharedId });

        // 2 scans per tracker: 14d ago and 1d ago. Each gets a prompt-run / answer.
        var now = DateTime.UtcNow;
        var platform = new AIPlatform { Id = Guid.NewGuid(), Code = "openai", Name = "ChatGPT", DisplayOrder = 1 };
        var lens = new Lens { Id = Guid.NewGuid(), Code = "category-discovery", Name = "Category Discovery" };
        ctx.AIPlatforms.Add(platform);
        ctx.Lenses.Add(lens);

        // Per-brand topic rows that dedupe by name at the workspace grain.
        // "Career advice" is shared (both brands have a row); "Industry
        // news" is Acme-only and gets tagged on specific prompts below.
        var acmeCareerTopic = new Topic { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Career advice" };
        var betaCareerTopic = new Topic { Id = Guid.NewGuid(), BrandId = beta.Id, Name = "Career advice" };
        var acmeIndustryTopic = new Topic { Id = Guid.NewGuid(), BrandId = acme.Id, Name = "Industry news" };
        ctx.Topics.Add(acmeCareerTopic);
        ctx.Topics.Add(betaCareerTopic);
        ctx.Topics.Add(acmeIndustryTopic);

        // Helper to seed one scan with one prompt-run + one answer + a brand mention.
        // Records seeded scans by tracker so the caller can later seed
        // competitor trend points without re-querying the in-memory store.
        var scansByTracker = new Dictionary<Guid, List<ScanRun>>
        {
            [acmeTracker.Id] = new(),
            [betaTracker.Id] = new(),
        };
        void SeedScanWithAnswer(
            TrackerConfiguration tracker, DateTime startedAt, Brand brand,
            bool mentionsBrand, string sentimentCategory = "Positive",
            (string Name, AttributePolarity Polarity)[]? brandAttributes = null,
            Guid[]? competitorMentions = null,
            (string FlagType, RiskSeverity Severity)[]? brandRiskFlags = null,
            (string Aspect, bool WinnerIsThisMention)[]? brandComparisons = null,
            Guid[]? topicIds = null,
            (string Subject, string AssertedValue, string ClaimText)[]? brandFactualClaims = null)
        {
            var prompt = new Prompt
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, PromptText = "p",
                LensId = lens.Id, Status = PromptStatus.Active, Source = PromptSource.Generated,
                CreatedAt = now, UpdatedAt = now,
            };
            var scan = new ScanRun
            {
                Id = Guid.NewGuid(), TrackerConfigurationId = tracker.Id, TrackerConfiguration = tracker,
                TriggerType = ScanTriggerType.Manual, Status = ScanRunStatus.Completed,
                StartedAt = startedAt, CompletedAt = startedAt,
            };
            var run = new PromptRun
            {
                Id = Guid.NewGuid(), ScanRunId = scan.Id, PromptId = prompt.Id,
                AIPlatformId = platform.Id, Status = PromptRunStatus.Completed, StartedAt = startedAt,
            };
            var answer = new AIAnswer
            {
                Id = Guid.NewGuid(), PromptRunId = run.Id,
                AnswerText = "a", CreatedAt = startedAt,
            };
            ctx.Prompts.Add(prompt);
            ctx.ScanRuns.Add(scan);
            ctx.PromptRuns.Add(run);
            ctx.AIAnswers.Add(answer);
            scansByTracker[tracker.Id].Add(scan);

            if (topicIds is { Length: > 0 })
            {
                foreach (var topicId in topicIds)
                {
                    ctx.PromptTopics.Add(new PromptTopic
                    {
                        PromptId = prompt.Id,
                        TopicId = topicId,
                    });
                }
            }
            if (mentionsBrand)
            {
                var mention = new Mention
                {
                    Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                    EntityType = MentionEntityType.Brand, EntityId = brand.Id,
                    NormalizedName = brand.Name, EvidenceSnippet = "e",
                    IsRecommended = false, Sentiment = Sentiment.Positive,
                    CreatedAt = startedAt,
                };
                ctx.Mentions.Add(mention);
                if (brandAttributes is { Length: > 0 })
                {
                    foreach (var (name, polarity) in brandAttributes)
                    {
                        ctx.MentionAttributes.Add(new MentionAttribute
                        {
                            Id = Guid.NewGuid(),
                            MentionId = mention.Id,
                            Name = name,
                            Polarity = polarity,
                            EvidenceSnippet = "e",
                            ConfidenceScore = 0.9,
                            CreatedAt = startedAt,
                        });
                    }
                }
                if (brandRiskFlags is { Length: > 0 })
                {
                    foreach (var (flagType, severity) in brandRiskFlags)
                    {
                        ctx.MentionRiskFlags.Add(new MentionRiskFlag
                        {
                            Id = Guid.NewGuid(),
                            MentionId = mention.Id,
                            FlagType = flagType,
                            Severity = severity,
                            EvidenceSnippet = "e",
                            CreatedAt = startedAt,
                        });
                    }
                }
                if (brandComparisons is { Length: > 0 })
                {
                    foreach (var (aspect, winnerIsThisMention) in brandComparisons)
                    {
                        ctx.MentionComparisons.Add(new MentionComparison
                        {
                            Id = Guid.NewGuid(),
                            MentionId = mention.Id,
                            VsEntityName = "Rival",
                            VsEntityNormalized = "rival",
                            OnAspect = aspect,
                            WinnerIsThisMention = winnerIsThisMention,
                            EvidenceSnippet = "e",
                            CreatedAt = startedAt,
                        });
                    }
                }
                if (brandFactualClaims is { Length: > 0 })
                {
                    foreach (var (subject, assertedValue, claimText) in brandFactualClaims)
                    {
                        ctx.FactualClaims.Add(new FactualClaim
                        {
                            Id = Guid.NewGuid(),
                            MentionId = mention.Id,
                            Subject = subject,
                            AssertedValue = assertedValue,
                            ClaimText = claimText,
                            EvidenceSnippet = claimText,
                            Verifiability = ClaimVerifiability.Verifiable,
                            ReviewStatus = ClaimReviewStatus.Pending,
                            ConfidenceScore = 0.9,
                            CreatedAt = startedAt,
                        });
                    }
                }
            }

            if (competitorMentions is { Length: > 0 })
            {
                foreach (var competitorId in competitorMentions)
                {
                    ctx.Mentions.Add(new Mention
                    {
                        Id = Guid.NewGuid(), AIAnswerId = answer.Id,
                        EntityType = MentionEntityType.Competitor, EntityId = competitorId,
                        NormalizedName = "c", EvidenceSnippet = "e",
                        IsRecommended = false, Sentiment = Sentiment.Neutral,
                        CreatedAt = startedAt,
                    });
                }
            }

            // Trend points — one per metric per entity for this scan.
            var brandMentionRate = mentionsBrand ? 1.0 : 0.0;
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, MetricNames.BrandMentionRate, brandMentionRate, startedAt));
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, MetricNames.BrandShareOfVoice, 0.5, startedAt));
            ctx.TrendPoints.Add(NewTrendPoint(tracker.Id, scan.Id, TrendEntityType.Brand, brand.Id, TrendMetrics.OverallSentiment, null, startedAt, sentimentCategory));
        }

        // Acme: sentiment goes Negative -> Positive (Δ = +2).
        // Beta: sentiment goes Neutral -> Positive (Δ = +1).
        // Gives downstream tests something to assert against.
        // Attribute fixture for the workspace top-attributes aggregation:
        //   "trustworthy" — 3 mentions (Positive×2 + Negative×1) → mode Positive
        //   "in-depth"    — 1 mention (Positive)
        //   "slow"        — 1 mention (Negative)
        // Workspace ranking by count desc → trustworthy(3), in-depth(1), slow(1).
        // Co-mention fixture (item #8):
        //   Acme@-14d: Acme brand + Indeed competitor → CO for Indeed (1).
        //   Acme@-1d : Acme brand + Glassdoor competitor → CO for Glassdoor (1).
        //   Beta@-14d: no brand mention but Indeed mentioned → boosts
        //              Indeed's CompetitorMentionCount without adding a CO.
        //   Beta@-1d : Beta brand only, no competitors.
        // Expected workspace rollup (sorted by CO desc, then name asc):
        //   Glassdoor: CO=1, total=1
        //   Indeed   : CO=1, total=2
        // Risk-flag fixture (item #11): two flag types over 3 brand mentions.
        //   "layoffs": Medium (Acme@-14d) + High (Acme@-1d) → mode High,
        //              count 2 (tied severity counts; High wins via enum
        //              ordering in the tie-break).
        //   "outage" : Low (Beta@-1d) → mode Low, count 1.
        // Expected order: layoffs (2), outage (1).
        // Comparison fixture (item #15) — per-aspect wins/losses:
        //   "price"          : 2 wins + 1 loss (across Acme×2 + Beta@-1d)
        //   "support_quality": 1 win               (Acme@-1d)
        // Expected order by total desc: price (3), support_quality (1).
        // Topic fixture (item #18) — tags every prompt with "Career advice"
        // (each brand's own Topic row; the workspace dedupes by name);
        // adds "Industry news" on Acme@-1d and Beta@-14d only.
        // Expected workspace rollup:
        //   "Career advice": 4 prompts, 3 brand-mentioned (Acme×2 + Beta@-1d)
        //   "Industry news": 2 prompts, 1 brand-mentioned (Acme@-1d only)
        SeedScanWithAnswer(acmeTracker, now.AddDays(-14), acme,
            mentionsBrand: true, sentimentCategory: "Negative",
            brandAttributes: new[]
            {
                ("trustworthy", AttributePolarity.Positive),
                ("in-depth", AttributePolarity.Positive),
            },
            competitorMentions: new[] { sharedId },
            brandRiskFlags: new[] { ("layoffs", RiskSeverity.Medium) },
            brandComparisons: new[] { ("price", true) },
            topicIds: new[] { acmeCareerTopic.Id },
            brandFactualClaims: new[] { ("founding_year", "1975", "Acme was founded in 1975.") });
        SeedScanWithAnswer(acmeTracker, now.AddDays(-1), acme,
            mentionsBrand: true, sentimentCategory: "Positive",
            brandAttributes: new[]
            {
                ("trustworthy", AttributePolarity.Positive),
                ("slow", AttributePolarity.Negative),
            },
            competitorMentions: new[] { glassdoor.Id },
            brandRiskFlags: new[] { ("layoffs", RiskSeverity.High) },
            brandComparisons: new[] { ("price", false), ("support_quality", true) },
            topicIds: new[] { acmeCareerTopic.Id, acmeIndustryTopic.Id },
            brandFactualClaims: new[]
            {
                ("headquarters", "San Francisco", "Acme is headquartered in San Francisco."),
            });
        SeedScanWithAnswer(betaTracker, now.AddDays(-14), beta,
            mentionsBrand: false, sentimentCategory: "Neutral",
            competitorMentions: new[] { sharedId },
            topicIds: new[] { betaCareerTopic.Id, acmeIndustryTopic.Id });
        SeedScanWithAnswer(betaTracker, now.AddDays(-1), beta,
            mentionsBrand: true, sentimentCategory: "Positive",
            brandAttributes: new[]
            {
                ("trustworthy", AttributePolarity.Negative),
            },
            brandRiskFlags: new[] { ("outage", RiskSeverity.Low) },
            brandComparisons: new[] { ("price", true) },
            topicIds: new[] { betaCareerTopic.Id });

        // Competitor trend points only on Acme's tracker for the shared competitor.
        var acmeScans = scansByTracker[acmeTracker.Id].OrderBy(s => s.StartedAt).ToList();
        ctx.TrendPoints.Add(NewTrendPoint(acmeTracker.Id, acmeScans[0].Id, TrendEntityType.Competitor, sharedId, TrendMetrics.MentionRate, 0.10, acmeScans[0].StartedAt));
        ctx.TrendPoints.Add(NewTrendPoint(acmeTracker.Id, acmeScans[1].Id, TrendEntityType.Competitor, sharedId, TrendMetrics.MentionRate, 0.20, acmeScans[1].StartedAt));

        ctx.SaveChanges();
        return new Seed(acme.Id, acmeTracker.Id, beta.Id, betaTracker.Id, sharedId, glassdoor.Id);
    }

    private static TrendPoint NewTrendPoint(
        Guid trackerId, Guid scanRunId, TrendEntityType entityType, Guid entityId,
        string metric, double? numeric, DateTime capturedAt, string? categorical = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            TrackerConfigurationId = trackerId,
            ScanRunId = scanRunId,
            EntityType = entityType,
            EntityId = entityId,
            MetricName = metric,
            NumericValue = numeric,
            CategoricalValue = categorical,
            CapturedAt = capturedAt,
            CreatedAt = capturedAt,
        };

    [Fact]
    public async Task ReturnsEmpty_WhenWorkspaceHasNoBrands()
    {
        using var ctx = NewContext();
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        result.Should().NotBeNull();
        result.TrackedBrands.Should().BeEmpty();
        result.Competitors.Should().BeEmpty();
        result.ScanCount.Should().Be(0);
        result.Hero.Queries.Should().Be(0);
        result.Hero.BrandMentionRate.Should().BeNull();
        result.Series.Should().BeEmpty();
        result.TopEntities.Should().BeEmpty();
    }

    [Fact]
    public async Task TrackedBrands_AndCompetitors_AreDeduplicatedAndAlphabetical()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // Two tracked brands.
        result.TrackedBrands.Select(b => b.Name).Should().Equal("Acme", "Beta");

        // Indeed is in both trackers but de-dups by Competitor.Id. Plus Glassdoor.
        result.Competitors.Select(c => c.Name).Should().Equal("Glassdoor", "Indeed");
        result.Competitors.Single(c => c.Name == "Indeed").CompetitorId.Should().Be(seed.SharedCompetitorId);
    }

    [Fact]
    public async Task Hero_AggregatesAcrossTrackers()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // 4 scans total (2 per tracker × 2 trackers) → 4 prompt-runs → 4 answers.
        // Brand mentions on 3 of them (Acme x2 + Beta latest). BrandMentionRate = 3/4.
        // Mention rows = 3 brand + 3 competitor (Acme×2 + Beta@-14d) = 6.
        result.ScanCount.Should().Be(4);
        result.Hero.Queries.Should().Be(4);
        result.Hero.Mentions.Should().Be(6);
        result.Hero.BrandMentionRate.Should().BeApproximately(3.0 / 4.0, 1e-9);
    }

    [Fact]
    public async Task Hero_BrandAbsenceRate_CountsAnswersWithNoBrandMentionOrOwnedCitation()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // 4 answers total. 3 have a tracked-brand mention; the Beta@-14d
        // answer has neither a brand mention nor a citation. Absence = 1/4.
        result.Hero.BrandAbsenceRate.Should().BeApproximately(1.0 / 4.0, 1e-9);
    }

    [Fact]
    public async Task Hero_BrandFirstMentionRate_DenominatorIsAnswersWithMentions()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // 4 answers have ≥1 mention now (Acme×2 with brand + competitor,
        // Beta@-14d with Indeed only, Beta@-1d with brand only). The
        // tracked brand is first-named in 3 of them (Acme×2 + Beta@-1d);
        // Beta@-14d has Indeed as the only mention so it isn't.
        result.Hero.BrandFirstMentionRate.Should().BeApproximately(3.0 / 4.0, 1e-9);
    }

    [Fact]
    public async Task TopBrandAttributes_AreCountedAcrossTrackedBrandsAndOrderedByCount()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Seed: trustworthy×3 (P,P,N → mode P), in-depth×1 (P), slow×1 (N).
        result.TopBrandAttributes.Should().HaveCount(3);

        var first = result.TopBrandAttributes[0];
        first.Rank.Should().Be(1);
        first.Name.Should().Be("trustworthy");
        first.Polarity.Should().Be(nameof(AttributePolarity.Positive));
        first.MentionCount.Should().Be(3);

        // Ties on count (in-depth=1, slow=1) break alphabetically ascending.
        result.TopBrandAttributes[1].Name.Should().Be("in-depth");
        result.TopBrandAttributes[2].Name.Should().Be("slow");
    }

    [Fact]
    public async Task CoMentions_CountDistinctAnswersWithBothBrandAndCompetitor()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Sorted by CoMentionCount desc, then name asc. Both have CO=1.
        result.CoMentions.Should().HaveCount(2);
        result.CoMentions[0].CompetitorName.Should().Be("Glassdoor");
        result.CoMentions[0].CoMentionCount.Should().Be(1);
        result.CoMentions[0].CompetitorMentionCount.Should().Be(1);
        result.CoMentions[1].CompetitorName.Should().Be("Indeed");
        result.CoMentions[1].CoMentionCount.Should().Be(1);
        // Indeed appears in 2 answers (Acme@-14d co-mention + Beta@-14d alone).
        result.CoMentions[1].CompetitorMentionCount.Should().Be(2);
        result.CoMentions[1].CompetitorId.Should().Be(seed.SharedCompetitorId);
    }

    [Fact]
    public async Task CoMentions_AreEmptyWhenScopeHasNoAnswers()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var future = DateTime.UtcNow.AddDays(30);
        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(future, future.AddDays(7), null, null, null, null, null),
            CancellationToken.None);

        result.CoMentions.Should().BeEmpty();
    }

    [Fact]
    public async Task TopBrandRiskFlags_CountsAndOrdersFlagsWithModeSeverity()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Seed: layoffs×2 (Medium, High → mode High via ordinal tie-break),
        //       outage×1 (Low).
        result.TopBrandRiskFlags.Should().HaveCount(2);

        var first = result.TopBrandRiskFlags[0];
        first.Rank.Should().Be(1);
        first.FlagType.Should().Be("layoffs");
        first.Severity.Should().Be(nameof(RiskSeverity.High));
        first.MentionCount.Should().Be(2);

        result.TopBrandRiskFlags[1].FlagType.Should().Be("outage");
        result.TopBrandRiskFlags[1].Severity.Should().Be(nameof(RiskSeverity.Low));
        result.TopBrandRiskFlags[1].MentionCount.Should().Be(1);
    }

    [Fact]
    public async Task TopBrandComparisons_AggregatesWinsAndLossesPerAspect()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Seed: price 3 total (2W,1L), support_quality 1 total (1W,0L).
        result.TopBrandComparisons.Should().HaveCount(2);

        var first = result.TopBrandComparisons[0];
        first.Rank.Should().Be(1);
        first.Aspect.Should().Be("price");
        first.WinCount.Should().Be(2);
        first.LossCount.Should().Be(1);

        var second = result.TopBrandComparisons[1];
        second.Aspect.Should().Be("support_quality");
        second.WinCount.Should().Be(1);
        second.LossCount.Should().Be(0);
    }

    [Fact]
    public async Task RecentFactualClaims_ReturnsBrandClaimsNewestFirst()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Two claims seeded — both on Acme. Newest (headquarters @ -1d)
        // comes first; older (founding_year @ -14d) follows.
        result.RecentFactualClaims.Should().HaveCount(2);

        var first = result.RecentFactualClaims[0];
        first.Subject.Should().Be("headquarters");
        first.AssertedValue.Should().Be("San Francisco");
        first.BrandName.Should().Be("Acme");
        first.ReviewStatus.Should().Be(nameof(ClaimReviewStatus.Pending));

        var second = result.RecentFactualClaims[1];
        second.Subject.Should().Be("founding_year");
        second.AssertedValue.Should().Be("1975");
    }

    [Fact]
    public async Task TopicOwnership_GroupsByNameAcrossBrandsAndCountsBrandMentions()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        // Seed: Career advice 4 prompts (3 brand-mentioned); Industry news 2 prompts (1).
        result.TopicOwnership.Should().HaveCount(2);

        var first = result.TopicOwnership[0];
        first.Rank.Should().Be(1);
        first.TopicName.Should().Be("Career advice");
        first.PromptCount.Should().Be(4);
        first.BrandMentionedPromptCount.Should().Be(3);

        var second = result.TopicOwnership[1];
        second.TopicName.Should().Be("Industry news");
        second.PromptCount.Should().Be(2);
        second.BrandMentionedPromptCount.Should().Be(1);
    }

    [Fact]
    public async Task TopBrandAttributes_IgnoresAttributesOnNonTrackedEntities()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);

        // Attach an attribute to a Competitor mention — should NOT count
        // because BuildTopBrandAttributesAsync filters by EntityType=Brand.
        var competitorMention = new Mention
        {
            Id = Guid.NewGuid(),
            AIAnswerId = ctx.AIAnswers.First().Id,
            EntityType = MentionEntityType.Competitor,
            EntityId = seed.SharedCompetitorId,
            NormalizedName = "Indeed",
            EvidenceSnippet = "e",
            Sentiment = Sentiment.Positive,
            CreatedAt = DateTime.UtcNow,
        };
        ctx.Mentions.Add(competitorMention);
        ctx.MentionAttributes.Add(new MentionAttribute
        {
            Id = Guid.NewGuid(),
            MentionId = competitorMention.Id,
            Name = "fast",
            Polarity = AttributePolarity.Positive,
            EvidenceSnippet = "e",
            ConfidenceScore = 0.9,
            CreatedAt = DateTime.UtcNow,
        });
        ctx.SaveChanges();

        var sut = NewHandler(ctx);
        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null),
            CancellationToken.None);

        result.TopBrandAttributes.Should().NotContain(a => a.Name == "fast");
    }

    [Fact]
    public async Task Hero_AbsenceAndFirstMention_AreNullWhenScopeHasNoAnswers()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        // Future window — no scans/answers fall in it.
        var future = DateTime.UtcNow.AddDays(30);
        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(future, future.AddDays(7), null, null, null, null, null),
            CancellationToken.None);

        result.Hero.BrandAbsenceRate.Should().BeNull();
        result.Hero.BrandFirstMentionRate.Should().BeNull();
    }

    [Fact]
    public async Task Series_IncludesAllEntitiesAcrossTrackers()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // Both tracked brands appear in the trend series (each has a BrandMentionRate series).
        var brandSeries = result.Series.Where(s => s.MetricName == MetricNames.BrandMentionRate).ToList();
        brandSeries.Should().HaveCount(2);
        brandSeries.Should().Contain(s => s.EntityName == "Acme");
        brandSeries.Should().Contain(s => s.EntityName == "Beta");

        // Competitor series for Indeed (only from Acme tracker, 2 points).
        var competitorSeries = result.Series.Single(s => s.EntityName == "Indeed" && s.MetricName == TrendMetrics.MentionRate);
        competitorSeries.Points.Should().HaveCount(2);
        competitorSeries.Points.Last().Value.Should().Be(0.20);
    }

    [Fact]
    public async Task TopEntities_TrackedBrandsFirstAlphabetical_ThenCompetitorsByVisibility()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // Tracked brands first, in alpha order. Then competitor (Indeed).
        result.TopEntities[0].Name.Should().Be("Acme");
        result.TopEntities[0].IsTrackedBrand.Should().BeTrue();
        result.TopEntities[1].Name.Should().Be("Beta");
        result.TopEntities[1].IsTrackedBrand.Should().BeTrue();

        // Acme's visibility = 1.0 (latest BrandMentionRate); delta = 0 (1.0 - 1.0).
        result.TopEntities[0].Visibility.Should().Be(1.0);
        result.TopEntities[0].VisibilityDelta.Should().Be(0.0);

        // Beta's visibility = 1.0 (latest = 1.0, previous = 0.0); delta = +1.0.
        result.TopEntities[1].Visibility.Should().Be(1.0);
        result.TopEntities[1].VisibilityDelta.Should().Be(1.0);

        // Indeed appears as a competitor row.
        var indeed = result.TopEntities.Single(r => r.Name == "Indeed");
        indeed.IsTrackedBrand.Should().BeFalse();
        indeed.Visibility.Should().Be(0.20);
        indeed.VisibilityDelta.Should().BeApproximately(0.10, 1e-9);
    }

    [Fact]
    public async Task TopEntities_SentimentDelta_FromCategoricalScoreEncoding()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null), CancellationToken.None);

        // Acme: Negative (-1) -> Positive (+1) → delta = +2.
        var acme = result.TopEntities.Single(r => r.Name == "Acme");
        acme.Sentiment.Should().Be("Positive");
        acme.SentimentDelta.Should().Be(2.0);

        // Beta: Neutral (0) -> Positive (+1) → delta = +1.
        var beta = result.TopEntities.Single(r => r.Name == "Beta");
        beta.Sentiment.Should().Be("Positive");
        beta.SentimentDelta.Should().Be(1.0);

        // Indeed (competitor) has no sentiment tracked.
        var indeed = result.TopEntities.Single(r => r.Name == "Indeed");
        indeed.Sentiment.Should().BeNull();
        indeed.SentimentDelta.Should().BeNull();
    }

    [Fact]
    public async Task TopEntities_SentimentDelta_IsNull_WhenOnlyOneScanInWindow()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        // Days=5 leaves only the most-recent scan per tracker in window.
        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-5), null, null, null, null, null, null), CancellationToken.None);

        var acme = result.TopEntities.Single(r => r.Name == "Acme");
        acme.Sentiment.Should().Be("Positive");
        acme.SentimentDelta.Should().BeNull();
    }

    [Fact]
    public async Task WindowFilter_ExcludesScansOutsideWindow()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        // Days=5 — only the 1d-ago scans land in window. The 14d-ago ones drop.
        var result = await sut.Handle(new GetWorkspaceOverviewQuery(DateTime.UtcNow.AddDays(-5), null, null, null, null, null, null), CancellationToken.None);

        // 2 scans (1 per tracker, the most recent each).
        result.ScanCount.Should().Be(2);
        // Trend series still exists for the latest scan only.
        var acme = result.Series.FirstOrDefault(s => s.EntityName == "Acme" && s.MetricName == MetricNames.BrandMentionRate);
        acme.Should().NotBeNull();
        acme!.Points.Should().HaveCount(1);
    }

    [Fact]
    public async Task TrackerIdsFilter_ScopesAggregationToSubsetOfTrackers()
    {
        using var ctx = NewContext();
        var seed = Build(ctx);
        var sut = NewHandler(ctx);

        // Filter to ONLY Acme's tracker. The handler must drop Beta's
        // scans + brand series entirely from the aggregation.
        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(
                DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null,
                TrackerIds: new[] { seed.AcmeTrackerId }),
            CancellationToken.None);

        // 2 scans (both Acme's). Beta's 2 scans are out of scope.
        result.ScanCount.Should().Be(2);
        result.Hero.Queries.Should().Be(2);
        // Both Acme scans had brand mentions → rate = 1.0.
        result.Hero.BrandMentionRate.Should().BeApproximately(1.0, 1e-9);

        // Brand mention rate series only contains Acme.
        var brandSeries = result.Series.Where(s => s.MetricName == MetricNames.BrandMentionRate).ToList();
        brandSeries.Should().HaveCount(1);
        brandSeries[0].EntityName.Should().Be("Acme");
    }

    [Fact]
    public async Task TrackerIdsFilter_IgnoresUnknownIdsForSecurity()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        // Caller passes a GUID that doesn't belong to this workspace.
        // Intersection with workspace trackers yields the empty set, so
        // the handler returns the empty DTO — no cross-workspace leak.
        var result = await sut.Handle(
            new GetWorkspaceOverviewQuery(
                DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null,
                TrackerIds: new[] { Guid.NewGuid() }),
            CancellationToken.None);

        result.ScanCount.Should().Be(0);
        result.Series.Should().BeEmpty();
        result.TopEntities.Should().BeEmpty();
    }

    [Fact]
    public async Task TrackerIdsFilter_NullOrEmpty_TreatedAsNoFilter()
    {
        using var ctx = NewContext();
        Build(ctx);
        var sut = NewHandler(ctx);

        var withNull = await sut.Handle(
            new GetWorkspaceOverviewQuery(
                DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null,
                TrackerIds: null),
            CancellationToken.None);
        var withEmpty = await sut.Handle(
            new GetWorkspaceOverviewQuery(
                DateTime.UtcNow.AddDays(-30), null, null, null, null, null, null,
                TrackerIds: Array.Empty<Guid>()),
            CancellationToken.None);

        // Matches the LensCodes / TopicNames convention: null and empty
        // mean "no filter, include everything".
        withNull.ScanCount.Should().Be(4);
        withEmpty.ScanCount.Should().Be(4);
    }
}
